import { NextRequest } from 'next/server';
import prisma from './db';
import { decrypt } from './crypto';
import { serverLogger, logActivity } from './logger';
import { generateAIReply } from './ai';
import { getAppUrl } from './url';
import {
  SocialChannel,
  sendChannelMessage,
  sendChannelImage,
} from './social';
import { checkUserSubscriptionAndAiEligibility, recordAiMessageSent } from './subscription-guard';

// In-memory cache for message deduplication across all social channels
const processedMessageIds = new Set<string>();

export interface IncomingChannelMessagePayload {
  channel: SocialChannel;
  externalChannelId: string;
  senderId: string;
  senderName?: string | null;
  messageId?: string | null;
  messageType?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'ATTACHMENT';
  messageText?: string;
  mediaUrl?: string | null;
  req?: NextRequest;
}

export async function processIncomingChannelMessage(
  payload: IncomingChannelMessagePayload
): Promise<{ success: boolean; reason?: string; replyText?: string }> {
  const {
    channel,
    externalChannelId,
    senderId,
    senderName,
    messageId,
    messageType = 'TEXT',
    messageText = '',
    mediaUrl = null,
    req,
  } = payload;

  try {
    // 1. Idempotency Check
    if (messageId && processedMessageIds.has(messageId)) {
      serverLogger.info(`Duplicate message ${messageId} on ${channel} ignored`);
      return { success: true, reason: 'DUPLICATE_IGNORED' };
    }
    if (messageId) {
      processedMessageIds.add(messageId);
      if (processedMessageIds.size > 5000) {
        const first = processedMessageIds.values().next().value;
        if (first) processedMessageIds.delete(first);
      }
    }

    // 2. Find Page/Channel in DB
    const cleanExtId = externalChannelId ? externalChannelId.replace(/^@/, '') : '';
    let page = await prisma.page.findFirst({
      where: {
        channel,
        OR: [
          { facebookPageId: externalChannelId },
          { channelIdentifier: externalChannelId },
          { pageUsername: externalChannelId },
          { pageName: externalChannelId },
          ...(cleanExtId
            ? [
                { facebookPageId: cleanExtId },
                { channelIdentifier: cleanExtId },
                { pageUsername: cleanExtId },
                { pageName: cleanExtId },
              ]
            : []),
        ],
      },
      include: { user: true },
    });

    // Fallback: If channel matches and only 1 page is connected for this channel, match it
    if (!page) {
      const channelPages = await prisma.page.findMany({
        where: { channel },
        include: { user: true },
      });
      if (channelPages.length === 1) {
        page = channelPages[0];
      }
    }

    if (!page) {
      serverLogger.warn(
        `No connected ${channel} page found for external identifier: ${externalChannelId}`
      );
      return { success: false, reason: 'PAGE_NOT_FOUND' };
    }

    const pageAccessToken = decrypt(page.pageAccessTokenEncrypted);
    let parsedConfig: any = {};
    if (page.extraConfig) {
      try {
        parsedConfig = JSON.parse(page.extraConfig);
      } catch (_) {}
    }

    const displayLastMessage =
      messageText ||
      (messageType === 'AUDIO' ? '🎙️ ভয়েস মেসেজ' : `[${messageType}]`);

    // 3. Find or Create Conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        pageId_senderPsid: {
          pageId: page.id,
          senderPsid: senderId,
        },
      },
    });

    const defaultCustomerName =
      senderName ||
      (channel === 'WHATSAPP'
        ? `WhatsApp User (${senderId.slice(-4)})`
        : channel === 'INSTAGRAM'
        ? `Instagram User (${senderId.slice(-4)})`
        : channel === 'TELEGRAM'
        ? `Telegram User (${senderId.slice(-4)})`
        : channel === 'X'
        ? `@X_User_${senderId.slice(-4)}`
        : `Customer (${senderId.slice(-4)})`);

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: page.userId,
          pageId: page.id,
          channel,
          senderPsid: senderId,
          customerName: defaultCustomerName,
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
          channel,
          lastMessage: displayLastMessage,
          lastMessageAt: new Date(),
          unreadCount: { increment: 1 },
          followUpSentCount: 0, // Reset follow-up cycle when customer responds
          currentFollowUpStep: 0,
          ...(isReplyingToFollowUp ? { followUpStatus: 'CUSTOMER_REPLIED' } : {}),
          ...(senderName && (!conversation.customerName || conversation.customerName.startsWith('Customer ('))
            ? { customerName: senderName }
            : {}),
        },
      });
    }

    // 4. Save incoming message to database
    const savedIncomingMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: page.userId,
        pageId: page.id,
        senderPsid: senderId,
        direction: 'INCOMING',
        messageType,
        messageText,
        mediaUrl,
        aiGenerated: false,
      },
    });

    // 5. Check Subscription / Package Expiry & AI eligibility
    const subCheck = await checkUserSubscriptionAndAiEligibility(page.userId);
    if (!subCheck.eligible) {
      serverLogger.warn(
        `Auto-reply skipped for ${channel} page ${page.id}: Subscription / Package inactive or expired (${subCheck.reason})`
      );
      return { success: true, reason: subCheck.reason || 'SUBSCRIPTION_INELIGIBLE' };
    }

    if (
      !page.autoReplyEnabled ||
      !conversation.aiEnabled ||
      conversation.status === 'HUMAN_MODE'
    ) {
      serverLogger.info(
        `Auto-reply skipped for ${channel} conversation ${conversation.id} (Page auto-reply disabled or human mode)`
      );
      return { success: true, reason: 'AI_DISABLED_OR_HUMAN_MODE' };
    }

    // 6. Fetch recent conversation history
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

    // 6b. Check how many images have already been sent in this conversation
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

    // 7. Generate AI Reply
    const aiResult = await generateAIReply({
      userId: page.userId,
      pageId: page.id,
      senderPsid: senderId,
      incomingText: messageText,
      incomingImageUrl: messageType === 'IMAGE' && mediaUrl ? mediaUrl : undefined,
      incomingAudioUrl: messageType === 'AUDIO' && mediaUrl ? mediaUrl : undefined,
      conversationHistory: formattedHistory,
      canSendProductImage: canSendMoreImages,
      pageAccessToken,
      channel,
    });

    // Save transcription if audio was analyzed
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
      } catch (_) {}
    }

    // 8. Apply human-like AI reply delay if configured
    const delaySec = page.replyDelaySeconds ?? 3;
    if (delaySec > 0) {
      serverLogger.info(`Applying configured reply delay: ${delaySec}s for page ${page.id} (${channel})`);
      await new Promise((resolve) => setTimeout(resolve, Math.min(delaySec, 30) * 1000));
    }

    // 9. Dispatch Reply via Channel Outbound API
    if (pageAccessToken && aiResult.replyText) {
      const sendRes = await sendChannelMessage({
        channel,
        recipientId: senderId,
        text: aiResult.replyText,
        accessToken: pageAccessToken,
        channelIdentifier: page.channelIdentifier || page.facebookPageId,
        extraConfig: parsedConfig,
      });

      if (!sendRes.success) {
        serverLogger.warn(`Failed to dispatch ${channel} outbound text reply:`, sendRes.error);
      }

      // Send matched product image(s) if enabled and within conversation limit
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

        const appUrl = req ? getAppUrl(req) : (process.env.APP_URL || 'http://localhost:3000');

        for (let i = 0; i < imagesToSend.length; i++) {
          const rawImgUrl = imagesToSend[i];
          const fullImgUrl = rawImgUrl.startsWith('data:')
            ? `${appUrl}/api/products/${aiResult.matchedProduct.id}/image?index=${i}`
            : rawImgUrl.startsWith('/')
            ? `${appUrl}${rawImgUrl}`
            : rawImgUrl;

          const imgSendRes = await sendChannelImage({
            channel,
            recipientId: senderId,
            imageUrl: rawImgUrl,
            caption: imagesToSend.length > 1
              ? `${aiResult.matchedProduct.name} (${i + 1}/${imagesToSend.length}) - ৳${aiResult.matchedProduct.price}`
              : `${aiResult.matchedProduct.name} - ৳${aiResult.matchedProduct.price}`,
            accessToken: pageAccessToken,
            channelIdentifier: page.channelIdentifier || page.facebookPageId,
            extraConfig: parsedConfig,
          });

          if (imgSendRes.success) {
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                userId: page.userId,
                pageId: page.id,
                senderPsid: senderId,
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

    // 9. Save outgoing AI message in DB
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: page.userId,
        pageId: page.id,
        senderPsid: senderId,
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

    // 10. Auto-Capture Order if detected
    if (page.orderDetection && aiResult.detectedOrder) {
      const detected = aiResult.detectedOrder;
      const orderSource =
        channel === 'WHATSAPP'
          ? 'WHATSAPP_AI'
          : channel === 'INSTAGRAM'
          ? 'INSTAGRAM_AI'
          : channel === 'X'
          ? 'X_AI'
          : channel === 'TELEGRAM'
          ? 'TELEGRAM_AI'
          : 'MESSENGER_AI';

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
          source: orderSource,
        },
      });

      await logActivity({
        userId: page.userId,
        pageId: page.id,
        action: 'ORDER_CAPTURED_BY_AI',
        description: `AI (${channel}) স্বয়ংক্রিয়ভাবে নতুন অর্ডার ক্যাপচার করেছে: #${newOrder.id.slice(0, 8)} (${detected.customerName} - ${detected.phone})`,
      });
    }

    return { success: true, replyText: aiResult.replyText };
  } catch (err: any) {
    serverLogger.error(`Error in processIncomingChannelMessage for ${channel}:`, err);
    return { success: false, reason: err?.message || 'INTERNAL_ERROR' };
  }
}
