import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { encrypt, decrypt, maskToken } from '@/lib/crypto';
import {
  testFacebookConnection,
  testWhatsAppConnection,
  testInstagramConnection,
  testXConnection,
  testTelegramConnection,
  SocialChannel,
} from '@/lib/social';
import { logActivity } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const page = await prisma.page.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
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

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'পেজটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    const rawVerifyToken = decrypt(page.verifyTokenEncrypted);
    const rawAccessToken = decrypt(page.pageAccessTokenEncrypted);

    return NextResponse.json({
      success: true,
      page: {
        ...page,
        connectionStatus: page.connectionStatus || 'PENDING',
        verifyToken: rawVerifyToken,
        maskedAccessToken: maskToken(rawAccessToken),
        pageAccessTokenEncrypted: undefined,
        verifyTokenEncrypted: undefined,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'পেজ বিস্তারিত লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const page = await prisma.page.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
    });

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'পেজটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.pageName !== undefined) updateData.pageName = body.pageName.trim();
    if (body.facebookPageId !== undefined && body.facebookPageId.trim().length > 0) updateData.facebookPageId = body.facebookPageId.trim();
    if (body.channel !== undefined) updateData.channel = body.channel;
    if (body.channelIdentifier !== undefined) updateData.channelIdentifier = body.channelIdentifier ? body.channelIdentifier.trim() : null;
    if (body.pageUsername !== undefined) updateData.pageUsername = body.pageUsername ? body.pageUsername.trim() : null;
    if (body.pageProfileImage !== undefined) updateData.pageProfileImage = body.pageProfileImage ? body.pageProfileImage.trim() : null;
    if (body.extraConfig !== undefined) {
      updateData.extraConfig = typeof body.extraConfig === 'object' ? JSON.stringify(body.extraConfig) : body.extraConfig;
    }
    if (body.replyDelaySeconds !== undefined) {
      const delay = parseInt(body.replyDelaySeconds, 10);
      updateData.replyDelaySeconds = isNaN(delay) ? 3 : Math.max(0, Math.min(60, delay));
    }
    if (body.connectionStatus !== undefined) updateData.connectionStatus = body.connectionStatus;
    if (body.autoReplyEnabled !== undefined) updateData.autoReplyEnabled = Boolean(body.autoReplyEnabled);
    if (body.humanHandoffEnabled !== undefined) updateData.humanHandoffEnabled = Boolean(body.humanHandoffEnabled);
    if (body.replyLanguage !== undefined) updateData.replyLanguage = body.replyLanguage;
    if (body.replyStyle !== undefined) updateData.replyStyle = body.replyStyle;
    if (body.aiInstructions !== undefined) updateData.aiInstructions = body.aiInstructions;
    if (body.productImageReply !== undefined) updateData.productImageReply = Boolean(body.productImageReply);
    if (body.maxImagesPerConversation !== undefined) {
      const limit = parseInt(body.maxImagesPerConversation, 10);
      updateData.maxImagesPerConversation = isNaN(limit) ? 2 : Math.max(0, Math.min(50, limit));
    }
    if (body.maxImagesPerReply !== undefined) {
      const perReply = parseInt(body.maxImagesPerReply, 10);
      updateData.maxImagesPerReply = isNaN(perReply) ? 1 : Math.max(1, Math.min(10, perReply));
    }
    if (body.orderDetection !== undefined) updateData.orderDetection = Boolean(body.orderDetection);
    if (body.voiceProcessing !== undefined) updateData.voiceProcessing = Boolean(body.voiceProcessing);
    if (body.imageUnderstanding !== undefined) updateData.imageUnderstanding = Boolean(body.imageUnderstanding);

    if (body.followUpEnabled !== undefined) updateData.followUpEnabled = Boolean(body.followUpEnabled);
    if (body.followUpWaitMinutes !== undefined) {
      const waitMins = parseInt(body.followUpWaitMinutes, 10);
      updateData.followUpWaitMinutes = isNaN(waitMins) ? 30 : Math.max(1, Math.min(10080, waitMins)); // 1 min up to 7 days
    }
    if (body.followUpMessage !== undefined) updateData.followUpMessage = body.followUpMessage;
    if (body.followUpOnlySeen !== undefined) updateData.followUpOnlySeen = Boolean(body.followUpOnlySeen);
    if (body.followUpMaxCount !== undefined) {
      const maxCount = parseInt(body.followUpMaxCount, 10);
      updateData.followUpMaxCount = isNaN(maxCount) ? 1 : Math.max(1, Math.min(99, maxCount));
    }
    if (body.followUpFrequency !== undefined) updateData.followUpFrequency = body.followUpFrequency;
    if (body.followUpIntervalHours !== undefined) {
      const hours = parseInt(body.followUpIntervalHours, 10);
      updateData.followUpIntervalHours = isNaN(hours) ? 24 : Math.max(1, Math.min(720, hours));
    }

    if (body.verifyToken && body.verifyToken.trim().length > 0) {
      updateData.verifyTokenEncrypted = encrypt(body.verifyToken.trim());
    }

    if (body.pageAccessToken && body.pageAccessToken.trim().length > 0 && !body.pageAccessToken.includes('••••')) {
      const cleanToken = body.pageAccessToken.trim();
      updateData.pageAccessTokenEncrypted = encrypt(cleanToken);

      const targetChannel = (updateData.channel || page.channel || 'FACEBOOK') as SocialChannel;
      const targetId = updateData.channelIdentifier || updateData.facebookPageId || page.channelIdentifier || page.facebookPageId;

      let testResult: { success: boolean; id?: string; name?: string; username?: string; error?: string } = {
        success: false,
      };

      try {
        if (targetChannel === 'WHATSAPP') {
          testResult = await testWhatsAppConnection(targetId, cleanToken);
        } else if (targetChannel === 'INSTAGRAM') {
          testResult = await testInstagramConnection(targetId, cleanToken);
        } else if (targetChannel === 'X') {
          testResult = await testXConnection(cleanToken);
        } else if (targetChannel === 'TELEGRAM') {
          testResult = await testTelegramConnection(cleanToken);
        } else {
          testResult = await testFacebookConnection(targetId, cleanToken);
        }
      } catch (_) {}

      if (testResult.success) {
        updateData.connectionStatus = 'CONNECTED';
        if (testResult.id) {
          updateData.facebookPageId = testResult.id;
          updateData.channelIdentifier = testResult.id;
        }
        if (testResult.name) updateData.pageName = testResult.name;
        if (testResult.username) updateData.pageUsername = testResult.username;
      } else {
        updateData.connectionStatus = 'DISCONNECTED';
      }
    }

    const updatedPage = await prisma.page.update({
      where: { id: params.id },
      data: updateData,
    });

    await logActivity({
      userId: auth.user.id,
      pageId: updatedPage.id,
      action: 'PAGE_UPDATED',
      description: `পেজের সেটিংস আপডেট করা হয়েছে: ${updatedPage.pageName}`,
    });

    return NextResponse.json({
      success: true,
      message: 'পেজ সেটিংস সফলভাবে আপডেট করা হয়েছে।',
      page: updatedPage,
    });
  } catch (error: any) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { success: false, error: 'পেজ আপডেট করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const page = await prisma.page.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id,
      },
    });

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'পেজটি খুঁজে পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    await prisma.page.delete({
      where: { id: params.id },
    });

    await logActivity({
      userId: auth.user.id,
      action: 'PAGE_DISCONNECTED',
      description: `Facebook Page মুছে ফেলা হয়েছে: ${page.pageName} (ID: ${page.facebookPageId})`,
    });

    return NextResponse.json({
      success: true,
      message: 'পেজটি সফলভাবে মুছে ফেলা হয়েছে।',
    });
  } catch (error: any) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { success: false, error: 'পেজ মুছে ফেলতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
