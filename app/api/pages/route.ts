import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { encrypt, decrypt, maskToken } from '@/lib/crypto';
import { logActivity } from '@/lib/logger';
import { getChannelWebhookUrl } from '@/lib/url';
import {
  SocialChannel,
  testFacebookConnection,
  testWhatsAppConnection,
  testInstagramConnection,
  testXConnection,
  testTelegramConnection,
  setupTelegramWebhook,
} from '@/lib/social';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const pages = await prisma.page.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            conversations: true,
            orders: true,
            products: true,
          },
        },
      },
    });

    const safePages = pages.map((page) => {
      const channel = (page.channel || 'FACEBOOK') as SocialChannel;
      const rawVerifyToken = decrypt(page.verifyTokenEncrypted);
      const channelWebhookUrl = getChannelWebhookUrl(channel, req);

      let parsedConfig = {};
      if (page.extraConfig) {
        try {
          parsedConfig = JSON.parse(page.extraConfig);
        } catch (_) {}
      }

      return {
        id: page.id,
        channel,
        channelIdentifier: page.channelIdentifier || page.facebookPageId,
        extraConfig: parsedConfig,
        facebookPageId: page.facebookPageId,
        pageName: page.pageName,
        pageUsername: page.pageUsername,
        pageProfileImage: page.pageProfileImage,
        webhookUrl: channelWebhookUrl,
        verifyToken: rawVerifyToken,
        maskedAccessToken: maskToken(decrypt(page.pageAccessTokenEncrypted)),
        webhookStatus: page.webhookStatus,
        connectionStatus: page.connectionStatus || 'PENDING',
        autoReplyEnabled: page.autoReplyEnabled,
        replyDelaySeconds: page.replyDelaySeconds,
        humanHandoffEnabled: page.humanHandoffEnabled,
        replyLanguage: page.replyLanguage,
        replyStyle: page.replyStyle,
        aiInstructions: page.aiInstructions,
        productImageReply: page.productImageReply,
        maxImagesPerConversation: page.maxImagesPerConversation,
        maxImagesPerReply: page.maxImagesPerReply ?? 1,
        orderDetection: page.orderDetection,
        voiceProcessing: page.voiceProcessing,
        imageUnderstanding: page.imageUnderstanding,
        followUpEnabled: page.followUpEnabled,
        followUpWaitMinutes: page.followUpWaitMinutes,
        followUpMessage: page.followUpMessage,
        followUpOnlySeen: page.followUpOnlySeen,
        followUpMaxCount: page.followUpMaxCount,
        followUpFrequency: page.followUpFrequency,
        followUpIntervalHours: page.followUpIntervalHours,
        createdAt: page.createdAt,
        counts: {
          conversations: page._count.conversations,
          orders: page._count.orders,
          products: page._count.products,
        },
      };
    });

    return NextResponse.json({ success: true, pages: safePages });
  } catch (error: any) {
    console.error('Error fetching channels/pages:', error);
    return NextResponse.json(
      { success: false, error: 'সোশ্যাল মিডিয়া চ্যানেল তালিকা লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const {
      channel = 'FACEBOOK',
      pageName,
      facebookPageId,
      channelIdentifier,
      pageAccessToken,
      extraConfig,
      aiInstructions,
      replyLanguage,
      replyStyle,
      replyDelaySeconds,
      autoReplyEnabled,
      humanHandoffEnabled,
      productImageReply,
      maxImagesPerConversation,
      maxImagesPerReply,
      orderDetection,
      voiceProcessing,
      imageUnderstanding,
      followUpEnabled,
      followUpWaitMinutes,
      followUpMessage,
      followUpOnlySeen,
      followUpMaxCount,
      followUpFrequency,
      followUpIntervalHours,
    } = body;

    const selectedChannel = (channel || 'FACEBOOK').toUpperCase() as SocialChannel;

    // External ID normalization
    let cleanId = (channelIdentifier || facebookPageId || '').trim();
    const cleanToken = (pageAccessToken || '').trim();
    let cleanName = (pageName || '').trim();

    if (!cleanToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'অ্যাক্সেস টোকেন বা API কী প্রদান করা আবশ্যক।',
        },
        { status: 400 }
      );
    }

    if (selectedChannel === 'WHATSAPP' && !cleanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'WhatsApp Phone Number ID প্রদান করা আবশ্যক।',
        },
        { status: 400 }
      );
    }

    // Perform live connection test according to selected channel
    let testResult: { success: boolean; id?: string; name?: string; username?: string; error?: string } = {
      success: false,
    };

    try {
      if (selectedChannel === 'WHATSAPP') {
        testResult = await testWhatsAppConnection(cleanId, cleanToken);
      } else if (selectedChannel === 'INSTAGRAM') {
        testResult = await testInstagramConnection(cleanId, cleanToken);
      } else if (selectedChannel === 'X') {
        testResult = await testXConnection(cleanToken);
      } else if (selectedChannel === 'TELEGRAM') {
        testResult = await testTelegramConnection(cleanToken);
      } else {
        testResult = await testFacebookConnection(cleanId, cleanToken);
      }
    } catch (connErr) {
      console.warn('Channel connection test warning:', connErr);
      testResult = { success: false, error: 'সংযোগ যাচাইকরণের সময় প্রতিক্রিয়া মেলেনি।' };
    }

    // Auto-resolve canonical ID and Name from live verified API
    if (testResult.id) {
      cleanId = testResult.id;
    } else if (!cleanId && testResult.username) {
      cleanId = testResult.username;
    }

    if (!cleanName && testResult.name) {
      cleanName = testResult.name;
    }

    if (!cleanId) {
      if (selectedChannel === 'TELEGRAM') {
        cleanId = `tg_${Date.now()}`;
      } else if (selectedChannel === 'X') {
        cleanId = `x_${Date.now()}`;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'চ্যানেল বা পেজ আইডি প্রদান করুন অথবা সঠিক টোকেন দিন।',
          },
          { status: 400 }
        );
      }
    }

    if (!cleanName) {
      cleanName = `${selectedChannel} Channel`;
    }

    // Check uniqueness
    const existing = await prisma.page.findFirst({
      where: {
        userId: auth.user.id,
        OR: [
          { facebookPageId: cleanId },
          { channelIdentifier: cleanId },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `এই ${selectedChannel} চ্যানেলটি (ID: ${cleanId}) ইতিমধ্যে আপনার অ্যাকাউন্টে সংযুক্ত রয়েছে।`,
        },
        { status: 409 }
      );
    }

    // Webhook token generation
    const rawVerifyToken = `rplx_verify_${crypto.randomBytes(16).toString('hex')}`;
    let webhookUrl = getChannelWebhookUrl(selectedChannel, req);

    if (selectedChannel === 'TELEGRAM') {
      webhookUrl = `${webhookUrl}?bot=${encodeURIComponent(testResult.username || cleanId)}`;
      // If deployed on public HTTPS, automatically register webhook with Telegram
      if (webhookUrl.startsWith('https://')) {
        setupTelegramWebhook(cleanToken, webhookUrl).catch(() => {});
      }
    }

    const newPage = await prisma.page.create({
      data: {
        userId: auth.user.id,
        channel: selectedChannel,
        channelIdentifier: cleanId,
        extraConfig: extraConfig ? (typeof extraConfig === 'object' ? JSON.stringify(extraConfig) : extraConfig) : null,
        facebookPageId: cleanId,
        pageName: cleanName,
        pageUsername: testResult.username || null,
        pageAccessTokenEncrypted: encrypt(cleanToken),
        verifyTokenEncrypted: encrypt(rawVerifyToken),
        webhookUrl,
        webhookStatus: selectedChannel === 'TELEGRAM' ? 'ACTIVE' : 'PENDING',
        connectionStatus: testResult.success ? 'CONNECTED' : 'DISCONNECTED',
        aiInstructions: aiInstructions || null,
        replyLanguage: replyLanguage || 'AUTO',
        replyStyle: replyStyle || 'FRIENDLY',
        replyDelaySeconds: replyDelaySeconds !== undefined ? Number(replyDelaySeconds) : 3,
        autoReplyEnabled: autoReplyEnabled !== undefined ? Boolean(autoReplyEnabled) : true,
        humanHandoffEnabled: humanHandoffEnabled !== undefined ? Boolean(humanHandoffEnabled) : true,
        productImageReply: productImageReply !== undefined ? Boolean(productImageReply) : true,
        maxImagesPerConversation: maxImagesPerConversation !== undefined ? Number(maxImagesPerConversation) : 2,
        maxImagesPerReply: maxImagesPerReply !== undefined ? Number(maxImagesPerReply) : 1,
        orderDetection: orderDetection !== undefined ? Boolean(orderDetection) : true,
        voiceProcessing: voiceProcessing !== undefined ? Boolean(voiceProcessing) : true,
        imageUnderstanding: imageUnderstanding !== undefined ? Boolean(imageUnderstanding) : true,
        followUpEnabled: followUpEnabled !== undefined ? Boolean(followUpEnabled) : false,
        followUpWaitMinutes: followUpWaitMinutes !== undefined ? Number(followUpWaitMinutes) : 30,
        followUpMessage: followUpMessage || null,
        followUpOnlySeen: followUpOnlySeen !== undefined ? Boolean(followUpOnlySeen) : false,
        followUpMaxCount: followUpMaxCount !== undefined ? Number(followUpMaxCount) : 1,
        followUpFrequency: followUpFrequency || 'ONCE',
        followUpIntervalHours: followUpIntervalHours !== undefined ? Number(followUpIntervalHours) : 24,
      },
    });

    await logActivity({
      userId: auth.user.id,
      pageId: newPage.id,
      action: 'CHANNEL_CONNECTED',
      description: `নতুন ${selectedChannel} চ্যানেল সংযুক্ত করা হয়েছে: ${newPage.pageName} (ID: ${cleanId})`,
    });

    return NextResponse.json({
      success: true,
      message: testResult.success
        ? `${selectedChannel} চ্যানেল সফলভাবে যুক্ত ও কানেক্ট হয়েছে!`
        : `${selectedChannel} চ্যানেল যুক্ত হয়েছে, কিন্তু টোকেন যাচাইয়ে সমস্যা হয়েছে (${testResult.error || 'Disconnected'})।`,
      page: {
        id: newPage.id,
        channel: newPage.channel,
        facebookPageId: newPage.facebookPageId,
        pageName: newPage.pageName,
        webhookUrl: newPage.webhookUrl,
        verifyToken: rawVerifyToken,
        connectionStatus: newPage.connectionStatus,
      },
    });
  } catch (error: any) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { success: false, error: 'চ্যানেল সংযুক্ত করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
