import { NextRequest } from 'next/server';

/**
 * Get the application's base URL dynamically.
 * Works seamlessly across Hostinger (VPS/Cloud/Node.js/LiteSpeed/Nginx), Vercel, Netlify,
 * Ngrok/Cloudflare tunnels, and Localhost.
 */
export function getAppUrl(req?: NextRequest): string {
  // 1. If incoming HTTP request is present, dynamically extract the actual Hostinger / live domain
  if (req) {
    // Check Forwarded Host headers (standard reverse proxy headers used by Hostinger, Cloudflare, Nginx, LiteSpeed)
    const rawForwardedHost =
      req.headers.get('x-forwarded-host') ||
      req.headers.get('x-original-host') ||
      req.headers.get('host') ||
      req.headers.get('origin');

    if (rawForwardedHost) {
      // Split in case of multiple proxies: "client.com, proxy.hostinger.com"
      const cleanHost = rawForwardedHost.split(',')[0].trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');

      // Determine protocol
      const forwardedProto = req.headers.get('x-forwarded-proto')
        ? req.headers.get('x-forwarded-proto')!.split(',')[0].trim()
        : null;
      const isSsl = req.headers.get('x-forwarded-ssl') === 'on';

      let proto = 'https';
      if (cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1') || cleanHost.includes('0.0.0.0')) {
        proto = forwardedProto || 'http';
      } else {
        // For live domains (Hostinger / custom domains), always force https for Meta / Facebook Webhooks
        proto = forwardedProto === 'http' && cleanHost.includes('localhost') ? 'http' : 'https';
      }

      if (cleanHost) {
        return `${proto}://${cleanHost}`.replace(/\/+$/, '');
      }
    }

    if (req.nextUrl && req.nextUrl.origin && !req.nextUrl.origin.includes('0.0.0.0')) {
      const origin = req.nextUrl.origin.replace(/\/+$/, '');
      // Ensure https on public domains
      if (!origin.includes('localhost') && !origin.includes('127.0.0.1') && origin.startsWith('http://')) {
        return origin.replace('http://', 'https://');
      }
      return origin;
    }
  }

  // 2. Check explicitly configured WEBHOOK_BASE_URL (for ngrok / tunnels)
  if (process.env.WEBHOOK_BASE_URL && process.env.WEBHOOK_BASE_URL.trim()) {
    return process.env.WEBHOOK_BASE_URL.trim().replace(/\/+$/, '');
  }

  // 3. Explicitly configured APP_URL or NEXT_PUBLIC_APP_URL (if not generic localhost)
  const configuredAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl && configuredAppUrl.trim() && !configuredAppUrl.includes('localhost:3000')) {
    return configuredAppUrl.trim().replace(/\/+$/, '');
  }

  // 4. Hostinger / Vercel / Netlify environment variables
  if (process.env.HOSTINGER_URL && process.env.HOSTINGER_URL.trim()) {
    return process.env.HOSTINGER_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.VERCEL_URL && process.env.VERCEL_URL.trim()) {
    const vUrl = process.env.VERCEL_URL.trim();
    return vUrl.startsWith('http') ? vUrl.replace(/\/+$/, '') : `https://${vUrl}`;
  }
  if (process.env.URL && process.env.URL.trim()) {
    return process.env.URL.trim().replace(/\/+$/, '');
  }
  if (process.env.DEPLOY_PRIME_URL && process.env.DEPLOY_PRIME_URL.trim()) {
    return process.env.DEPLOY_PRIME_URL.trim().replace(/\/+$/, '');
  }

  // 5. If APP_URL was configured as localhost:3000, return it
  if (configuredAppUrl && configuredAppUrl.trim()) {
    return configuredAppUrl.trim().replace(/\/+$/, '');
  }

  // 6. Default fallback for local development
  return 'http://localhost:3000';
}

/**
 * Get the Webhook Base URL.
 * Supports overriding via WEBHOOK_BASE_URL (for ngrok, cloudflared, local tunnels).
 */
export function getWebhookBaseUrl(req?: NextRequest): string {
  if (process.env.WEBHOOK_BASE_URL && process.env.WEBHOOK_BASE_URL.trim()) {
    return process.env.WEBHOOK_BASE_URL.trim().replace(/\/+$/, '');
  }
  return getAppUrl(req);
}

/**
 * Get the full Facebook Messenger Webhook endpoint URL.
 */
export function getFacebookWebhookUrl(req?: NextRequest): string {
  const base = getWebhookBaseUrl(req);
  return `${base}/api/webhooks/facebook`;
}

export function getWhatsAppWebhookUrl(req?: NextRequest): string {
  const base = getWebhookBaseUrl(req);
  return `${base}/api/webhooks/whatsapp`;
}

export function getInstagramWebhookUrl(req?: NextRequest): string {
  const base = getWebhookBaseUrl(req);
  return `${base}/api/webhooks/instagram`;
}

export function getXWebhookUrl(req?: NextRequest): string {
  const base = getWebhookBaseUrl(req);
  return `${base}/api/webhooks/x`;
}

export function getTelegramWebhookUrl(req?: NextRequest): string {
  const base = getWebhookBaseUrl(req);
  return `${base}/api/webhooks/telegram`;
}

export function getChannelWebhookUrl(channel: string, req?: NextRequest): string {
  switch (channel?.toUpperCase()) {
    case 'WHATSAPP':
      return getWhatsAppWebhookUrl(req);
    case 'INSTAGRAM':
      return getInstagramWebhookUrl(req);
    case 'X':
      return getXWebhookUrl(req);
    case 'TELEGRAM':
      return getTelegramWebhookUrl(req);
    case 'FACEBOOK':
    default:
      return getFacebookWebhookUrl(req);
  }
}

