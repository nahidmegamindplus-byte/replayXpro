'use client';

import React, { useState, useEffect } from 'react';
import {
  X as CloseIcon,
  ExternalLink,
  Phone,
  Mail,
  MessageCircle,
  Send,
  Globe,
  Youtube,
} from 'lucide-react';

export interface SupportChannel {
  id: string;
  platform: string; // 'WHATSAPP' | 'MESSENGER' | 'INSTAGRAM' | 'TELEGRAM' | 'X' | 'PHONE' | 'EMAIL' | 'YOUTUBE' | 'DISCORD' | 'CUSTOM'
  title: string;
  link: string;
  message?: string;
  enabled: boolean;
  color?: string;
}

export interface SocialWidgetSettings {
  enabled: boolean;
  position: 'LEFT' | 'RIGHT';
  title: string;
  subtitle: string;
  buttonTooltip: string;
  singleActionDirect?: boolean;
  channels: SupportChannel[];
}

export default function WhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<SocialWidgetSettings>({
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
  });

  useEffect(() => {
    setMounted(true);

    async function loadSettings() {
      try {
        const res = await fetch('/api/settings/whatsapp');
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            channels:
              Array.isArray(data.settings.channels) && data.settings.channels.length > 0
                ? data.settings.channels
                : prev.channels,
          }));
        }
      } catch (e) {
        // Fallback default
      }
    }

    loadSettings();
  }, []);

  if (!mounted || settings.enabled === false) {
    return null;
  }

  const activeChannels = (settings.channels || []).filter(
    (c) => c.enabled !== false && c.link && c.link.trim().length > 0
  );

  if (activeChannels.length === 0) {
    return null;
  }

  const handleChannelClick = (channel: SupportChannel) => {
    const link = (channel.link || '').trim();
    if (!link) return;

    // Direct HTTP(S) URL
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }

    switch (channel.platform) {
      case 'WHATSAPP': {
        let rawDigits = link.replace(/[^\d]/g, '');
        if (rawDigits.startsWith('01')) {
          rawDigits = '88' + rawDigits;
        }
        const msg = encodeURIComponent(channel.message || 'আসসালামু আলাইকুম');
        const isMobile =
          typeof navigator !== 'undefined' &&
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const url = isMobile
          ? `https://api.whatsapp.com/send?phone=${rawDigits}&text=${msg}`
          : `https://web.whatsapp.com/send?phone=${rawDigits}&text=${msg}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'MESSENGER': {
        const page = link.replace(/^@/, '');
        window.open(`https://m.me/${page}`, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'INSTAGRAM': {
        const user = link.replace(/^@/, '');
        window.open(`https://instagram.com/${user}`, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'TELEGRAM': {
        const bot = link.replace(/^@/, '');
        window.open(`https://t.me/${bot}`, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'X': {
        const handle = link.replace(/^@/, '');
        window.open(`https://x.com/${handle}`, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'PHONE': {
        window.location.href = `tel:${link}`;
        break;
      }
      case 'EMAIL': {
        window.location.href = `mailto:${link}`;
        break;
      }
      case 'YOUTUBE': {
        window.open(`https://youtube.com/${link.replace(/^@/, '')}`, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'DISCORD': {
        window.open(link.startsWith('discord.gg') ? `https://${link}` : `https://discord.gg/${link}`, '_blank', 'noopener,noreferrer');
        break;
      }
      default: {
        const url = link.startsWith('www.') ? `https://${link}` : link.includes('.') ? `https://${link}` : link;
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      }
    }
  };

  const handleMainButtonClick = () => {
    // If only 1 channel exists and single direct action is enabled, trigger directly
    if (activeChannels.length === 1 && settings.singleActionDirect) {
      handleChannelClick(activeChannels[0]);
      return;
    }
    setIsOpen((prev) => !prev);
  };

  const positionClasses =
    settings.position === 'LEFT' ? 'left-5 sm:left-6' : 'right-5 sm:right-6';

  const getChannelStyles = (platform: string) => {
    switch (platform) {
      case 'WHATSAPP':
        return {
          bg: 'bg-emerald-50 hover:bg-emerald-100/90 border-emerald-200/80 text-emerald-800',
          dot: 'bg-emerald-500',
        };
      case 'MESSENGER':
        return {
          bg: 'bg-blue-50 hover:bg-blue-100/90 border-blue-200/80 text-blue-800',
          dot: 'bg-blue-500',
        };
      case 'INSTAGRAM':
        return {
          bg: 'bg-pink-50 hover:bg-pink-100/90 border-pink-200/80 text-pink-800',
          dot: 'bg-pink-500',
        };
      case 'TELEGRAM':
        return {
          bg: 'bg-sky-50 hover:bg-sky-100/90 border-sky-200/80 text-sky-800',
          dot: 'bg-sky-500',
        };
      case 'X':
        return {
          bg: 'bg-slate-100 hover:bg-slate-200/90 border-slate-300 text-slate-900',
          dot: 'bg-slate-800',
        };
      case 'PHONE':
        return {
          bg: 'bg-amber-50 hover:bg-amber-100/90 border-amber-200/80 text-amber-900',
          dot: 'bg-amber-500',
        };
      case 'EMAIL':
        return {
          bg: 'bg-indigo-50 hover:bg-indigo-100/90 border-indigo-200/80 text-indigo-900',
          dot: 'bg-indigo-500',
        };
      case 'YOUTUBE':
        return {
          bg: 'bg-red-50 hover:bg-red-100/90 border-red-200/80 text-red-900',
          dot: 'bg-red-500',
        };
      case 'DISCORD':
        return {
          bg: 'bg-indigo-50 hover:bg-indigo-100/90 border-indigo-200/80 text-indigo-900',
          dot: 'bg-[#5865F2]',
        };
      default:
        return {
          bg: 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800',
          dot: 'bg-indigo-500',
        };
    }
  };

  return (
    <div
      translate="no"
      suppressHydrationWarning
      className={`notranslate fixed bottom-5 sm:bottom-6 z-50 flex flex-col items-end gap-3 ${positionClasses}`}
    >
      {/* Expanded Multi-Channel Tray */}
      {isOpen && (
        <div className="bg-white/98 backdrop-blur-2xl border border-slate-200/90 p-4 sm:p-5 rounded-3xl shadow-2xl w-72 sm:w-80 space-y-3.5 animate-in fade-in zoom-in-95 slide-in-from-bottom-6 duration-200 z-50">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {settings.title || 'সোশ্যাল মিডিয়া সাপোর্ট'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="বন্ধ করুন"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          {settings.subtitle && (
            <p className="text-[11px] text-slate-500 leading-tight">
              {settings.subtitle}
            </p>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
            {activeChannels.map((channel) => {
              const styles = getChannelStyles(channel.platform);
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => handleChannelClick(channel)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all transform active:scale-98 shadow-2xs ${styles.bg}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${styles.dot}`}></span>
                    <span className="truncate">{channel.title}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 shrink-0 opacity-70 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Main Button */}
      <div className="flex items-center gap-3">
        {/* Tooltip */}
        {!isOpen && (
          <div className="hidden sm:block bg-white/95 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 shadow-xl backdrop-blur-md whitespace-nowrap">
            {settings.buttonTooltip || 'সোশ্যাল মিডিয়ায় চ্যাট করুন'}
          </div>
        )}

        <button
          type="button"
          onClick={handleMainButtonClick}
          aria-label={settings.buttonTooltip || 'Omnichannel Social Support'}
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#25D366] via-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-2xl transition-transform duration-300 transform hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
        >
          {/* Pulsing Outer Ring */}
          <span className="absolute inset-0 rounded-full bg-indigo-500 opacity-40 animate-ping pointer-events-none"></span>

          {isOpen ? (
            <CloseIcon className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" />
          ) : (
            <svg className="w-7 h-7 sm:w-8 sm:h-8 fill-current relative z-10" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          )}

          {/* Live Active Status Indicator */}
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
        </button>
      </div>
    </div>
  );
}
