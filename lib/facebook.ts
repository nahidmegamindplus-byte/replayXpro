import crypto from 'crypto';
import { serverLogger } from './logger';

export const GRAPH_API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || 'v20.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Verify incoming Facebook Webhook payload signature against App Secret using HMAC-SHA256
 */
export function verifyFacebookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) {
    serverLogger.warn('Signature verification failed: Missing signature or app secret');
    return false;
  }

  const [method, signature] = signatureHeader.split('=');
  if (method !== 'sha256' || !signature) {
    serverLogger.warn(`Signature verification failed: Unsupported method ${method}`);
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
    serverLogger.error('Error during signature verification', error);
    return false;
  }
}

/**
 * Test Facebook Page access token and connection by calling the Graph API
 */
export async function testPageConnection(
  facebookPageId: string,
  accessToken: string
): Promise<{ success: boolean; id?: string; pageName?: string; pageUsername?: string; error?: string }> {
  try {
    if (!accessToken) {
      return { success: false, error: 'Page Access Token প্রয়োজন।' };
    }

    const cleanToken = accessToken.trim();
    // 1. Primary check: Query /me using Page Access Token
    let res = await fetch(
      `${GRAPH_BASE_URL}/me?fields=id,name,username&access_token=${encodeURIComponent(cleanToken)}`,
      { method: 'GET' }
    );
    let data = await res.json();

    // 2. Fallback check: Query provided page ID directly
    if ((!res.ok || data.error) && facebookPageId && facebookPageId.trim()) {
      res = await fetch(
        `${GRAPH_BASE_URL}/${encodeURIComponent(facebookPageId.trim())}?fields=id,name,username&access_token=${encodeURIComponent(cleanToken)}`,
        { method: 'GET' }
      );
      data = await res.json();
    }

    if (!res.ok || data.error) {
      const fbError = data.error?.message || 'Facebook API এর সাথে সংযোগ করা যায়নি।';
      return {
        success: false,
        error: `Page Access Token সতর্কীকরণ: ${fbError}`,
      };
    }

    return {
      success: true,
      id: data.id,
      pageName: data.name,
      pageUsername: data.username || (data.name ? data.name.toLowerCase().replace(/\s+/g, '') : undefined),
    };
  } catch (error: any) {
    serverLogger.error('Facebook connection test failed', error);
    return {
      success: false,
      error: 'Facebook সার্ভারের সাথে যোগাযোগ করা সম্ভব হয়নি।',
    };
  }
}

/**
 * Send Messenger sender action (typing_on, typing_off, mark_seen)
 */
export async function sendMessengerAction(
  senderPsid: string,
  action: 'typing_on' | 'typing_off' | 'mark_seen',
  accessToken: string
): Promise<boolean> {
  try {
    if (!accessToken || !senderPsid) return false;

    const res = await fetch(`${GRAPH_BASE_URL}/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: senderPsid },
        sender_action: action,
      }),
    });

    return res.ok;
  } catch (error) {
    // Non-blocking error for typing indicator
    serverLogger.warn('Messenger sender action non-fatal error', error);
    return false;
  }
}

/**
 * Send text message reply to a customer via Facebook Messenger Send API
 */
export async function sendMessengerText(
  senderPsid: string,
  text: string,
  accessToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!accessToken) {
      return { success: false, error: 'Missing access token' };
    }

    const cleanToken = accessToken.trim();
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
      const errMsg = data.error?.message || 'Failed to send Messenger message';
      serverLogger.error('Facebook Send API error', data.error);
      return { success: false, error: errMsg };
    }

    return { success: true, messageId: data.message_id };
  } catch (error: any) {
    serverLogger.error('Network error calling Facebook Send API', error);
    return { success: false, error: error?.message || 'Network error' };
  }
}

/**
 * Extract binary Buffer and MIME type from base64 data URLs, local endpoints, or HTTP URLs
 */
export async function getImageBufferAndMime(
  imageUrl: string
): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
  try {
    if (!imageUrl) return null;
    const cleanUrl = imageUrl.trim();

    // 1. Direct Base64 Data URL
    if (cleanUrl.startsWith('data:image/')) {
      const match = cleanUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
        return { buffer, mimeType, filename: `product_image.${ext}` };
      }
    }

    // 2. Local/Internal product image route (e.g. /api/products/[id]/image or http://.../api/products/[id]/image)
    const productRouteMatch = cleanUrl.match(/\/api\/products\/([a-zA-Z0-9_-]+)\/image/);
    if (productRouteMatch && productRouteMatch[1]) {
      try {
        const prisma = (await import('@/lib/db')).default;
        const prod = await prisma.product.findUnique({
          where: { id: productRouteMatch[1] },
          select: { imageUrl: true },
        });
        if (prod?.imageUrl && prod.imageUrl.startsWith('data:image/')) {
          return getImageBufferAndMime(prod.imageUrl);
        }
      } catch (_) {}
    }

    // 3. HTTP / HTTPS URL
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      const res = await fetch(cleanUrl, {
        headers: { 'User-Agent': 'ReplyX-AI/1.0' },
      });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const mimeType = contentType.split(';')[0].trim();
        const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
        return { buffer, mimeType, filename: `product_image.${ext}` };
      }
    }
  } catch (err) {
    serverLogger.warn('Error extracting image buffer:', err);
  }
  return null;
}

/**
 * Send an image attachment to a customer via Facebook Messenger Send API.
 * Supports direct multipart/form-data upload (works 100% with Base64 & Localhost)
 * as well as public HTTPS URL payloads.
 */
export async function sendMessengerImage(
  senderPsid: string,
  imageUrl: string,
  accessToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!accessToken || !imageUrl) {
      return { success: false, error: 'Missing token or image URL' };
    }

    // 1. Try direct multipart upload (works for base64, localhost, internal product images, and pre-fetched URLs)
    const imageInfo = await getImageBufferAndMime(imageUrl);

    if (imageInfo && imageInfo.buffer.length > 0) {
      try {
        serverLogger.info(
          `Uploading product image directly to Facebook via multipart/form-data (${imageInfo.mimeType}, ${imageInfo.buffer.length} bytes) to PSID ${senderPsid}`
        );

        const blob = new Blob([new Uint8Array(imageInfo.buffer)], { type: imageInfo.mimeType });
        const formData = new FormData();
        formData.append('recipient', JSON.stringify({ id: senderPsid }));
        formData.append('messaging_type', 'RESPONSE');
        formData.append(
          'message',
          JSON.stringify({
            attachment: {
              type: 'image',
              payload: { is_reusable: true },
            },
          })
        );
        formData.append('filedata', blob, imageInfo.filename);

        const uploadRes = await fetch(
          `${GRAPH_BASE_URL}/me/messages?access_token=${encodeURIComponent(accessToken)}`,
          {
            method: 'POST',
            body: formData,
          }
        );

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && !uploadData.error) {
          serverLogger.info(`Direct multipart image upload succeeded! Message ID: ${uploadData.message_id}`);
          return { success: true, messageId: uploadData.message_id };
        }

        serverLogger.warn('Direct multipart upload returned error from Facebook:', uploadData.error);
      } catch (uploadErr) {
        serverLogger.warn('Direct multipart image upload exception:', uploadErr);
      }
    }

    // 2. Fallback: URL payload (for public HTTPS URLs that Facebook servers can reach)
    if (
      imageUrl.startsWith('https://') &&
      !imageUrl.includes('localhost') &&
      !imageUrl.includes('127.0.0.1') &&
      !imageUrl.includes('0.0.0.0')
    ) {
      serverLogger.info(`Sending image via public HTTPS URL payload to Facebook for PSID ${senderPsid}`);
      const res = await fetch(`${GRAPH_BASE_URL}/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: senderPsid },
          messaging_type: 'RESPONSE',
          message: {
            attachment: {
              type: 'image',
              payload: {
                url: imageUrl,
                is_reusable: true,
              },
            },
          },
        }),
      });

      const data = await res.json();
      if (res.ok && !data.error) {
        return { success: true, messageId: data.message_id };
      }
      serverLogger.warn('Facebook URL payload image send failed:', data.error);
      return { success: false, error: data.error?.message };
    }

    return {
      success: false,
      error: 'ইমেজ সেন্ড করা সম্ভব হয়নি। অনুগ্রহ করে পাবলিক ইমেজ লিংক বা সঠিক ইমেজ ফরম্যাট ব্যবহার করুন।',
    };
  } catch (error: any) {
    serverLogger.warn('Network error sending image attachment', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch real user profile (first_name, last_name, profile_pic) from Facebook Graph API
 */
export async function getFacebookUserProfile(
  senderPsid: string,
  accessToken: string
): Promise<{ name?: string; profilePic?: string } | null> {
  try {
    if (!accessToken || !senderPsid) return null;
    const res = await fetch(
      `${GRAPH_BASE_URL}/${senderPsid}?fields=first_name,last_name,profile_pic&access_token=${encodeURIComponent(accessToken)}`,
      { method: 'GET' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
    return {
      name: fullName || undefined,
      profilePic: data.profile_pic || undefined,
    };
  } catch (err) {
    serverLogger.warn('Error fetching Facebook user profile:', err);
    return null;
  }
}

