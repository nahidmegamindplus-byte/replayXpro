import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import {
  verifyFacebookSignature,
  sendMessengerAction,
  sendMessengerText,
  sendMessengerImage,
  getFacebookUserProfile,
} from '@/lib/facebook';
import { generateAIReply } from '@/lib/ai';
import { serverLogger, logActivity } from '@/lib/logger';
import { getAppUrl } from '@/lib/url';
import { checkUserSubscriptionAndAiEligibility, recordAiMessageSent } from '@/lib/subscription-guard';

// In-memory cache for webhook message deduplication / idempotency (stores message IDs for 10 mins)
const processedMessageIds = new Set<string>();

/**
 * Facebook Webhook Verification Endpoint (GET)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    serverLogger.info('Facebook Webhook verification request received', { mode, token });

    if (mode === 'subscribe' && token && challenge) {
      // Find page with matching verify token
      const pages = await prisma.page.findMany({
        select: { id: true, pageName: true, verifyTokenEncrypted: true },
      });

      const globalVerifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
      const isGlobalMatch = Boolean(globalVerifyToken && globalVerifyToken.trim() === token.trim());
      const matchedPage = pages.find((p) => decrypt(p.verifyTokenEncrypted) === token) || (isGlobalMatch && pages.length > 0 ? pages[0] : null);

      if (matchedPage || isGlobalMatch) {
        // Update page webhook status to ACTIVE if a specific page was matched
        if (matchedPage) {
          await prisma.page.update({
            where: { id: matchedPage.id },
            data: { webhookStatus: 'ACTIVE' },
          });
          serverLogger.info(`Webhook verified successfully for page: ${matchedPage.pageName}`);
        } else {
          serverLogger.info(`Webhook verified successfully via global FACEBOOK_WEBHOOK_VERIFY_TOKEN`);
        }

        return new NextResponse(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      } else {
        serverLogger.warn('Webhook verification token did not match any connected page or global token', { token });
        return new NextResponse('Verification token mismatch', { status: 403 });
      }
    }

    return new NextResponse('Invalid verification request parameters', { status: 400 });
  } catch (error: any) {
    serverLogger.error('Error during webhook GET verification', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Facebook Webhook Event Processing Endpoint (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    // 1. Validate signature if Facebook App Secret is configured
    if (appSecret && !verifyFacebookSignature(rawBody, signature, appSecret)) {
      serverLogger.warn('Webhook request rejected due to invalid Facebook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (payload.object !== 'page') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // 2. Process all entries and messaging events asynchronously
    const entries = payload.entry || [];
    for (const entry of entries) {
      const fbPageId = entry.id;
      const messagingEvents = entry.messaging || [];

      for (const event of messagingEvents) {
        const senderPsid = event.sender?.id;
        const recipientPageId = event.recipient?.id || fbPageId;

        // Handle Read / Seen receipts from customer
        if (event.read && senderPsid) {
          try {
            const readPage = await prisma.page.findFirst({
              where: { facebookPageId: recipientPageId },
              select: { id: true },
            });
            if (readPage) {
              await prisma.conversation.updateMany({
                where: { pageId: readPage.id, senderPsid },
                data: { lastSeenAt: new Date() },
              });
              serverLogger.info(`Updated lastSeenAt watermark for customer ${senderPsid}`);
            }
          } catch (readErr) {
            serverLogger.warn('Error recording read receipt:', readErr);
          }
          continue;
        }

        const message = event.message;

        // Skip events with no message or echo messages sent by page itself
        if (!message || message.is_echo || !senderPsid) {
          continue;
        }

        const messageId = message.mid;

        // 3. Idempotency / Deduplication check
        if (messageId && processedMessageIds.has(messageId)) {
          serverLogger.info(`Duplicate message ${messageId} ignored`);
          continue;
        }
        if (messageId) {
          processedMessageIds.add(messageId);
          // Limit cache size
          if (processedMessageIds.size > 5000) {
            const firstKey = processedMessageIds.values().next().value;
            if (firstKey) processedMessageIds.delete(firstKey);
          }
        }

        // 4. Find Page in DB
        let page = await prisma.page.findFirst({
          where: {
            OR: [
              { facebookPageId: recipientPageId },
              { channelIdentifier: recipientPageId },
              { pageUsername: recipientPageId },
            ],
          },
          include: {
            user: true,
          },
        });

        if (!page) {
          const fbPages = await prisma.page.findMany({
            where: { channel: 'FACEBOOK' },
            include: { user: true },
          });
          if (fbPages.length === 1) {
            page = fbPages[0];
          }
        }

        if (!page) {
          serverLogger.warn(`Page with Facebook ID ${recipientPageId} not found in database`);
          continue;
        }

        const pageAccessToken = decrypt(page.pageAccessTokenEncrypted);

        // 5. Extract message type and media content
        let messageType = 'TEXT';
        let messageText = message.text || '';
        let mediaUrl: string | null = null;

        if (message.attachments && message.attachments.length > 0) {
          for (const attachment of message.attachments) {
            const attachUrl = attachment.payload?.url || null;
            const attachType = attachment.type || '';
            const lowerUrl = (attachUrl || '').toLowerCase();

            if (
              attachType === 'audio' ||
              lowerUrl.includes('.mp4') ||
              lowerUrl.includes('audio_mp4') ||
              lowerUrl.includes('.aac') ||
              lowerUrl.includes('.mp3') ||
              lowerUrl.includes('.m4a') ||
              lowerUrl.includes('.ogg') ||
              lowerUrl.includes('.wav') ||
              lowerUrl.includes('audioclip')
            ) {
              messageType = 'AUDIO';
              mediaUrl = attachUrl;
              break;
            } else if (attachType === 'image') {
              messageType = 'IMAGE';
              mediaUrl = attachUrl;
            } else if (attachType === 'video') {
              messageType = 'VIDEO';
              mediaUrl = attachUrl;
            } else if (!mediaUrl && attachUrl) {
              mediaUrl = attachUrl;
              messageType = 'ATTACHMENT';
            }
          }
        }

        const displayLastMessage =
          messageText || (messageType === 'AUDIO' ? '🎙️ ভয়েস মেসেজ' : `[${messageType}]`);

        // 6. Find or create Conversation with real customer name
        let conversation = await prisma.conversation.findUnique({
          where: {
            pageId_senderPsid: {
              pageId: page.id,
              senderPsid,
            },
          },
        });

        // If conversation doesn't exist or customerName is still a generic placeholder, fetch real name
        let realCustomerName = conversation?.customerName;
        if (!realCustomerName || realCustomerName.startsWith('Customer (')) {
          if (pageAccessToken) {
            const profile = await getFacebookUserProfile(senderPsid, pageAccessToken);
            if (profile?.name) {
              realCustomerName = profile.name;
            }
          }
          if (!realCustomerName) {
            realCustomerName = `Customer (${senderPsid.slice(-4)})`;
          }
        }

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              userId: page.userId,
              pageId: page.id,
              senderPsid,
              customerName: realCustomerName,
              lastMessage: displayLastMessage,
              lastMessageAt: new Date(),
              status: 'ACTIVE',
              aiEnabled: true,
              unreadCount: 1,
            },
          });
        } else {
          const isReplyingToFollowUp = (conversation.currentFollowUpStep > 0 || conversation.followUpSentCount > 0);
          conversation = await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              customerName: realCustomerName,
              lastMessage: displayLastMessage,
              lastMessageAt: new Date(),
              unreadCount: { increment: 1 },
              followUpSentCount: 0, // Reset follow-up cycle since customer replied
              currentFollowUpStep: 0,
              ...(isReplyingToFollowUp ? { followUpStatus: 'CUSTOMER_REPLIED' } : {}),
            },
          });
        }

        // 7. Save incoming message to database
        const savedIncomingMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            userId: page.userId,
            pageId: page.id,
            senderPsid,
            direction: 'INCOMING',
            messageType,
            messageText,
            mediaUrl,
            aiGenerated: false,
          },
        });

        // 8. Check Subscription / Package Expiry & AI eligibility
        const subCheck = await checkUserSubscriptionAndAiEligibility(page.userId);
        if (!subCheck.eligible) {
          serverLogger.warn(`Auto-reply skipped for page ${page.id}: Subscription / Package inactive or expired (${subCheck.reason})`);
          continue;
        }

        if (!page.autoReplyEnabled || !conversation.aiEnabled || conversation.status === 'HUMAN_MODE') {
          serverLogger.info(`Auto-reply skipped for conversation ${conversation.id} (Human mode or disabled)`);
          continue;
        }

        // Send typing indicator
        if (pageAccessToken) {
          sendMessengerAction(senderPsid, 'typing_on', pageAccessToken).catch(() => {});
        }

        // Fetch recent conversation history
        const recentMessages = await prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { direction: true, messageText: true },
        });

        const formattedHistory = recentMessages.reverse().map((m) => ({
          direction: m.direction,
          text: m.messageText || '',
        }));

        // 8b. Check how many images have already been sent in this conversation
        const imagesAlreadySent = await prisma.message.count({
          where: {
            conversationId: conversation.id,
            direction: 'OUTGOING',
            messageType: 'IMAGE',
          },
        });
        const maxImages = (page as any).maxImagesPerConversation !== undefined ? (page as any).maxImagesPerConversation : 2;
        const canSendMoreImages = Boolean(
          page.productImageReply && (maxImages === 0 || imagesAlreadySent < maxImages)
        );

        // 9. Generate AI reply (handles Text, Image understanding, and Voice Audio natively)
        try {
          const aiResult = await generateAIReply({
            userId: page.userId,
            pageId: page.id,
            senderPsid,
            incomingText: messageText,
            incomingImageUrl: messageType === 'IMAGE' && mediaUrl ? mediaUrl : undefined,
            incomingAudioUrl: messageType === 'AUDIO' && mediaUrl ? mediaUrl : undefined,
            conversationHistory: formattedHistory,
            canSendProductImage: canSendMoreImages,
            pageAccessToken,
            channel: 'FACEBOOK',
          });

          // If audio was transcribed, save transcription to database for Dashboard display
          if (aiResult.transcription && savedIncomingMessage?.id) {
            try {
              await prisma.message.update({
                where: { id: savedIncomingMessage.id },
                data: { transcription: aiResult.transcription },
              });
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                  lastMessage: `🎙️ "${aiResult.transcription.length > 35 ? aiResult.transcription.slice(0, 35) + '...' : aiResult.transcription}"`,
                },
              });
            } catch (trErr) {}
          }

          // 10. Send reply via Facebook Messenger Send API with configured AI human-like delay
          if (pageAccessToken && aiResult.replyText) {
            const delaySec = page.replyDelaySeconds ?? 3;
            if (delaySec > 0) {
              sendMessengerAction(senderPsid, 'typing_on', pageAccessToken).catch(() => {});
              await new Promise((resolve) => setTimeout(resolve, Math.min(delaySec, 30) * 1000));
            }

            await sendMessengerText(senderPsid, aiResult.replyText, pageAccessToken);

            // Send product image(s) from inventory if available and within conversation limit
            if (canSendMoreImages && (aiResult.matchedProduct?.images?.length || aiResult.matchedProduct?.imageUrl)) {
              const allImages: string[] = (
                aiResult.matchedProduct.images && aiResult.matchedProduct.images.length > 0
                  ? aiResult.matchedProduct.images
                  : aiResult.matchedProduct.imageUrl
                  ? [aiResult.matchedProduct.imageUrl]
                  : []
              ).filter(Boolean);

              const perReplyLimit = (page as any).maxImagesPerReply === 0 ? allImages.length : Math.max(1, (page as any).maxImagesPerReply ?? 1);
              const remainingQuota = maxImages === 0 ? allImages.length : Math.max(0, maxImages - imagesAlreadySent);
              const countToSend = Math.min(perReplyLimit, remainingQuota, allImages.length);
              const imagesToSend = allImages.slice(0, countToSend);

              const appUrl = getAppUrl(req);

              for (let i = 0; i < imagesToSend.length; i++) {
                const rawImgUrl = imagesToSend[i];
                const fullImgUrl = rawImgUrl.startsWith('data:')
                  ? `${appUrl}/api/products/${aiResult.matchedProduct.id}/image?index=${i}`
                  : rawImgUrl.startsWith('/')
                  ? `${appUrl}${rawImgUrl}`
                  : rawImgUrl;

                const imageSendResult = await sendMessengerImage(
                  senderPsid,
                  rawImgUrl,
                  pageAccessToken
                );

                // Save outgoing image record in DB
                if (imageSendResult.success) {
                  await prisma.message.create({
                    data: {
                      conversationId: conversation.id,
                      userId: page.userId,
                      pageId: page.id,
                      senderPsid,
                      direction: 'OUTGOING',
                      messageType: 'IMAGE',
                      mediaUrl: fullImgUrl,
                      messageText: imagesToSend.length > 1
                        ? `[পণ্য ছবি (${i + 1}/${imagesToSend.length}): ${aiResult.matchedProduct.name} - ৳${aiResult.matchedProduct.price}]`
                        : `[পণ্য ছবি: ${aiResult.matchedProduct.name} - ৳${aiResult.matchedProduct.price}]`,
                      aiGenerated: true,
                      aiModel: aiResult.aiModel,
                    },
                  });

                  try {
                    await prisma.conversation.update({
                      where: { id: conversation.id },
                      data: { imagesSentCount: { increment: 1 } },
                    });
                  } catch (_) {}
                }
              }
            }
          }

          // 11. Save outgoing AI text message in DB
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              userId: page.userId,
              pageId: page.id,
              senderPsid,
              direction: 'OUTGOING',
              messageType: 'TEXT',
              messageText: aiResult.replyText,
              aiGenerated: true,
              aiModel: aiResult.aiModel,
            },
          });

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessage: aiResult.replyText,
              lastMessageAt: new Date(),
            },
          });

          // Record AI message usage and auto-cutoff if quota reached
          await recordAiMessageSent(page.userId);

          // 12. Auto-capture Order if detected by AI
          if (page.orderDetection && aiResult.detectedOrder) {
            const detected = aiResult.detectedOrder;
            const newOrder = await prisma.order.create({
              data: {
                userId: page.userId,
                pageId: page.id,
                conversationId: conversation.id,
                customerName: detected.customerName,
                phone: detected.phone,
                address: detected.address,
                product: detected.product,
                productId: detected.productId || null,
                quantity: detected.quantity || 1,
                price: detected.price || 0,
                totalPrice: detected.totalPrice || 0,
                status: 'PENDING',
                source: 'MESSENGER_AI',
              },
            });

            await logActivity({
              userId: page.userId,
              pageId: page.id,
              action: 'ORDER_CAPTURED_BY_AI',
              description: `AI স্বয়ংক্রিয়ভাবে নতুন অর্ডার ক্যাপচার করেছে: #${newOrder.id.slice(0, 8)} (${detected.customerName} - ${detected.phone})`,
            });
          }
        } catch (aiErr: any) {
          serverLogger.error('AI reply generation failed during webhook handling', aiErr);
        }
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error: any) {
    serverLogger.error('Critical error in Facebook Webhook POST handler', error);
    return NextResponse.json({ error: 'Internal Webhook Error' }, { status: 500 });
  }
}
