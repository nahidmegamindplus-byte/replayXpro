import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { serverLogger } from '@/lib/logger';
import { processIncomingChannelMessage } from '@/lib/channel-processor';

/**
 * Instagram Direct Webhook Verification Endpoint (GET)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    serverLogger.info('Instagram Webhook verification request received', { mode, token });

    if (mode === 'subscribe' && token && challenge) {
      const pages = await prisma.page.findMany({
        where: { channel: 'INSTAGRAM' },
        select: { id: true, pageName: true, verifyTokenEncrypted: true },
      });

      const globalVerifyToken =
        process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ||
        process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;

      const isGlobalMatch = Boolean(
        globalVerifyToken && globalVerifyToken.trim() === token.trim()
      );

      const matchedPage =
        pages.find((p) => decrypt(p.verifyTokenEncrypted) === token) ||
        (isGlobalMatch && pages.length > 0 ? pages[0] : null);

      if (matchedPage || isGlobalMatch) {
        if (matchedPage) {
          await prisma.page.update({
            where: { id: matchedPage.id },
            data: { webhookStatus: 'ACTIVE' },
          });
          serverLogger.info(`Instagram Webhook verified for: ${matchedPage.pageName}`);
        }

        return new NextResponse(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      } else {
        serverLogger.warn('Instagram verify token mismatch', { token });
        return new NextResponse('Verification token mismatch', { status: 403 });
      }
    }

    return new NextResponse('Invalid verification parameters', { status: 400 });
  } catch (error: any) {
    serverLogger.error('Error in Instagram webhook GET verification', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Instagram Direct Webhook Event Processing Endpoint (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (payload.object !== 'instagram' && payload.object !== 'page') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const entries = payload.entry || [];
    for (const entry of entries) {
      const recipientId = entry.id;
      const messagingEvents = entry.messaging || [];

      for (const event of messagingEvents) {
        const senderId = event.sender?.id;

        // Handle Read / Seen receipts from customer on Instagram
        if (event.read && senderId) {
          try {
            const readPage = await prisma.page.findFirst({
              where: {
                OR: [
                  { facebookPageId: recipientId },
                  { channelIdentifier: recipientId },
                ],
              },
              select: { id: true },
            });
            if (readPage) {
              await prisma.conversation.updateMany({
                where: { pageId: readPage.id, senderPsid: senderId },
                data: { lastSeenAt: new Date() },
              });
              serverLogger.info(`Updated Instagram lastSeenAt watermark for customer ${senderId}`);
            }
          } catch (readErr) {
            serverLogger.warn('Error recording Instagram read receipt:', readErr);
          }
          continue;
        }

        const message = event.message;

        if (!message || message.is_echo || !senderId) continue;

        const messageId = message.mid;
        let messageType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'ATTACHMENT' = 'TEXT';
        let messageText = message.text || '';
        let mediaUrl: string | null = null;

        if (message.attachments && message.attachments.length > 0) {
          const firstAttach = message.attachments[0];
          const attachType = firstAttach.type || '';
          const url = firstAttach.payload?.url || null;

          if (attachType === 'image') {
            messageType = 'IMAGE';
            mediaUrl = url;
          } else if (attachType === 'audio') {
            messageType = 'AUDIO';
            mediaUrl = url;
          } else if (attachType === 'video') {
            messageType = 'VIDEO';
            mediaUrl = url;
          } else {
            messageType = 'ATTACHMENT';
            mediaUrl = url;
          }
        }

        await processIncomingChannelMessage({
          channel: 'INSTAGRAM',
          externalChannelId: recipientId,
          senderId,
          messageId,
          messageType,
          messageText,
          mediaUrl,
          req,
        });
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error: any) {
    serverLogger.error('Error in Instagram Webhook POST handler', error);
    return NextResponse.json({ error: 'Internal Webhook Error' }, { status: 500 });
  }
}
