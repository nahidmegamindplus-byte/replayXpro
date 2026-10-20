import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '@/lib/logger';
import { processIncomingChannelMessage } from '@/lib/channel-processor';

/**
 * Telegram Bot API Webhook Endpoint (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const botParam = searchParams.get('bot') || searchParams.get('id') || 'default_tg';

    const rawBody = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const message = payload.message || payload.channel_post;
    if (!message) {
      return NextResponse.json({ ok: true, status: 'ignored' }, { status: 200 });
    }

    const chatId = String(message.chat?.id || message.from?.id);
    const messageId = String(payload.update_id || message.message_id);
    const senderName =
      message.from?.first_name ||
      message.from?.username ||
      message.chat?.title ||
      'Telegram User';

    let messageType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'ATTACHMENT' = 'TEXT';
    let messageText = message.text || message.caption || '';
    let mediaUrl: string | null = null;

    if (message.photo && message.photo.length > 0) {
      messageType = 'IMAGE';
      const bestPhoto = message.photo[message.photo.length - 1];
      mediaUrl = `telegram_file://${bestPhoto.file_id}`;
    } else if (message.voice || message.audio) {
      messageType = 'AUDIO';
      const fileId = message.voice?.file_id || message.audio?.file_id;
      mediaUrl = `telegram_file://${fileId}`;
    } else if (message.video) {
      messageType = 'VIDEO';
      mediaUrl = `telegram_file://${message.video.file_id}`;
    }

    if (!chatId) {
      return NextResponse.json({ ok: true, status: 'no_chat_id' }, { status: 200 });
    }

    await processIncomingChannelMessage({
      channel: 'TELEGRAM',
      externalChannelId: botParam,
      senderId: chatId,
      senderName,
      messageId,
      messageType,
      messageText,
      mediaUrl,
      req,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    serverLogger.error('Error in Telegram Webhook POST handler', error);
    return NextResponse.json({ ok: false, error: 'Internal Error' }, { status: 500 });
  }
}
