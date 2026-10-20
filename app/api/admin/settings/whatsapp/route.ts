import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { ensureDatabaseReady } from '@/lib/db-init';

interface SupportChannel {
  id: string;
  platform: string; // 'WHATSAPP' | 'MESSENGER' | 'INSTAGRAM' | 'TELEGRAM' | 'X' | 'PHONE' | 'EMAIL' | 'YOUTUBE' | 'DISCORD' | 'CUSTOM'
  title: string;
  link: string;
  message?: string;
  enabled: boolean;
  color?: string;
}

const DEFAULT_CHANNELS: SupportChannel[] = [
  {
    id: 'ch_whatsapp',
    platform: 'WHATSAPP',
    title: 'WhatsApp চ্যাট',
    link: '+8801521716613',
    message: 'আসসালামু আলাইকুম, আমি ReplyX AI সম্পর্কে তথ্য জানতে চাই।',
    enabled: true,
    color: '#25D366',
  },
  {
    id: 'ch_messenger',
    platform: 'MESSENGER',
    title: 'Facebook Messenger',
    link: 'replyx.ai',
    enabled: true,
    color: '#0084FF',
  },
  {
    id: 'ch_instagram',
    platform: 'INSTAGRAM',
    title: 'Instagram DM',
    link: 'replyx.ai',
    enabled: true,
    color: '#E1306C',
  },
  {
    id: 'ch_telegram',
    platform: 'TELEGRAM',
    title: 'Telegram Bot',
    link: 'replyx_support_bot',
    enabled: true,
    color: '#229ED9',
  },
  {
    id: 'ch_x',
    platform: 'X',
    title: 'X (Twitter) DM',
    link: 'ReplyX_AI',
    enabled: true,
    color: '#000000',
  },
];

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('response' in adminAuth) return adminAuth.response;

  try {
    await ensureDatabaseReady();
    const settingsList = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'whatsapp_enabled',
            'whatsapp_number',
            'whatsapp_message',
            'whatsapp_position',
            'social_widget_title',
            'social_widget_subtitle',
            'social_widget_tooltip',
            'social_widget_single_direct',
            'social_support_channels',
            'instagram_username',
            'telegram_username',
            'x_handle',
            'facebook_page',
          ],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const isExplicitlyDisabled = settingsMap['whatsapp_enabled'] === 'false';
    const isEnabled = !isExplicitlyDisabled;

    let channels: SupportChannel[] = [];
    if (settingsMap['social_support_channels']) {
      try {
        const parsed = JSON.parse(settingsMap['social_support_channels']);
        if (Array.isArray(parsed) && parsed.length > 0) {
          channels = parsed;
        }
      } catch (_) {}
    }

    // Fallback if no dynamic channels exist yet
    if (channels.length === 0) {
      channels = [
        {
          id: 'ch_whatsapp',
          platform: 'WHATSAPP',
          title: 'WhatsApp চ্যাট',
          link: settingsMap['whatsapp_number'] || '+8801521716613',
          message:
            settingsMap['whatsapp_message'] ||
            'আসসালামু আলাইকুম, আমি ReplyX AI সম্পর্কে তথ্য জানতে চাই।',
          enabled: true,
          color: '#25D366',
        },
        {
          id: 'ch_messenger',
          platform: 'MESSENGER',
          title: 'Facebook Messenger',
          link: settingsMap['facebook_page'] || 'replyx.ai',
          enabled: true,
          color: '#0084FF',
        },
        {
          id: 'ch_instagram',
          platform: 'INSTAGRAM',
          title: 'Instagram DM',
          link: settingsMap['instagram_username'] || 'replyx.ai',
          enabled: true,
          color: '#E1306C',
        },
        {
          id: 'ch_telegram',
          platform: 'TELEGRAM',
          title: 'Telegram Bot',
          link: settingsMap['telegram_username'] || 'replyx_support_bot',
          enabled: true,
          color: '#229ED9',
        },
        {
          id: 'ch_x',
          platform: 'X',
          title: 'X (Twitter) DM',
          link: settingsMap['x_handle'] || 'ReplyX_AI',
          enabled: true,
          color: '#000000',
        },
      ];
    }

    return NextResponse.json({
      success: true,
      settings: {
        enabled: isEnabled,
        position: settingsMap['whatsapp_position'] || 'RIGHT',
        title: settingsMap['social_widget_title'] || 'সোশ্যাল মিডিয়া সাপোর্ট',
        subtitle:
          settingsMap['social_widget_subtitle'] ||
          'যেকোনো চ্যানেলে আমাদের সাথে যোগাযোগ করুন, AI দ্রুত উত্তর দেবে:',
        buttonTooltip:
          settingsMap['social_widget_tooltip'] || 'সোশ্যাল মিডিয়ায় চ্যাট করুন',
        singleActionDirect: settingsMap['social_widget_single_direct'] === 'true',
        channels,
        // Legacy fields for backward compatibility
        number: settingsMap['whatsapp_number'] || '+8801521716613',
        message:
          settingsMap['whatsapp_message'] ||
          'আসসালামু আলাইকুম, আমি ReplyX AI সম্পর্কে তথ্য জানতে চাই।',
        instagramUsername: settingsMap['instagram_username'] || 'replyx.ai',
        telegramUsername: settingsMap['telegram_username'] || 'replyx_support_bot',
        xHandle: settingsMap['x_handle'] || 'ReplyX_AI',
        facebookPage: settingsMap['facebook_page'] || 'replyx.ai',
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin social settings:', error);
    return NextResponse.json(
      { success: false, error: 'WhatsApp ও সোশ্যাল মিডিয়া সেটিংস লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('response' in adminAuth) return adminAuth.response;

  try {
    await ensureDatabaseReady();
    const body = await req.json();
    const {
      enabled,
      position,
      title,
      subtitle,
      buttonTooltip,
      singleActionDirect,
      channels,
    } = body;

    const cleanEnabled = Boolean(enabled).toString();
    const cleanPosition = position === 'LEFT' ? 'LEFT' : 'RIGHT';
    const cleanTitle = (title || 'সোশ্যাল মিডিয়া সাপোর্ট').trim();
    const cleanSubtitle = (subtitle || 'যেকোনো চ্যানেলে আমাদের সাথে যোগাযোগ করুন, AI দ্রুত উত্তর দেবে:').trim();
    const cleanTooltip = (buttonTooltip || 'সোশ্যাল মিডিয়ায় চ্যাট করুন').trim();
    const cleanSingleDirect = Boolean(singleActionDirect).toString();

    // Sanitize channels array
    const validChannels: SupportChannel[] = Array.isArray(channels)
      ? channels.map((ch: any, idx: number) => ({
          id: ch.id || `ch_${Date.now()}_${idx}`,
          platform: ch.platform || 'CUSTOM',
          title: (ch.title || 'Support Link').trim(),
          link: (ch.link || '').trim(),
          message: ch.message ? ch.message.trim() : undefined,
          enabled: ch.enabled !== false,
          color: ch.color || undefined,
        }))
      : DEFAULT_CHANNELS;

    // Find whatsapp or other legacy values from channels
    const waCh = validChannels.find((c) => c.platform === 'WHATSAPP');
    const fbCh = validChannels.find((c) => c.platform === 'MESSENGER');
    const igCh = validChannels.find((c) => c.platform === 'INSTAGRAM');
    const tgCh = validChannels.find((c) => c.platform === 'TELEGRAM');
    const xCh = validChannels.find((c) => c.platform === 'X');

    const updates = [
      { key: 'whatsapp_enabled', value: cleanEnabled },
      { key: 'whatsapp_position', value: cleanPosition },
      { key: 'social_widget_title', value: cleanTitle },
      { key: 'social_widget_subtitle', value: cleanSubtitle },
      { key: 'social_widget_tooltip', value: cleanTooltip },
      { key: 'social_widget_single_direct', value: cleanSingleDirect },
      { key: 'social_support_channels', value: JSON.stringify(validChannels) },
      // Update legacy keys so any other modules stay in sync
      { key: 'whatsapp_number', value: waCh?.link || '' },
      { key: 'whatsapp_message', value: waCh?.message || '' },
      { key: 'facebook_page', value: fbCh?.link || '' },
      { key: 'instagram_username', value: igCh?.link || '' },
      { key: 'telegram_username', value: tgCh?.link || '' },
      { key: 'x_handle', value: xCh?.link || '' },
    ];

    for (const item of updates) {
      await prisma.systemSetting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      });
    }

    await logActivity({
      userId: adminAuth.user.id,
      action: 'WHATSAPP_SETTINGS_UPDATED',
      description: `সোশ্যাল ও WhatsApp সাপোর্ট চ্যানেল সেটিংস আপডেট করা হয়েছে (মোট চ্যানেল: ${validChannels.length}, সক্রিয়: ${cleanEnabled})`,
    });

    return NextResponse.json({
      success: true,
      message: 'সোশ্যাল ও WhatsApp সাপোর্ট চ্যানেল সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে!',
      channels: validChannels,
    });
  } catch (error: any) {
    console.error('Error saving WhatsApp settings:', error);
    return NextResponse.json(
      { success: false, error: 'সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
