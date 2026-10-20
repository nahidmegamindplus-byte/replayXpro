import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { serverLogger } from '@/lib/logger';
import { processIncomingChannelMessage } from '@/lib/channel-processor';

/**
 * WhatsApp Cloud API Webhook Verification Endpoint (GET)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    serverLogger.info('WhatsApp Webhook verification request received', { mode, token });

    if (mode === 'subscribe' && token && challenge) {
      // Find WhatsApp channel with matching verify token
      const pages = await prisma.page.findMany({
        where: { channel: 'WHATSAPP' },
        select: { id: true, pageName: true, verifyTokenEncrypted: true },
      });

      const globalVerifyToken =
        process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
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
          serverLogger.info(`WhatsApp Webhook verified for: ${matchedPage.pageName}`);
        }

        return new NextResponse(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      } else {
        serverLogger.warn('WhatsApp verify token mismatch', { token });
        return new NextResponse('Verification token mismatch', { status: 403 });
      }
    }

    return new NextResponse('Invalid verification request parameters', { status: 400 });
  } catch (error: any) {
    serverLogger.error('Error in WhatsApp webhook GET verification', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * WhatsApp Cloud API Webhook Event Processing Endpoint (POST)
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

    if (payload.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const entries = payload.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        // Handle message read/seen receipts in WhatsApp
        if (change.field === 'messages' && change.value?.statuses) {
          const statuses = change.value.statuses || [];
          for (const st of statuses) {
            if (st.status === 'read' && st.recipient_id) {
              try {
                await prisma.conversation.updateMany({
                  where: { senderPsid: st.recipient_id },
                  data: { lastSeenAt: new Date() },
                });
                serverLogger.info(`WhatsApp message read receipt marked for recipient: ${st.recipient_id}`);
              } catch (_) {}
            }
          }
        }

        if (change.field !== 'messages') continue;
        const value = change.value;
        if (!value) continue;

        const phoneNumberId = value.metadata?.phone_number_id || entry.id;
        const contacts = value.contacts || [];
        const contactName = contacts[0]?.profile?.name || null;
        const messages = value.messages || [];

        for (const msg of messages) {
          const from = msg.from; // Customer phone number
          const msgId = msg.id;
          const msgTypeRaw = msg.type;

          let messageType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'ATTACHMENT' = 'TEXT';
          let messageText = '';
          let mediaUrl: string | null = null;

          if (msgTypeRaw === 'text') {
            messageType = 'TEXT';
            messageText = msg.text?.body || '';
          } else if (msgTypeRaw === 'interactive') {
            messageType = 'TEXT';
            messageText =
              msg.interactive?.button_reply?.title ||
              msg.interactive?.list_reply?.title ||
              '';
          } else if (msgTypeRaw === 'image') {
            messageType = 'IMAGE';
            messageText = msg.image?.caption || '';
            mediaUrl = msg.image?.id ? `whatsapp_media://${msg.image.id}` : null;
          } else if (msgTypeRaw === 'audio' || msgTypeRaw === 'voice') {
            messageType = 'AUDIO';
            mediaUrl = (msg.audio?.id || msg.voice?.id)
              ? `whatsapp_media://${msg.audio?.id || msg.voice?.id}`
              : null;
          } else {
            messageType = 'ATTACHMENT';
          }

          if (!from) continue;

          // Dispatch to unified processor
          await processIncomingChannelMessage({
            channel: 'WHATSAPP',
            externalChannelId: phoneNumberId,
            senderId: from,
            senderName: contactName,
            messageId: msgId,
            messageType,
            messageText,
            mediaUrl,
            req,
          });
        }
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error: any) {
    serverLogger.error('Critical error in WhatsApp Webhook POST handler', error);
    return NextResponse.json({ error: 'Internal Webhook Error' }, { status: 500 });
  }
}
