import crypto from 'crypto';
import { serverLogger } from './logger';
import { sendMessengerImage, getImageBufferAndMime } from './facebook';

export const GRAPH_API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || 'v20.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type SocialChannel = 'FACEBOOK' | 'WHATSAPP' | 'INSTAGRAM' | 'X' | 'TELEGRAM';

export interface ChannelConnectionResult {
  success: boolean;
  id?: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  error?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// -------------------------------------------------------------
// 1. FACEBOOK MESSENGER
// -------------------------------------------------------------

export function verifyFacebookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) {
    return false;
  }

  const [method, signature] = signatureHeader.split('=');
  if (method !== 'sha256' || !signature) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody, 'utf8')
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    serverLogger.error('Error during Facebook signature verification', error);
    return false;
  }
}

export async function testFacebookConnection(
  facebookPageId: string,
  accessToken: string
): Promise<ChannelConnectionResult> {
  try {
    if (!accessToken) return { success: false, error: 'Facebook Page Access Token প্রয়োজন।' };

    const cleanToken = accessToken.trim();
    // 1. Primary check: /me with Page Access Token (Meta always returns canonical Page ID & Name)
    let res = await fetch(
      `${GRAPH_BASE_URL}/me?fields=id,name,username&access_token=${encodeURIComponent(cleanToken)}`,
      { method: 'GET' }
    );
    let data = await res.json();

    // 2. Fallback check: query facebookPageId node if /me didn't resolve and an ID was given
    if ((!res.ok || data.error) && facebookPageId && facebookPageId.trim()) {
      res = await fetch(
        `${GRAPH_BASE_URL}/${encodeURIComponent(facebookPageId.trim())}?fields=id,name,username&access_token=${encodeURIComponent(cleanToken)}`,
        { method: 'GET' }
      );
      data = await res.json();
    }

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || 'Facebook Page Access Token সঠিক নয় বা মেয়াদ শেষ হয়েছে।',
      };
    }

    return {
      success: true,
      id: data.id,
      name: data.name,
      username: data.username || (data.name ? data.name.toLowerCase().replace(/\s+/g, '') : undefined),
    };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Facebook API connection failed' };
  }
}

export async function sendFacebookText(
  senderPsid: string,
  text: string,
  accessToken: string
): Promise<SendMessageResult> {
  try {
    if (!accessToken || !senderPsid) return { success: false, error: 'Missing token or PSID' };

    const cleanToken = accessToken.trim();
    // 1. First attempt: Standard RESPONSE
    let res = await fetch(`${GRAPH_BASE_URL}/me/messages?access_token=${encodeURIComponent(cleanToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: senderPsid },
        messaging_type: 'RESPONSE',
        message: { text },
      }),
    });

    let data = await res.json();

    // 2. Second attempt: If rejected due to 24h window policy, retry with MESSAGE_TAG
    if (
      (!res.ok || data.error) &&
      (data.error?.code === 10 ||
        data.error?.error_subcode === 2018278 ||
        data.error?.message?.includes('window') ||
        data.error?.message?.includes('tag'))
    ) {
      res = await fetch(`${GRAPH_BASE_URL}/me/messages?access_token=${encodeURIComponent(cleanToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: senderPsid },
          messaging_type: 'MESSAGE_TAG',
          tag: 'CONFIRMED_EVENT_UPDATE',
          message: { text },
        }),
      });
      data = await res.json();
    }

    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || 'Failed to send Facebook message' };
    }
    return { success: true, messageId: data.message_id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Network error' };
  }
}

export async function sendFacebookImage(
  senderPsid: string,
  imageUrl: string,
  accessToken: string
): Promise<SendMessageResult> {
  return await sendMessengerImage(senderPsid, imageUrl, accessToken);
}

// -------------------------------------------------------------
// 2. WHATSAPP (Meta WhatsApp Business Cloud API)
// -------------------------------------------------------------

export async function testWhatsAppConnection(
  phoneNumberId: string,
  accessToken: string
): Promise<ChannelConnectionResult> {
  try {
    if (!accessToken) return { success: false, error: 'WhatsApp Cloud API Access Token প্রয়োজন।' };
    if (!phoneNumberId) return { success: false, error: 'WhatsApp Phone Number ID প্রয়োজন।' };

    const cleanToken = accessToken.trim();
    const cleanPhoneId = phoneNumberId.trim();

    const res = await fetch(
      `${GRAPH_BASE_URL}/${encodeURIComponent(cleanPhoneId)}?fields=id,verified_name,display_phone_number&access_token=${encodeURIComponent(cleanToken)}`,
      { method: 'GET' }
    );
    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || 'WhatsApp Cloud API এর সাথে সংযোগ করা যায়নি। Token অথবা Phone Number ID যাচাই করুন।',
      };
    }

    return {
      success: true,
      id: data.id || cleanPhoneId,
      name: data.verified_name || data.display_phone_number || 'WhatsApp Business',
      username: data.display_phone_number,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || 'WhatsApp connection test error' };
  }
}

export async function sendWhatsAppText(
  recipientPhoneOrWaId: string,
  text: string,
  accessToken: string,
  phoneNumberId?: string
): Promise<SendMessageResult> {
  try {
    if (!accessToken) return { success: false, error: 'WhatsApp Access Token missing' };
    const targetPhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!targetPhoneId) return { success: false, error: 'WhatsApp Phone Number ID missing' };

    // Format phone: remove any spaces, dashes, or leading plus signs
    let cleanPhone = recipientPhoneOrWaId.replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = '88' + cleanPhone;
    }

    const res = await fetch(`${GRAPH_BASE_URL}/${encodeURIComponent(targetPhoneId)}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      serverLogger.error('WhatsApp Send Text Error', data.error);
      return { success: false, error: data.error?.message || 'WhatsApp API error' };
    }

    const msgId = data.messages?.[0]?.id;
    return { success: true, messageId: msgId };
  } catch (error: any) {
    serverLogger.error('WhatsApp send text network error', error);
    return { success: false, error: error?.message || 'Network error' };
  }
}

export async function sendWhatsAppImage(
  recipientPhoneOrWaId: string,
  imageUrl: string,
  caption: string | undefined,
  accessToken: string,
  phoneNumberId?: string
): Promise<SendMessageResult> {
  try {
    if (!accessToken) return { success: false, error: 'WhatsApp Access Token missing' };
    const targetPhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!targetPhoneId) return { success: false, error: 'WhatsApp Phone Number ID missing' };

    let cleanPhone = recipientPhoneOrWaId.replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = '88' + cleanPhone;
    }

    // 1. Try direct media upload if binary buffer is available (base64 or local)
    const imageInfo = await getImageBufferAndMime(imageUrl);
    let uploadedMediaId: string | null = null;

    if (imageInfo && imageInfo.buffer.length > 0) {
      try {
        const blob = new Blob([new Uint8Array(imageInfo.buffer)], { type: imageInfo.mimeType });
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', blob, imageInfo.filename);

        const uploadRes = await fetch(`${GRAPH_BASE_URL}/${encodeURIComponent(targetPhoneId)}/media`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.id) {
          uploadedMediaId = uploadData.id;
        }
      } catch (err) {
        serverLogger.warn('WhatsApp media upload failed, attempting link payload:', err);
      }
    }

    const payloadBody = uploadedMediaId
      ? {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'image',
          image: {
            id: uploadedMediaId,
            caption: caption || '',
          },
        }
      : {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'image',
          image: {
            link: imageUrl,
            caption: caption || '',
          },
        };

    const res = await fetch(`${GRAPH_BASE_URL}/${encodeURIComponent(targetPhoneId)}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payloadBody),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      serverLogger.error('WhatsApp Send Image Error', data.error);
      return { success: false, error: data.error?.message || 'WhatsApp API Image error' };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Network error' };
  }
}

// -------------------------------------------------------------
// 3. INSTAGRAM (Instagram Graph API / Direct Messages)
// -------------------------------------------------------------

export async function testInstagramConnection(
  instagramAccountId: string,
  accessToken: string
): Promise<ChannelConnectionResult> {
  try {
    if (!accessToken) return { success: false, error: 'Instagram Access Token প্রয়োজন।' };

    const cleanToken = accessToken.trim();
    const cleanId = (instagramAccountId || '').trim();

    // 1. If cleanId provided, test that node directly
    if (cleanId) {
      const res = await fetch(
        `${GRAPH_BASE_URL}/${encodeURIComponent(cleanId)}?fields=id,username,name&access_token=${encodeURIComponent(cleanToken)}`,
        { method: 'GET' }
      );
      const data = await res.json();
      if (res.ok && !data.error && data.id) {
        return {
          success: true,
          id: data.id,
          name: data.name || `@${data.username}`,
          username: data.username,
        };
      }
    }

    // 2. Fallback: Query /me to discover connected Instagram Business Account
    const meRes = await fetch(
      `${GRAPH_BASE_URL}/me?fields=id,name,instagram_business_account{id,username,name}&access_token=${encodeURIComponent(cleanToken)}`,
      { method: 'GET' }
    );
    const meData = await meRes.json();
    if (meRes.ok && meData.instagram_business_account?.id) {
      const ig = meData.instagram_business_account;
      return {
        success: true,
        id: ig.id,
        name: ig.name || `@${ig.username}`,
        username: ig.username,
      };
    }

    return {
      success: false,
      error: 'Instagram Business Account ID অথবা Access Token সঠিক নয়। Token ও Permissions যাচাই করুন।',
    };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Instagram API connection failed' };
  }
}

export async function sendInstagramText(
  recipientIgsid: string,
  text: string,
  accessToken: string,
  instagramAccountId?: string
): Promise<SendMessageResult> {
  try {
    if (!accessToken || !recipientIgsid) return { success: false, error: 'Missing token or IGSID' };

    const endpoint = instagramAccountId
      ? `${GRAPH_BASE_URL}/${encodeURIComponent(instagramAccountId)}/messages`
      : `${GRAPH_BASE_URL}/me/messages`;

    const res = await fetch(`${endpoint}?access_token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientIgsid },
        message: { text },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      serverLogger.error('Instagram Send Text Error', data.error);
      return { success: false, error: data.error?.message || 'Failed to send Instagram DM' };
    }

    return { success: true, messageId: data.message_id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Network error' };
  }
}

export async function sendInstagramImage(
  recipientIgsid: string,
  imageUrl: string,
  accessToken: string,
  instagramAccountId?: string
): Promise<SendMessageResult> {
  try {
    if (!accessToken || !recipientIgsid) return { success: false, error: 'Missing token or IGSID' };

    const endpoint = instagramAccountId
      ? `${GRAPH_BASE_URL}/${encodeURIComponent(instagramAccountId)}/messages`
      : `${GRAPH_BASE_URL}/me/messages`;

    const res = await fetch(`${endpoint}?access_token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientIgsid },
        message: {
          attachment: {
            type: 'image',
            payload: { url: imageUrl, is_reusable: true },
          },
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || 'Failed to send Instagram image' };
    }

    return { success: true, messageId: data.message_id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Network error' };
  }
}

// -------------------------------------------------------------
// 4. X (TWITTER) (X API v2 Direct Messages)
// -------------------------------------------------------------

export function verifyXCrcToken(crcToken: string, consumerSecret: string): string {
  const hmac = crypto.createHmac('sha256', consumerSecret).update(crcToken).digest('base64');
  return `sha256=${hmac}`;
}

export async function testXConnection(
  bearerTokenOrApiKey: string
): Promise<ChannelConnectionResult> {
  try {
    if (!bearerTokenOrApiKey) return { success: false, error: 'X (Twitter) Bearer Token প্রয়োজন।' };

    const res = await fetch('https://api.twitter.com/2/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerTokenOrApiKey.trim()}`,
      },
    });

    const data = await res.json();
    if (!res.ok || data.errors) {
      return {
        success: false,
        error: data.errors?.[0]?.message || data.detail || 'X (Twitter) API Token সঠিক নয় বা মেয়াদ উত্তীর্ণ।',
      };
    }

    return {
      success: true,
      id: data.data?.id,
      name: data.data?.name || data.data?.username,
      username: data.data?.username,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || 'X API connection failed' };
  }
}

export async function sendXMessage(
  recipientUserId: string,
  text: string,
  bearerToken: string
): Promise<SendMessageResult> {
  try {
    if (!bearerToken || !recipientUserId) return { success: false, error: 'Missing token or recipient ID' };

    const res = await fetch(
      `https://api.twitter.com/2/dm_conversations/with/${encodeURIComponent(recipientUserId)}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken.trim()}`,
        },
        body: JSON.stringify({
          text,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok || data.errors) {
      serverLogger.error('X Send DM Error', data);
      return {
        success: false,
        error: data.errors?.[0]?.message || data.detail || 'Failed to send X message',
      };
    }

    return { success: true, messageId: data.data?.dm_event_id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Network error' };
  }
}

// -------------------------------------------------------------
// 5. TELEGRAM (Telegram Bot API)
// -------------------------------------------------------------

export async function testTelegramConnection(
  botToken: string
): Promise<ChannelConnectionResult> {
  try {
    if (!botToken) return { success: false, error: 'Telegram Bot Token প্রয়োজন।' };

    const cleanToken = botToken.trim();
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`, {
      method: 'GET',
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return {
        success: false,
        error: data.description || 'Telegram Bot Token সঠিক নয়। @BotFather থেকে প্রাপ্ত সঠিক টোকেন প্রদান করুন।',
      };
    }

    return {
      success: true,
      id: String(data.result?.id),
      name: data.result?.first_name || data.result?.username || 'Telegram Bot',
      username: data.result?.username,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Telegram connection failed' };
  }
}

export async function setupTelegramWebhook(
  botToken: string,
  webhookUrl: string
): Promise<{ success: boolean; description?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken.trim()}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await res.json();
    return { success: Boolean(data.ok), description: data.description };
  } catch (error: any) {
    return { success: false, description: error?.message };
  }
}

export async function sendTelegramText(
  chatId: string | number,
  text: string,
  botToken: string
): Promise<SendMessageResult> {
  try {
    if (!botToken || !chatId) return { success: false, error: 'Missing bot token or chatId' };

    const res = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      serverLogger.error('Telegram Send Text Error', data);
      return { success: false, error: data.description || 'Failed to send Telegram message' };
    }

    return { success: true, messageId: String(data.result?.message_id) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Network error' };
  }
}

export async function sendTelegramImage(
  chatId: string,
  imageUrl: string,
  caption: string | undefined,
  botToken: string
): Promise<SendMessageResult> {
  try {
    if (!botToken || !chatId) return { success: false, error: 'Missing bot token or chatId' };

    // 1. Try binary multipart upload
    const imageInfo = await getImageBufferAndMime(imageUrl);
    if (imageInfo && imageInfo.buffer.length > 0) {
      try {
        const blob = new Blob([new Uint8Array(imageInfo.buffer)], { type: imageInfo.mimeType });
        const formData = new FormData();
        formData.append('chat_id', chatId);
        if (caption) formData.append('caption', caption);
        formData.append('photo', blob, imageInfo.filename);

        const res = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendPhoto`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.ok) {
          return { success: true, messageId: String(data.result?.message_id) };
        }
      } catch (err) {
        serverLogger.warn('Telegram multipart photo upload failed, falling back:', err);
      }
    }

    // 2. Fallback URL
    const res = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: imageUrl,
        caption: caption || '',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, error: data.description || 'Failed to send Telegram photo' };
    }

    return { success: true, messageId: String(data.result?.message_id) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Network error' };
  }
}

// -------------------------------------------------------------
// Unified Channel Dispatcher
// -------------------------------------------------------------

export async function sendChannelMessage(params: {
  channel: SocialChannel;
  recipientId: string;
  text: string;
  accessToken: string;
  channelIdentifier?: string | null;
  extraConfig?: any;
}): Promise<SendMessageResult> {
  const { channel, recipientId, text, accessToken, channelIdentifier, extraConfig } = params;

  switch (channel) {
    case 'WHATSAPP': {
      const phoneId = channelIdentifier || extraConfig?.phoneNumberId;
      return await sendWhatsAppText(recipientId, text, accessToken, phoneId);
    }
    case 'INSTAGRAM': {
      const igId = channelIdentifier || extraConfig?.instagramAccountId;
      return await sendInstagramText(recipientId, text, accessToken, igId);
    }
    case 'X': {
      return await sendXMessage(recipientId, text, accessToken);
    }
    case 'TELEGRAM': {
      return await sendTelegramText(recipientId, text, accessToken);
    }
    case 'FACEBOOK':
    default: {
      return await sendFacebookText(recipientId, text, accessToken);
    }
  }
}

export async function sendChannelImage(params: {
  channel: SocialChannel;
  recipientId: string;
  imageUrl: string;
  caption?: string;
  accessToken: string;
  channelIdentifier?: string | null;
  extraConfig?: any;
}): Promise<SendMessageResult> {
  const { channel, recipientId, imageUrl, caption, accessToken, channelIdentifier, extraConfig } = params;

  switch (channel) {
    case 'WHATSAPP': {
      const phoneId = channelIdentifier || extraConfig?.phoneNumberId;
      return await sendWhatsAppImage(recipientId, imageUrl, caption, accessToken, phoneId);
    }
    case 'INSTAGRAM': {
      const igId = channelIdentifier || extraConfig?.instagramAccountId;
      return await sendInstagramImage(recipientId, imageUrl, accessToken, igId);
    }
    case 'TELEGRAM': {
      return await sendTelegramImage(recipientId, imageUrl, caption, accessToken);
    }
    case 'FACEBOOK':
    default: {
      return await sendFacebookImage(recipientId, imageUrl, accessToken);
    }
  }
}
