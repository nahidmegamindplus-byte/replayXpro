'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Sparkles,
  ArrowLeft,
  Server,
  Bot,
  Cpu,
  Lock,
  PhoneCall,
  Save,
  CheckCircle2,
  AlignLeft,
  AlignRight,
  MessageSquare,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Eye,
  Globe,
  Mail,
  Share2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export interface SupportChannel {
  id: string;
  platform: string; // 'WHATSAPP' | 'MESSENGER' | 'INSTAGRAM' | 'TELEGRAM' | 'X' | 'PHONE' | 'EMAIL' | 'YOUTUBE' | 'DISCORD' | 'CUSTOM'
  title: string;
  link: string;
  message?: string;
  enabled: boolean;
  color?: string;
}

const PLATFORMS = [
  { id: 'WHATSAPP', name: 'WhatsApp চ্যাট', placeholder: 'যেমন: +8801521716613 বা wa.me লিংক', dotColor: 'bg-emerald-500', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'MESSENGER', name: 'Facebook Messenger', placeholder: 'যেমন: replyx.ai বা https://m.me/replyx.ai', dotColor: 'bg-blue-500', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'INSTAGRAM', name: 'Instagram DM', placeholder: 'যেমন: replyx.ai বা instagram.com/replyx.ai', dotColor: 'bg-pink-500', badgeColor: 'bg-pink-50 text-pink-700 border-pink-200' },
  { id: 'TELEGRAM', name: 'Telegram Bot/Channel', placeholder: 'যেমন: replyx_support_bot বা t.me/replyx', dotColor: 'bg-sky-500', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'X', name: 'X (Twitter) DM', placeholder: 'যেমন: ReplyX_AI বা x.com/ReplyX_AI', dotColor: 'bg-slate-800', badgeColor: 'bg-slate-100 text-slate-900 border-slate-300' },
  { id: 'PHONE', name: 'সরাসরি ফোন কল (Direct Call)', placeholder: 'যেমন: +8801700000000', dotColor: 'bg-amber-500', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'EMAIL', name: 'ইমেইল সাপোর্ট (Email)', placeholder: 'যেমন: support@replyx.ai', dotColor: 'bg-indigo-500', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'YOUTUBE', name: 'YouTube চ্যানেল/ভিডিও', placeholder: 'যেমন: @ReplyXAI বা youtube.com/...', dotColor: 'bg-red-500', badgeColor: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'DISCORD', name: 'Discord কমিউনিটি', placeholder: 'যেমন: discord.gg/replyxai', dotColor: 'bg-[#5865F2]', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'CUSTOM', name: 'কাস্টম ওয়েবসাইট লিংক (Web Link)', placeholder: 'যেমন: https://replyx.ai/support', dotColor: 'bg-slate-600', badgeColor: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export default function AdminSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Widget General Settings Form State
  const [widgetSettings, setWidgetSettings] = useState({
    enabled: true,
    position: 'RIGHT' as 'LEFT' | 'RIGHT',
    title: 'সোশ্যাল মিডিয়া সাপোর্ট',
    subtitle: 'যেকোনো চ্যানেলে আমাদের সাথে যোগাযোগ করুন, AI দ্রুত উত্তর দেবে:',
    buttonTooltip: 'সোশ্যাল মিডিয়ায় চ্যাট করুন',
    singleActionDirect: false,
  });

  // Dynamic Channels State
  const [channels, setChannels] = useState<SupportChannel[]>([
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
  ]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>('/api/admin/settings/whatsapp', { retries: 2 });
      if (data?.success && data.settings) {
        setWidgetSettings({
          enabled: data.settings.enabled ?? true,
          position: data.settings.position || 'RIGHT',
          title: data.settings.title || 'সোশ্যাল মিডিয়া সাপোর্ট',
          subtitle: data.settings.subtitle || 'যেকোনো চ্যানেলে আমাদের সাথে যোগাযোগ করুন, AI দ্রুত উত্তর দেবে:',
          buttonTooltip: data.settings.buttonTooltip || 'সোশ্যাল মিডিয়ায় চ্যাট করুন',
          singleActionDirect: data.settings.singleActionDirect ?? false,
        });

        if (Array.isArray(data.settings.channels) && data.settings.channels.length > 0) {
          setChannels(data.settings.channels);
        }
      }
    } catch (e) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleAddChannel = (platformId = 'CUSTOM') => {
    const preset = PLATFORMS.find((p) => p.id === platformId) || PLATFORMS[0];
    const newChannel: SupportChannel = {
      id: `ch_${Date.now()}`,
      platform: preset.id,
      title: preset.name,
      link: '',
      message: preset.id === 'WHATSAPP' ? 'আসসালামু আলাইকুম, আমি ReplyX AI সম্পর্কে তথ্য জানতে চাই।' : undefined,
      enabled: true,
    };
    setChannels((prev) => [...prev, newChannel]);
    toast.info(`নতুন ${preset.name} অপশন যোগ করা হয়েছে! অনুগ্রহ করে লিংক/নম্বর প্রদান করুন।`);
  };

  const handleRemoveChannel = (id: string) => {
    if (channels.length <= 1) {
      toast.warning('কমপক্ষে ১টি চ্যানেল থাকা আবশ্যক। আপনি চাইলে চ্যানেলটি নিষ্ক্রিয় (OFF) করতে পারেন।');
      return;
    }
    setChannels((prev) => prev.filter((c) => c.id !== id));
    toast.success('চ্যানেল মুছে ফেলা হয়েছে।');
  };

  const handleToggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleUpdateChannel = (id: string, field: keyof SupportChannel, value: any) => {
    setChannels((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [field]: value };
          if (field === 'platform') {
            const platformInfo = PLATFORMS.find((p) => p.id === value);
            if (platformInfo && (!c.title || PLATFORMS.some((p) => p.name === c.title))) {
              updated.title = platformInfo.name;
            }
          }
          return updated;
        }
        return c;
      })
    );
  };

  const handleMoveChannel = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= channels.length) return;
    const updated = [...channels];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setChannels(updated);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...widgetSettings,
        channels,
      };

      const res = await fetch('/api/admin/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'সোশ্যাল মিডিয়া সাপোর্ট সেটিংস সফলভাবে আপডেট হয়েছে!');
      } else {
        toast.error(data.error || 'সেটিংস সেভ করা সম্ভব হয়নি।');
      }
    } catch (e) {
      toast.error('সার্ভারে যোগাযোগ করতে ব্যর্থ হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const activeChannels = channels.filter((c) => c.enabled && c.link.trim().length > 0);

  return (
    <AdminLayout
      title="সিস্টেম আর্কিটেকচার ও সেটিংস"
      subtitle="ReplyX AI প্ল্যাটফর্মের সোশ্যাল সাপোর্ট উইজেট, অমনিচ্যানেল ইন্টিগ্রেশন এবং সিস্টেম সিকিউরিটি ওভারভিউ"
    >
      <div className="max-w-4xl space-y-8">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>অ্যাডমিন ড্যাশবোর্ডে ফিরে যান</span>
          </Link>

          <Link
            href="/admin/ai-settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xs transition-all"
          >
            <Bot className="w-4 h-4" />
            <span>AI ও API সেটিংস</span>
          </Link>
        </div>

        {/* Omnichannel Floating Widget Management Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden text-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-lg shadow-xs">
                💬
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>সোশ্যাল মিডিয়া ও WhatsApp লাইভ সাপোর্ট</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-semibold">
                    Dynamic Omnichannel Widget
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ওয়েবসাইটের ফ্লোটিং সাপোর্টে ১টি বা একাধিক চ্যানেল যুক্ত/মুছে ফেলা এবং লিংক কনফিগার করুন
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  widgetSettings.enabled
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current"></span>
                <span>{widgetSettings.enabled ? 'সক্রিয় (ON)' : 'নিষ্ক্রিয় (OFF)'}</span>
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">সেটিংস লোড হচ্ছে...</div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Master Toggle Switch */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">ফ্লোটিং সোশ্যাল সাপোর্ট বাটন প্রদর্শন</h4>
                  <p className="text-[11px] text-slate-500">
                    এটি অন থাকলে ওয়েবসাইটের স্ক্রিনে ভাসমান সাপোর্ট বাটন এবং চ্যানেল তালিকা স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widgetSettings.enabled}
                    onChange={(e) =>
                      setWidgetSettings({ ...widgetSettings, enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* General Options: Position, Title, Subtitle, Tooltip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
                {/* Floating Position */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    আইকন পজিশন (Position) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setWidgetSettings({ ...widgetSettings, position: 'LEFT' })}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        widgetSettings.position === 'LEFT'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span>নিচে বামে (Left)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWidgetSettings({ ...widgetSettings, position: 'RIGHT' })}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        widgetSettings.position === 'RIGHT'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                      <span>নিচে ডানে (Right)</span>
                    </button>
                  </div>
                </div>

                {/* Floating Button Tooltip */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ফ্লোটিং বাটনের টুলটিপ টেক্সট
                  </label>
                  <input
                    type="text"
                    value={widgetSettings.buttonTooltip}
                    onChange={(e) =>
                      setWidgetSettings({ ...widgetSettings, buttonTooltip: e.target.value })
                    }
                    placeholder="যেমন: সোশ্যাল মিডিয়ায় চ্যাট করুন"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                {/* Widget Card Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    পপআপ কার্ডের শিরোনাম (Title)
                  </label>
                  <input
                    type="text"
                    value={widgetSettings.title}
                    onChange={(e) =>
                      setWidgetSettings({ ...widgetSettings, title: e.target.value })
                    }
                    placeholder="যেমন: সোশ্যাল মিডিয়া সাপোর্ট"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                {/* Widget Subtitle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    পপআপ কার্ডের সাবটাইটেল (Subtitle)
                  </label>
                  <input
                    type="text"
                    value={widgetSettings.subtitle}
                    onChange={(e) =>
                      setWidgetSettings({ ...widgetSettings, subtitle: e.target.value })
                    }
                    placeholder="যেমন: যেকোনো চ্যানেলে আমাদের সাথে যোগাযোগ করুন, AI দ্রুত উত্তর দেবে:"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              {/* Single Channel Direct Action Mode Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h5 className="text-xs font-bold text-slate-900">
                      একক চ্যানেল ডিরেক্ট মোড (Single Channel Direct Mode)
                    </h5>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    যদি মাত্র ১টি চ্যানেল সক্রিয় থাকে, তবে গ্রাহক ফ্লোটিং বাটনে চাপ দিলে সরাসরি সেই লিংকে চলে যাবে (পপআপ ট্রে না খুলে)।
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={widgetSettings.singleActionDirect}
                    onChange={(e) =>
                      setWidgetSettings({
                        ...widgetSettings,
                        singleActionDirect: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Dynamic Channels List Header */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>সাপোর্ট চ্যানেল ও অপশনসমূহ</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
                        মোট: {channels.length} টি ({activeChannels.length} টি সক্রিয়)
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      আপনি চাইলে ১টি অপশনও রাখতে পারেন, অথবা একাধিক অপশন যুক্ত করতে পারেন।
                    </p>
                  </div>

                  {/* Quick Preset Dropdown Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddChannel('WHATSAPP')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddChannel('MESSENGER')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Messenger</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddChannel('CUSTOM')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ নতুন চ্যানেল যোগ করুন</span>
                    </button>
                  </div>
                </div>

                {/* Channels Cards */}
                <div className="space-y-3.5">
                  {channels.map((channel, index) => {
                    const platformInfo =
                      PLATFORMS.find((p) => p.id === channel.platform) || PLATFORMS[0];

                    return (
                      <div
                        key={channel.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          channel.enabled
                            ? 'bg-white border-slate-200/90 shadow-2xs hover:border-indigo-300'
                            : 'bg-slate-50/80 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
                          {/* Channel Badge & Platform Selector */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 font-mono">
                              #{index + 1}
                            </span>

                            <select
                              value={channel.platform}
                              onChange={(e) =>
                                handleUpdateChannel(channel.id, 'platform', e.target.value)
                              }
                              className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              {PLATFORMS.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${platformInfo.badgeColor}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${platformInfo.dotColor}`}
                              ></span>
                              <span>{platformInfo.name}</span>
                            </span>
                          </div>

                          {/* Order Actions & Delete & Toggle */}
                          <div className="flex items-center gap-2 ml-auto">
                            {/* Move Up */}
                            <button
                              type="button"
                              onClick={() => handleMoveChannel(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                              title="উপরে নিন"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>

                            {/* Move Down */}
                            <button
                              type="button"
                              onClick={() => handleMoveChannel(index, 'down')}
                              disabled={index === channels.length - 1}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                              title="নিচে নিন"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>

                            {/* Toggle On/Off */}
                            <button
                              type="button"
                              onClick={() => handleToggleChannel(channel.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                                channel.enabled
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                              }`}
                            >
                              {channel.enabled ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
                            </button>

                            {/* Delete Channel */}
                            <button
                              type="button"
                              onClick={() => handleRemoveChannel(channel.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Input Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Channel Title */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              চ্যানেলের নাম / লেবেল (Button Title) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={channel.title}
                              onChange={(e) =>
                                handleUpdateChannel(channel.id, 'title', e.target.value)
                              }
                              placeholder="যেমন: WhatsApp চ্যাট"
                              className="w-full px-3 py-2 bg-slate-50/60 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                            />
                          </div>

                          {/* Channel Link / Target */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              লিংক / ইউজারনেম / নম্বর (Link / Value) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={channel.link}
                              onChange={(e) =>
                                handleUpdateChannel(channel.id, 'link', e.target.value)
                              }
                              placeholder={platformInfo.placeholder}
                              className="w-full px-3 py-2 bg-slate-50/60 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-600 focus:bg-white"
                            />
                          </div>

                          {/* WhatsApp Pre-filled message (optional) */}
                          {channel.platform === 'WHATSAPP' && (
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                WhatsApp প্রি-ফিল্ড মেসেজ (Default Message)
                              </label>
                              <input
                                type="text"
                                value={channel.message || ''}
                                onChange={(e) =>
                                  handleUpdateChannel(channel.id, 'message', e.target.value)
                                }
                                placeholder="যেমন: আসসালামু আলাইকুম, আমি তথ্য জানতে চাই..."
                                className="w-full px-3 py-2 bg-slate-50/60 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">
                      ওয়েবসাইট লাইভ প্রিভিউ (Live Preview)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    ভিজিটরদের সামনে যেভাবে রেন্ডার হবে
                  </span>
                </div>

                <div className="flex justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                  <div className="w-72 bg-white text-slate-900 p-4 rounded-2xl shadow-xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        {widgetSettings.title || 'সোশ্যাল মিডিয়া সাপোর্ট'}
                      </span>
                    </div>

                    {widgetSettings.subtitle && (
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {widgetSettings.subtitle}
                      </p>
                    )}

                    <div className="space-y-1.5">
                      {activeChannels.length === 0 ? (
                        <div className="py-4 text-center text-xs text-rose-500">
                          কোনো চ্যানেল সক্রিয় নেই!
                        </div>
                      ) : (
                        activeChannels.map((c) => {
                          const p = PLATFORMS.find((x) => x.id === c.platform) || PLATFORMS[0];
                          return (
                            <div
                              key={c.id}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold ${p.badgeColor}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${p.dotColor}`}></span>
                                <span className="truncate">{c.title}</span>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0 ml-1.5" />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সকল সেটিংস সেভ করুন'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* System Health Overview Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shadow-xs">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">সিস্টেম সিকিউরিটি ও ডাটাবেজ স্ট্যাটাস</h3>
                <p className="text-xs text-slate-500">রিয়েল-টাইম আর্কিটেকচার ও এনক্রিপশন স্পেসিফিকেশন</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>100% Operational</span>
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-slate-900">ডাটাবেজ ইঞ্জিন:</span>
              </div>
              <span className="font-mono text-slate-700">SQLite (Local) / PostgreSQL (Cloud via Prisma ORM)</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-slate-900">টোকেন ও API কী এনক্রিপশন:</span>
              </div>
              <span className="font-mono text-emerald-700 font-semibold">AES-256-GCM at Rest</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-slate-900">সক্রিয় AI প্রোভাইডার্স:</span>
              </div>
              <span className="font-mono text-purple-700 font-semibold">DeepSeek (V3/R1), Google Gemini, OpenAI</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
