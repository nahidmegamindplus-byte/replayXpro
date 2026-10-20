import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db-init';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    let channels = [];
    if (settingsMap['social_support_channels']) {
      try {
        const parsed = JSON.parse(settingsMap['social_support_channels']);
        if (Array.isArray(parsed) && parsed.length > 0) {
          channels = parsed;
        }
      } catch (_) {}
    }

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
    return NextResponse.json(
      {
        success: true,
        settings: {
          enabled: true,
          position: 'RIGHT',
          title: 'সোশ্যাল মিডিয়া সাপোর্ট',
          subtitle: 'যেকোনো চ্যানেলে আমাদের সাথে যোগাযোগ করুন, AI দ্রুত উত্তর দেবে:',
          buttonTooltip: 'সোশ্যাল মিডিয়ায় চ্যাট করুন',
          singleActionDirect: false,
          channels: [
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
          ],
          number: '+8801521716613',
          message: 'আসসালামু আলাইকুম, আমি ReplyX AI সম্পর্কে তথ্য জানতে চাই।',
          instagramUsername: 'replyx.ai',
          telegramUsername: 'replyx_support_bot',
          xHandle: 'ReplyX_AI',
          facebookPage: 'replyx.ai',
        },
      },
      { status: 200 }
    );
  }
}
