import prisma from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { sendChannelMessage, SocialChannel } from '@/lib/social';
import { serverLogger, logActivity } from '@/lib/logger';
import { getAdminAiSettings } from '@/lib/ai';
import { ensureDatabaseReady } from '@/lib/db-init';
import { checkUserSubscriptionAndAiEligibility, recordAiMessageSent } from '@/lib/subscription-guard';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// Global singleton to prevent duplicate workers across Next.js reloads
const globalForFollowUp = globalThis as unknown as {
  followUpWorkerInterval?: NodeJS.Timeout | null;
  isFollowUpWorkerRunning?: boolean;
};

export interface ScheduleStepItem {
  id?: string;
  stepNumber: number;
  dayOffset: number;
  timeOfDay: string; // "10:00", "16:00", "20:00"
  title: string;
  guidelinePrompt?: string | null;
  isEnabled: boolean;
  isGlobalDefault?: boolean;
}

export const DEFAULT_SCHEDULE_STEPS: ScheduleStepItem[] = [
  {
    stepNumber: 1,
    dayOffset: 1,
    timeOfDay: '10:00',
    title: '১ম ফলো-আপ (১ দিন পর - সকাল ১০টা)',
    guidelinePrompt: 'পছন্দের পণ্য নিয়ে কোনো জিজ্ঞাসা আছে কিনা বা অর্ডার কনফার্ম করতে কোনো সহায়তা প্রয়োজন কিনা তা অত্যন্ত আন্তরিক ও বিনম্রভাবে জানতে চান।',
    isEnabled: true,
    isGlobalDefault: true,
  },
  {
    stepNumber: 2,
    dayOffset: 3,
    timeOfDay: '16:00',
    title: '২য় ফলো-আপ (৩ দিন পর - বিকাল ৪টা)',
    guidelinePrompt: 'পণ্যের প্রিমিয়াম কোয়ালিটি ও ক্যাশ অন ডেলিভারি (COD) সুবিধার কথা মনে করিয়ে দিয়ে অর্ডার কনফার্ম করার সহজ প্রক্রিয়া জানান।',
    isEnabled: true,
    isGlobalDefault: true,
  },
  {
    stepNumber: 3,
    dayOffset: 7,
    timeOfDay: '20:00',
    title: '৩য় ফলো-আপ (৭ দিন পর - রাত ৮টা)',
    guidelinePrompt: 'স্টক লিমিটেড হতে পারে বা দ্রুত ডেলিভারি সার্ভিসের বন্ধুত্বপূর্ণ রিমাইন্ডার দিন। আগের মেসেজের কথা সরাসরি পুনরাবৃত্তি করবেন না।',
    isEnabled: true,
    isGlobalDefault: true,
  },
  {
    stepNumber: 4,
    dayOffset: 15,
    timeOfDay: '11:00',
    title: '৪র্থ ফলো-আপ (১৫ দিন পর - সকাল ১১টা)',
    guidelinePrompt: 'কোনো বিশেষ ছাড় বা পছন্দের অন্য কোনো পণ্য দেখতে চান কিনা অথবা কোনো ফিডব্যাক আছে কিনা জানতে চান।',
    isEnabled: true,
    isGlobalDefault: true,
  },
  {
    stepNumber: 5,
    dayOffset: 25,
    timeOfDay: '17:00',
    title: '৫ম ফলো-আপ (২৫ দিন পর - বিকাল ৫টা)',
    guidelinePrompt: 'মাসের সমাপনী আন্তরিক সম্ভাষণ জানান এবং ভবিষ্যতে যেকোনো পণ্য বা সেবার জন্য যোগাযোগ করতে আমন্ত্রণ জানান।',
    isEnabled: true,
    isGlobalDefault: true,
  },
];

/**
 * Fetch active schedule steps for a specific page / user, falling back to global defaults
 */
export async function getActiveScheduleSteps(userId?: string, pageId?: string): Promise<ScheduleStepItem[]> {
  try {
    await ensureDatabaseReady();
    if (pageId) {
      const pageSteps = await prisma.followUpScheduleStep.findMany({
        where: { pageId, isEnabled: true },
        orderBy: { stepNumber: 'asc' },
      });
      if (pageSteps.length > 0) return pageSteps;
    }

    if (userId) {
      const userSteps = await prisma.followUpScheduleStep.findMany({
        where: { userId, pageId: null, isEnabled: true },
        orderBy: { stepNumber: 'asc' },
      });
      if (userSteps.length > 0) return userSteps;
    }

    const globalSteps = await prisma.followUpScheduleStep.findMany({
      where: { isGlobalDefault: true, isEnabled: true },
      orderBy: { stepNumber: 'asc' },
    });
    if (globalSteps.length > 0) return globalSteps;
  } catch (error) {
    serverLogger.error('Error fetching schedule steps:', error);
  }

  return DEFAULT_SCHEDULE_STEPS;
}

/**
 * AI-powered Contextual Follow-up Message Generator with Past Follow-up Memory
 * Guarantees distinct, non-repetitive, high-converting messages.
 */
export async function generateAiFollowUpMessage(params: {
  conversationId: string;
  customerName?: string | null;
  step: ScheduleStepItem;
  conversationHistory: Array<{ direction: string; text: string }>;
  previousFollowUps: string[];
  pageName: string;
  replyLanguage?: string;
  businessInstructions?: string;
}): Promise<{ text: string; model: string }> {
  const {
    customerName = 'গ্রাহক',
    step,
    conversationHistory,
    previousFollowUps,
    pageName,
    replyLanguage = 'বাংলা',
    businessInstructions = '',
  } = params;

  const customerDisplayName = customerName?.split(' ')[0] || 'সম্মানিত গ্রাহক';

  try {
    const adminAi = await getAdminAiSettings();
    const provider = adminAi.provider;
    const modelName = adminAi.model;

    const historyFormatted = conversationHistory
      .slice(-8)
      .map((m) => `${m.direction === 'INCOMING' ? 'Customer' : 'Page/Shop'}: ${m.text}`)
      .join('\n');

    const previousFollowUpsFormatted =
      previousFollowUps.length > 0
        ? previousFollowUps.map((p, idx) => `[Follow-Up #${idx + 1} Sent]: "${p}"`).join('\n')
        : 'None (This is the 1st follow-up)';

    const systemPrompt = `You are a high-conversion, extremely polite, natural sales & customer success assistant for "${pageName}".
Your task is to craft an intelligent, personalized follow-up message to a customer who previously chatted with our page but has not yet placed an order or completed service.

CRITICAL NON-REPETITION & CONTEXT RULES:
1. STRICTLY DO NOT repeat the exact phrases, greetings, or sentences from previous follow-ups listed below.
2. Read the customer's previous conversation history to understand what product or inquiry they were interested in.
3. This is Step #${step.stepNumber} (${step.title}). Step guidance: "${step.guidelinePrompt || 'Polite, helpful follow-up.'}".
4. Tone: Warm, helpful, respectful, non-pushy, and professional (Bengali e-commerce standard).
5. Language: Use natural ${replyLanguage} (e.g. Standard Bengali with emojis like 😊, 🛍️, 📦).
6. Length: Concise (1-3 sentences). Do NOT add quotation marks or metadata tags. Return ONLY the raw message to be sent directly to the customer.

[PREVIOUS FOLLOW-UPS SENT TO THIS CUSTOMER (DO NOT REPEAT THESE)]:
${previousFollowUpsFormatted}

[BUSINESS INSTRUCTIONS / POLICIES]:
${businessInstructions || 'Cash on Delivery (COD) available all over Bangladesh. Fast delivery.'}
`;

    const userPrompt = `[CUSTOMER NAME]: ${customerDisplayName}
[PREVIOUS CHAT HISTORY]:
${historyFormatted || 'Customer previously greeted and asked for product information.'}

Please craft the Step #${step.stepNumber} follow-up message now:`;

    if (provider === 'GEMINI') {
      const activeGeminiKey = adminAi.geminiKey || process.env.GEMINI_API_KEY || '';
      if (activeGeminiKey) {
        const genAI = new GoogleGenerativeAI(activeGeminiKey);
        const geminiModel = genAI.getGenerativeModel({
          model: modelName || 'gemini-1.5-flash',
          systemInstruction: systemPrompt,
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 250,
          },
        });

        const result = await geminiModel.generateContent(userPrompt);
        const generatedText = result.response.text().trim().replace(/^["']|["']$/g, '');
        if (generatedText) {
          return { text: generatedText, model: `GEMINI:${modelName || 'gemini-1.5-flash'}` };
        }
      }
    } else if (provider === 'OPENAI') {
      const activeOpenaiKey = adminAi.openaiKey || process.env.OPENAI_API_KEY || '';
      if (activeOpenaiKey) {
        const openai = new OpenAI({ apiKey: activeOpenaiKey });
        const res = await openai.chat.completions.create({
          model: modelName || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.75,
          max_tokens: 250,
        });
        const generatedText = res.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '');
        if (generatedText) {
          return { text: generatedText, model: `OPENAI:${modelName || 'gpt-4o-mini'}` };
        }
      }
    } else if (provider === 'DEEPSEEK' || provider === 'GOROUTER' || provider === 'OPENROUTER') {
      const apiKey =
        provider === 'DEEPSEEK'
          ? adminAi.deepseekKey || process.env.DEEPSEEK_API_KEY || ''
          : adminAi.gorouterKey || process.env.GOROUTER_API_KEY || '';
      const baseURL = provider === 'DEEPSEEK' ? 'https://api.deepseek.com/v1' : adminAi.gorouterBaseUrl;

      if (apiKey) {
        const client = new OpenAI({ apiKey, baseURL });
        const res = await client.chat.completions.create({
          model: modelName || (provider === 'DEEPSEEK' ? 'deepseek-chat' : 'deepseek/deepseek-chat'),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.75,
          max_tokens: 250,
        });
        const generatedText = res.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '');
        if (generatedText) {
          return { text: generatedText, model: `${provider}:${modelName || 'chat'}` };
        }
      }
    }
  } catch (err) {
    serverLogger.warn('AI follow-up generation failed, falling back to smart dynamic template:', err);
  }

  // Smart Dynamic Fallbacks based on Step Number
  let fallbackText = '';
  switch (step.stepNumber) {
    case 1:
      fallbackText = `আসসালামু আলাইকুম ${customerDisplayName}! আপনার পছন্দের পণ্যটি নিয়ে কোনো প্রশ্ন ছিল কি? কোনো সহায়তা লাগলে জানাবেন, আমরা এখনই অর্ডার কনফার্ম করে দিচ্ছি! 😊🛍️`;
      break;
    case 2:
      fallbackText = `প্রিয় ${customerDisplayName}, আশা করি ভালো আছেন। আমাদের পণ্যটিতে ক্যাশ অন ডেলিভারি (COD) এবং দ্রুত ডেলিভারির সুবিধা রয়েছে। আপনার অর্ডারটি কি কনফার্ম করে দেব? 📦✨`;
      break;
    case 3:
      fallbackText = `হ্যালো ${customerDisplayName}! আপনার পছন্দের প্রোডাক্টটির স্টক কিন্তু সীমিত। আপনি চাইলে আপনার জন্য স্টক হোল্ড করে রাখতে পারি। জানাতে পারেন! 😊`;
      break;
    case 4:
      fallbackText = `আসসালামু আলাইকুম ${customerDisplayName}, কোনো বিশেষ অফার বা অন্য কোনো প্রোডাক্ট দেখতে চাইলে আমাদের জানাতে পারেন। আপনার সেবায় আমরা সর্বদা প্রস্তুত! 🌟`;
      break;
    case 5:
    default:
      fallbackText = `শ্রদ্ধেয় ${customerDisplayName}, আমাদের সাথে যুক্ত থাকার জন্য আন্তরিক ধন্যবাদ। যেকোনো সময় পণ্য বা সেবার জন্য আমাদের মেসেজ দিতে পারেন। শুভকামনা! 💐`;
      break;
  }

  return { text: fallbackText, model: 'TEMPLATE_FALLBACK' };
}

/**
 * Compute the total minutes delay for a schedule step.
 * Supports "MIN:1", "MIN:15", "HR:2", and day offsets.
 */
export function getStepTotalMinutes(step: { dayOffset: number; timeOfDay: string }): number {
  if (step.timeOfDay?.startsWith('MIN:')) {
    const mins = parseInt(step.timeOfDay.replace('MIN:', ''), 10);
    return isNaN(mins) || mins <= 0 ? 1 : mins;
  }
  if (step.timeOfDay?.startsWith('HR:')) {
    const hrs = parseInt(step.timeOfDay.replace('HR:', ''), 10);
    return isNaN(hrs) || hrs <= 0 ? 60 : hrs * 60;
  }
  if (step.dayOffset === 0 && step.timeOfDay?.includes(':')) {
    const [h, m] = step.timeOfDay.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      return Math.max(1, h * 60 + m);
    }
  }
  return Math.max(1, step.dayOffset || 1) * 24 * 60;
}

/**
 * Check active pages with followUpEnabled and dispatch multi-step automated follow-up messages.
 */
export async function runFollowUpAutomation(targetPageId?: string): Promise<{
  scannedPages: number;
  sentCount: number;
  results: Array<{ pageId: string; conversationId: string; customer: string; status: string; channel: string; stepNumber?: number }>;
}> {
  const results: Array<{ pageId: string; conversationId: string; customer: string; status: string; channel: string; stepNumber?: number }> = [];
  let sentCount = 0;

  try {
    await ensureDatabaseReady();
    const pageFilter: any = {
      followUpEnabled: true,
      connectionStatus: { not: 'DISCONNECTED' },
    };

    if (targetPageId) {
      pageFilter.id = targetPageId;
    }

    const activePages = await prisma.page.findMany({
      where: pageFilter,
    });

    for (const page of activePages) {
      const pageAccessToken = decrypt(page.pageAccessTokenEncrypted);
      if (!pageAccessToken) continue;

      let extraConfig = {};
      if (page.extraConfig) {
        try {
          extraConfig = JSON.parse(page.extraConfig);
        } catch (_) {}
      }

      // 0. Check User Subscription / Package Expiry & AI eligibility
      const subCheck = await checkUserSubscriptionAndAiEligibility(page.userId);
      if (!subCheck.eligible) {
        continue;
      }

      // Fetch customized or global schedule steps for this page/user
      const scheduleSteps = await getActiveScheduleSteps(page.userId, page.id);
      if (scheduleSteps.length === 0) continue;

      // Scans conversations within the 35-day window
      const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);

      const candidates = await prisma.conversation.findMany({
        where: {
          pageId: page.id,
          status: 'ACTIVE',
          aiEnabled: true,
          followUpStatus: { notIn: ['COMPLETED', 'PAUSED', 'ORDER_PLACED', 'CUSTOMER_REPLIED'] },
          lastMessageAt: { gte: thirtyFiveDaysAgo },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          orders: {
            where: {
              createdAt: { gte: thirtyFiveDaysAgo },
            },
            take: 1,
          },
          followUpLogs: {
            orderBy: { createdAt: 'asc' },
            take: 10,
          },
        },
        take: 100,
      });

      for (const conv of candidates) {
        const channel = (conv.channel || page.channel || 'FACEBOOK') as SocialChannel;
        const customerName = conv.customerName || conv.senderPsid;

        // 1. Check if customer placed an order -> mark status and stop follow-ups
        if (conv.orders && conv.orders.length > 0) {
          await prisma.conversation.update({
            where: { id: conv.id },
            data: { followUpStatus: 'ORDER_PLACED' },
          });
          continue;
        }

        // 2. Check if customer replied after our last outgoing message or follow-up
        const latestMsg = conv.messages[0];
        if (latestMsg && latestMsg.direction === 'INCOMING') {
          if (conv.currentFollowUpStep > 0 || conv.followUpSentCount > 0) {
            await prisma.conversation.update({
              where: { id: conv.id },
              data: { followUpStatus: 'CUSTOMER_REPLIED' },
            });
            continue;
          }
          // If customer just messaged and no reply has been sent yet, wait for normal bot reply first
          continue;
        }

        // 3. Check Max Follow-up Count constraint
        const pageMaxCount = page.followUpMaxCount ?? 5;
        if (pageMaxCount < 999 && conv.followUpSentCount >= pageMaxCount) {
          await prisma.conversation.update({
            where: { id: conv.id },
            data: { followUpStatus: 'COMPLETED' },
          });
          continue;
        }

        // If frequency is 'ONCE' and already sent 1 follow-up
        if (page.followUpFrequency === 'ONCE' && conv.followUpSentCount >= 1) {
          await prisma.conversation.update({
            where: { id: conv.id },
            data: { followUpStatus: 'COMPLETED' },
          });
          continue;
        }

        // 4. Determine next target step
        const currentStepIndex = conv.currentFollowUpStep || 0;
        if (currentStepIndex >= scheduleSteps.length) {
          await prisma.conversation.update({
            where: { id: conv.id },
            data: { followUpStatus: 'COMPLETED' },
          });
          continue;
        }

        const targetStep = scheduleSteps[currentStepIndex];

        // 5. Target Audience Filter: Seen vs Unseen
        // For Step 1: If followUpOnlySeen is true, customer must have seen the conversation
        // For Step 2+: The lead was already confirmed seen in Step 1, so subsequent scheduled reminders proceed
        if (page.followUpOnlySeen) {
          if (!conv.lastSeenAt) {
            // Customer hasn't seen the initial conversation yet, skip until seen
            continue;
          }
          if (currentStepIndex === 0) {
            // Ensure lastSeenAt was after or close to the first shop reply
            const firstOutgoing = [...conv.messages].reverse().find((m) => m.direction === 'OUTGOING');
            if (firstOutgoing && new Date(conv.lastSeenAt).getTime() < new Date(firstOutgoing.createdAt).getTime() - 60000) {
              continue;
            }
          }
        }

        // 6. Flexible Custom Time Calculation
        const nowMs = Date.now();
        let isDue = false;

        if (currentStepIndex === 0) {
          // STEP 1: Calculate wait time from lastSeenAt (if seen-only) or last outgoing message / conversation base
          const referenceTime = (page.followUpOnlySeen && conv.lastSeenAt)
            ? new Date(conv.lastSeenAt).getTime()
            : (conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : new Date(conv.createdAt).getTime());

          let stepDelayMinutes = getStepTotalMinutes(targetStep);

          // If step is generic default 1-day step, fallback to page.followUpWaitMinutes if smaller
          if (targetStep.dayOffset === 1 && !targetStep.timeOfDay?.startsWith('MIN:') && !targetStep.timeOfDay?.startsWith('HR:') && (page.followUpWaitMinutes ?? 30) < 1440) {
            stepDelayMinutes = page.followUpWaitMinutes ?? 30;
          }

          const requiredDelayMs = Math.max(1, stepDelayMinutes) * 60 * 1000;
          if (nowMs - referenceTime >= requiredDelayMs) {
            isDue = true;
          }
        } else {
          // STEP 2+: Calculate wait time from last follow-up sent time
          if (!conv.lastFollowUpSentAt) {
            isDue = true;
          } else {
            const lastSentTime = new Date(conv.lastFollowUpSentAt).getTime();
            const prevStep = scheduleSteps[currentStepIndex - 1];
            const currMins = getStepTotalMinutes(targetStep);
            const prevMins = prevStep ? getStepTotalMinutes(prevStep) : 0;

            let intervalMinutes = currMins > prevMins ? (currMins - prevMins) : currMins;

            if (page.followUpFrequency === 'DAILY' && !targetStep.timeOfDay?.startsWith('MIN:')) {
              intervalMinutes = Math.max(intervalMinutes, 24 * 60);
            } else if (page.followUpFrequency === 'CUSTOM_INTERVAL' && !targetStep.timeOfDay?.startsWith('MIN:')) {
              if (page.followUpIntervalHours && targetStep.dayOffset > 0) {
                intervalMinutes = Math.max(intervalMinutes, page.followUpIntervalHours * 60);
              }
            }

            const requiredIntervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
            if (nowMs - lastSentTime >= requiredIntervalMs) {
              isDue = true;
            }
          }
        }

        if (!isDue) {
          continue;
        }

        // 7. Generate Message Text (Custom Template or AI Generated)
        let followUpText = '';
        let aiModelUsed = 'CUSTOM_TEMPLATE';

        if (page.followUpMessage && page.followUpMessage.trim().length > 0) {
          // Use user-defined template with placeholder replacement
          const customerFirstName = conv.customerName?.split(' ')[0] || 'গ্রাহক';
          followUpText = page.followUpMessage
            .replace(/{name}/gi, customerFirstName)
            .replace(/{customer_name}/gi, customerFirstName)
            .replace(/{page_name}/gi, page.pageName);
        } else {
          // Generate AI follow-up message with non-repetition memory
          const previousFollowUpTexts = (conv.followUpLogs || [])
            .map((l) => l.messageText)
            .filter((t) => typeof t === 'string' && t.trim().length > 0);

          const historyForAI = [...conv.messages].reverse().map((m) => ({
            direction: m.direction,
            text: m.messageText || '',
          }));

          const aiResult = await generateAiFollowUpMessage({
            conversationId: conv.id,
            customerName: conv.customerName,
            step: targetStep,
            conversationHistory: historyForAI,
            previousFollowUps: previousFollowUpTexts,
            pageName: page.pageName,
            replyLanguage: page.replyLanguage || 'বাংলা',
            businessInstructions: page.aiInstructions || '',
          });

          followUpText = aiResult.text;
          aiModelUsed = aiResult.model;
        }

        if (!followUpText || followUpText.trim().length === 0) {
          continue;
        }

        // 8. Send message via Social Channel
        const sendRes = await sendChannelMessage({
          channel,
          recipientId: conv.senderPsid,
          text: followUpText,
          accessToken: pageAccessToken,
          channelIdentifier: page.channelIdentifier || page.facebookPageId,
          extraConfig,
        });

        if (sendRes.success) {
          sentCount++;

          const isLastStep = currentStepIndex + 1 >= scheduleSteps.length || (page.followUpFrequency === 'ONCE');
          const nextStatus = isLastStep ? 'COMPLETED' : 'IN_PROGRESS';
          const nextStepNumber = currentStepIndex + 1;

          // Next due date calculation
          let nextDueAt: Date | null = null;
          if (!isLastStep) {
            const nextIntervalHours = page.followUpFrequency === 'CUSTOM_INTERVAL'
              ? (page.followUpIntervalHours || 24)
              : 24;
            nextDueAt = new Date(Date.now() + nextIntervalHours * 60 * 60 * 1000);
          }

          // Record in FollowUpLog
          await prisma.followUpLog.create({
            data: {
              userId: page.userId,
              pageId: page.id,
              conversationId: conv.id,
              stepNumber: targetStep.stepNumber,
              dayOffset: targetStep.dayOffset,
              scheduledTime: targetStep.timeOfDay,
              messageText: followUpText,
              channel,
              customerName: conv.customerName,
              senderPsid: conv.senderPsid,
              status: 'SENT',
              aiModel: aiModelUsed,
            },
          });

          // Record in Message table
          await prisma.message.create({
            data: {
              conversationId: conv.id,
              userId: page.userId,
              pageId: page.id,
              senderPsid: conv.senderPsid,
              direction: 'OUTGOING',
              messageType: 'TEXT',
              messageText: followUpText,
              aiGenerated: true,
              aiModel: aiModelUsed,
            },
          });

          // Update Conversation
          await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              currentFollowUpStep: nextStepNumber,
              followUpStatus: nextStatus,
              lastFollowUpSentAt: new Date(),
              lastMessage: followUpText,
              lastMessageAt: new Date(),
              followUpSentCount: { increment: 1 },
              nextFollowUpDueAt: nextDueAt,
            },
          });

          // Record AI message usage and auto-cutoff if quota reached
          await recordAiMessageSent(page.userId);

          await logActivity({
            userId: page.userId,
            pageId: page.id,
            action: 'FOLLOW_UP_SENT',
            description: `স্বয়ংক্রিয় ধাপ #${targetStep.stepNumber} ফলো-আপ পাঠানো হয়েছে (${customerName}, ${channel})`,
          });

          results.push({
            pageId: page.id,
            conversationId: conv.id,
            customer: customerName,
            status: 'SENT',
            channel,
            stepNumber: targetStep.stepNumber,
          });

          serverLogger.info(`[Follow-Up] Step #${targetStep.stepNumber} sent to ${customerName} (${channel})`);
        } else {
          // Log failed attempt
          await prisma.followUpLog.create({
            data: {
              userId: page.userId,
              pageId: page.id,
              conversationId: conv.id,
              stepNumber: targetStep.stepNumber,
              dayOffset: targetStep.dayOffset,
              scheduledTime: targetStep.timeOfDay,
              messageText: followUpText,
              channel,
              customerName: conv.customerName,
              senderPsid: conv.senderPsid,
              status: `FAILED: ${(sendRes as any).error || 'API Error'}`,
              aiModel: aiModelUsed,
            },
          });

          results.push({
            pageId: page.id,
            conversationId: conv.id,
            customer: customerName,
            status: `FAILED: ${(sendRes as any).error || 'API Error'}`,
            channel,
            stepNumber: targetStep.stepNumber,
          });
        }
      }
    }

    return {
      scannedPages: activePages.length,
      sentCount,
      results,
    };
  } catch (error: any) {
    serverLogger.error('Error running follow-up automation:', error);
    return {
      scannedPages: 0,
      sentCount: 0,
      results,
    };
  }
}

/**
 * Start background timer daemon for continuous follow-up checks (runs every 60s)
 */
export function startFollowUpWorker(intervalMs = 60000) {
  if (globalForFollowUp.followUpWorkerInterval) {
    return; // Already initialized
  }

  serverLogger.info(`[Follow-Up Worker] Background automation engine active (interval: ${intervalMs / 1000}s)`);

  globalForFollowUp.followUpWorkerInterval = setInterval(async () => {
    if (globalForFollowUp.isFollowUpWorkerRunning) return;
    globalForFollowUp.isFollowUpWorkerRunning = true;
    try {
      const summary = await runFollowUpAutomation();
      if (summary.sentCount > 0) {
        serverLogger.info(`[Follow-Up Worker] Dispatched ${summary.sentCount} follow-up message(s)`);
      }
    } catch (err) {
      serverLogger.error('[Follow-Up Worker] Scheduled run error:', err);
    } finally {
      globalForFollowUp.isFollowUpWorkerRunning = false;
    }
  }, intervalMs);

  if (globalForFollowUp.followUpWorkerInterval && typeof globalForFollowUp.followUpWorkerInterval.unref === 'function') {
    globalForFollowUp.followUpWorkerInterval.unref();
  }
}

