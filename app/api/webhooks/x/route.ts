import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { serverLogger } from '@/lib/logger';
import { processIncomingChannelMessage } from '@/lib/channel-processor';

/**
 * X (Twitter) Account Activity API Challenge-Response Check (CRC) Endpoint (GET)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const crcToken = searchParams.get('crc_token');

    if (!crcToken) {
      return NextResponse.json({ error: 'Missing crc_token parameter' }, { status: 400 });
    }

    serverLogger.info('X (Twitter) CRC check received', { crcToken });

    // Look for consumer secret from env or first configured X page
    let consumerSecret =
      process.env.TWITTER_CONSUMER_SECRET ||
      process.env.X_CONSUMER_SECRET ||
      process.env.TWITTER_API_SECRET;

    if (!consumerSecret) {
      const xPage = await prisma.page.findFirst({
        where: { channel: 'X' },
      });
      if (xPage?.extraConfig) {
        try {
          const cfg = JSON.parse(xPage.extraConfig);
          consumerSecret = cfg.consumerSecret || cfg.apiSecret;
        } catch (_) {}
      }
    }

    if (!consumerSecret) {
      consumerSecret = 'replyx_default_x_secret';
    }

    const hmac = crypto
      .createHmac('sha256', consumerSecret)
      .update(crcToken)
      .digest('base64');

    return NextResponse.json({
      response_token: `sha256=${hmac}`,
    });
  } catch (error: any) {
    serverLogger.error('Error during X CRC verification', error);
    return NextResponse.json({ error: 'Internal CRC error' }, { status: 500 });
  }
}

/**
 * X (Twitter) Direct Message Events Processing Endpoint (POST)
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

    const forUserId = payload.for_user_id;
    const dmEvents = payload.direct_message_events || payload.dm_events || [];

    for (const event of dmEvents) {
      if (event.type !== 'message_create') continue;

      const messageCreate = event.message_create;
      if (!messageCreate) continue;

      const senderId = messageCreate.sender_id;
      const recipientId = messageCreate.target?.recipient_id || forUserId;

      // Skip messages sent by the account itself (echoes)
      if (senderId === forUserId || senderId === recipientId) continue;

      const messageId = event.id;
      const messageData = messageCreate.message_data;
      const messageText = messageData?.text || '';
      const mediaUrl = messageData?.attachment?.media?.media_url_https || null;
      const messageType = mediaUrl ? 'IMAGE' : 'TEXT';

      await processIncomingChannelMessage({
        channel: 'X',
        externalChannelId: recipientId || forUserId || 'default_x',
        senderId,
        messageId,
        messageType,
        messageText,
        mediaUrl,
        req,
      });
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error: any) {
    serverLogger.error('Error in X Webhook POST handler', error);
    return NextResponse.json({ error: 'Internal Webhook Error' }, { status: 500 });
  }
}
