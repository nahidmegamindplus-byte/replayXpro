'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Plus,
  Check,
  Copy,
  Trash2,
  Settings,
  RefreshCw,
  ExternalLink,
  X as CloseIcon,
  Globe,
  Bot,
  ShoppingBag,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Key,
  Hash,
  ArrowRight,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Eye,
  MessageSquareReply,
  Repeat,
  Calendar,
  RotateCcw,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

// Channel Definitions & Branding
const CHANNELS = [
  { id: 'ALL', name: 'সকল চ্যানেল', color: 'bg-indigo-600' },
  { id: 'FACEBOOK', name: 'Facebook', color: 'bg-[#1877F2]' },
  { id: 'WHATSAPP', name: 'WhatsApp', color: 'bg-[#25D366]' },
  { id: 'INSTAGRAM', name: 'Instagram', color: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]' },
  { id: 'X', name: 'X (Twitter)', color: 'bg-black' },
  { id: 'TELEGRAM', name: 'Telegram', color: 'bg-[#229ED9]' },
];

// Step-by-Step Channel Connection Guides
const CONNECTION_GUIDES: Record<string, {
  title: string;
  portalUrl: string;
  portalLabel: string;
  steps: { title: string; desc: string; tip?: string }[];
  idLabel: string;
  idPlaceholder: string;
  idHelp: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  tokenHelp: string;
}> = {
  FACEBOOK: {
    title: 'Facebook Messenger কানেক্ট করার সহজ গাইড',
    portalUrl: 'https://developers.facebook.com/apps',
    portalLabel: 'Meta Developers Portal ↗',
    steps: [
      {
        title: '১. Meta App তৈরি করুন',
        desc: 'developers.facebook.com এ লগইন করে একটি "Business" টাইপ অ্যাপ তৈরি করুন।',
      },
      {
        title: '২. Messenger যোগ করুন',
        desc: 'অ্যাপ ড্যাশবোর্ডে "Add Product" থেকে "Messenger" সেটআপ করুন।',
      },
      {
        title: '৩. Page Access Token জেনারেট করুন',
        desc: 'Messenger > Settings > Page Access Tokens সেকশনে আপনার পেজ সিলেক্ট করে "Generate Token" এ ক্লিক করুন।',
        tip: 'টোকেনটি কপি করে নিচে পেস্ট করুন।',
      },
      {
        title: '৪. পেজ আইডি (Page ID) সংগ্রহ করুন',
        desc: 'আপনার ফেসবুক পেজের About সেকশন থেকে Page ID টি কপি করুন।',
      },
      {
        title: '৫. Webhook কনফিগারেশন',
        desc: 'চ্যানেল সেভ করার পর প্রদর্শিত Webhook URL ও Verify Token মেটা পোর্টালে দিয়ে messages সাবস্ক্রাইব করুন।',
      },
    ],
    idLabel: 'Facebook Page ID *',
    idPlaceholder: 'যেমন: 104928374628102',
    idHelp: 'পেজের About সেকশন অথবা Meta Business Suite থেকে Page ID পাবেন।',
    tokenLabel: 'Page Access Token *',
    tokenPlaceholder: 'EAAB...',
    tokenHelp: 'developers.facebook.com > Messenger > Page Access Tokens থেকে জেনারেট করা টোকেন।',
  },
  WHATSAPP: {
    title: 'WhatsApp Cloud API কানেক্ট করার সহজ গাইড',
    portalUrl: 'https://developers.facebook.com/apps',
    portalLabel: 'Meta Developers Portal ↗',
    steps: [
      {
        title: '১. WhatsApp প্রোডাক্ট সেটআপ',
        desc: 'developers.facebook.com এ আপনার Business App-এ "WhatsApp" প্রোডাক্টটি যুক্ত করুন।',
      },
      {
        title: '২. Phone Number ID সংগ্রহ',
        desc: 'WhatsApp > API Setup পেজে যান। সেখানে "Phone number ID" দেখতে পাবেন (এটি ফোন নম্বর নয়, মেটার দেয়া ID)।',
        tip: 'যেমন: 109283746592019',
      },
      {
        title: '৩. Access Token কপি করুন',
        desc: 'API Setup পেজের "Temporary access token" ব্যবহার করতে পারেন, অথবা স্থায়ী ব্যবহারের জন্য Business Settings > System Users থেকে Permanent Token তৈরি করুন।',
      },
      {
        title: '৪. Webhook সেট করুন',
        desc: 'চ্যানেল সেভ হওয়ার পর প্রদত্ত Webhook URL এবং Verify Token মেটার WhatsApp Configuration-এ পেস্ট করে "messages" ফিল্ড চালু করুন।',
      },
    ],
    idLabel: 'WhatsApp Phone Number ID *',
    idPlaceholder: 'যেমন: 109283746592019',
    idHelp: 'Meta App > WhatsApp > API Setup পেজে "Phone number ID" শিরোনামে এটি পাবেন।',
    tokenLabel: 'WhatsApp Cloud API Access Token *',
    tokenPlaceholder: 'EAAB...',
    tokenHelp: 'API Setup পেজের Access Token অথবা System User থেকে তৈরি Permanent Token দিন।',
  },
  INSTAGRAM: {
    title: 'Instagram Direct (DM) কানেক্ট করার গাইড',
    portalUrl: 'https://developers.facebook.com/apps',
    portalLabel: 'Meta Developers Portal ↗',
    steps: [
      {
        title: '১. Instagram বিজনেস অ্যাকাউন্ট লিংক করুন',
        desc: 'আপনার Instagram প্রফেশনাল/বিজনেস অ্যাকাউন্টটি আপনার Facebook Page-এর সাথে সংযুক্ত আছে কিনা নিশ্চিত করুন।',
      },
      {
        title: '২. Instagram Graph API যোগ করুন',
        desc: 'Meta Developer App-এ গিয়ে "Instagram Graph API" পণ্যটি সেটআপ করুন।',
      },
      {
        title: '৩. Instagram Account ID কপি করুন',
        desc: 'Meta App Dashboard থেকে আপনার Instagram Business Account ID টি কপি করুন।',
      },
      {
        title: '৪. Access Token তৈরি ও Webhook সেট',
        desc: 'Instagram Messaging পারমিশনসহ Access Token তৈরি করে নিচে দিন এবং Webhook এ messages সাবস্ক্রাইব করুন।',
      },
    ],
    idLabel: 'Instagram Business Account ID *',
    idPlaceholder: 'যেমন: 17841400123456789',
    idHelp: 'Meta Developer App অথবা Graph API Explorer থেকে Instagram Business ID পাবেন।',
    tokenLabel: 'Instagram Graph API Access Token *',
    tokenPlaceholder: 'EAAB...',
    tokenHelp: 'Instagram মেসেজিং পারমিশনসহ (instagram_basic, instagram_manage_messages) টোকেন দিন।',
  },
  X: {
    title: 'X (Twitter) Direct Messages কানেক্ট করার গাইড',
    portalUrl: 'https://developer.x.com',
    portalLabel: 'X Developer Portal ↗',
    steps: [
      {
        title: '১. X Developer Portal-এ যান',
        desc: 'developer.x.com এ গিয়ে Developer Account দিয়ে লগইন করুন এবং একটি Project ও App তৈরি করুন।',
      },
      {
        title: '২. User Authentication Settings অন করুন',
        desc: 'App Settings এ গিয়ে User Authentication অন করে Direct message ও Read and write পারমিশন দিন।',
      },
      {
        title: '৩. Bearer Token তৈরি করুন',
        desc: 'Keys and Tokens ট্যাবে গিয়ে Bearer Token টি কপি করুন।',
      },
      {
        title: '৪. Account Handle দিন',
        desc: 'আপনার X অ্যাকাউন্টের ইউজারনেম (@username) প্রদান করুন।',
      },
    ],
    idLabel: 'X User ID বা Account Handle *',
    idPlaceholder: 'যেমন: @MyShopBD অথবা 14928374',
    idHelp: 'আপনার X (টুইটার) হ্যান্ডেল (@username) অথবা X Account ID প্রদান করুন।',
    tokenLabel: 'X Bearer Token / API Token *',
    tokenPlaceholder: 'AAAAAAAAAAAAAAAAAAAAA...',
    tokenHelp: 'X Developer Portal > App > Keys and Tokens থেকে প্রাপ্ত Bearer Token দিন।',
  },
  TELEGRAM: {
    title: 'Telegram Bot কানেক্ট করার গাইড (মাত্র ১ মিনিট!)',
    portalUrl: 'https://t.me/BotFather',
    portalLabel: 'Telegram @BotFather খুলুন ↗',
    steps: [
      {
        title: '১. Telegram এ @BotFather ওপেন করুন',
        desc: 'Telegram অ্যাপে গিয়ে সার্চ করুন @BotFather অথবা উপরের বাটনে ক্লিক করে সরাসরি চ্যাট খুলুন।',
      },
      {
        title: '২. নতুন বট তৈরি করুন',
        desc: 'চ্যাটে /newbot লিখে সেন্ড করুন। এরপর বটের একটি নাম (যেমন: My Shop Support) এবং একটি ইউজারনেম দিন যা _bot দিয়ে শেষ হবে (যেমন: myshop_bd_bot)।',
      },
      {
        title: '৩. HTTP API Token কপি করুন',
        desc: '@BotFather আপনাকে একটি "HTTP API Access Token" প্রদান করবে (যেমন: 123456789:ABCdefGhI...)।',
        tip: 'টোকেনটি কপি করে নিচের বক্সে পেস্ট করুন।',
      },
      {
        title: '৪. স্বয়ংক্রিয় কানেকশন!',
        desc: 'টোকেন দিয়ে সেভ করলেই ReplyX AI স্বয়ংক্রিয়ভাবে Telegram Webhook কানেক্ট করে দেবে। কোনো ম্যানুয়াল সেটআপের ঝামেলা নেই!',
      },
    ],
    idLabel: 'Telegram Bot Username (ঐচ্ছিক)',
    idPlaceholder: 'যেমন: @myshop_support_bot (খালি রাখলে স্বয়ংক্রিয়ভাবে ডিটেক্ট হবে)',
    idHelp: 'টোকেন প্রদান করলে বটের আইডি ও ইউজারনেম স্বয়ংক্রিয়ভাবে ডিটেক্ট হবে। চাইলে সরাসরি ইউজারনেমও দিতে পারেন।',
    tokenLabel: 'Telegram Bot Token (HTTP API Token) *',
    tokenPlaceholder: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ',
    tokenHelp: '@BotFather থেকে প্রাপ্ত সম্পূর্ণ API Token টি কপি করে এখানে পেস্ট করুন।',
  },
};

function ChannelIcon({ channel, size = 'md' }: { channel?: string; size?: 'sm' | 'md' | 'lg' }) {
  const ch = (channel || 'FACEBOOK').toUpperCase();
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  const containerClass =
    size === 'sm'
      ? 'w-7 h-7 rounded-lg'
      : size === 'lg'
      ? 'w-12 h-12 rounded-xl'
      : 'w-10 h-10 rounded-xl';

  if (ch === 'WHATSAPP') {
    return (
      <div className={`${containerClass} bg-[#25D366]/15 text-[#25D366] flex items-center justify-center border border-[#25D366]/30 shrink-0`}>
        <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      </div>
    );
  }

  if (ch === 'INSTAGRAM') {
    return (
      <div className={`${containerClass} bg-pink-500/15 text-pink-400 flex items-center justify-center border border-pink-500/30 shrink-0`}>
        <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </div>
    );
  }

  if (ch === 'X') {
    return (
      <div className={`${containerClass} bg-gray-700/30 text-white flex items-center justify-center border border-gray-600/40 shrink-0`}>
        <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
    );
  }

  if (ch === 'TELEGRAM') {
    return (
      <div className={`${containerClass} bg-[#229ED9]/15 text-[#229ED9] flex items-center justify-center border border-[#229ED9]/30 shrink-0`}>
        <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.37 3.73-1.37.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`${containerClass} bg-[#1877F2]/15 text-[#1877F2] flex items-center justify-center border border-[#1877F2]/30 shrink-0`}>
      <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.909 1.455 5.503 3.734 7.159V22l3.447-1.892c.905.251 1.867.388 2.819.388 5.523 0 10-4.145 10-9.238C22 6.145 17.523 2 12 2zm1.054 12.443l-2.613-2.787-5.099 2.787 5.608-5.952 2.68 2.787 5.032-2.787-5.608 5.952z" />
      </svg>
    </div>
  );
}

export default function PagesManagementPage() {
  const toast = useToast();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showGuidebook, setShowGuidebook] = useState(false);
  const [showModalGuide, setShowModalGuide] = useState(true);

  // Form State for Add Channel
  const [addForm, setAddForm] = useState({
    channel: 'FACEBOOK',
    pageName: '',
    facebookPageId: '',
    channelIdentifier: '',
    pageAccessToken: '',
    replyLanguage: 'AUTO',
    replyStyle: 'FRIENDLY',
    aiInstructions: '',
  });

  // Form State for Edit Channel
  const [editForm, setEditForm] = useState<any>({});

  const fetchPages = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ success: boolean; pages?: any[]; error?: string }>('/api/pages', { retries: 2 });
      if (data?.success && Array.isArray(data.pages)) {
        setPages(data.pages);
      }
    } catch (_) {
      // Safe fallback handled silently by apiFetch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const getDisplayWebhookUrl = (channel: string, serverUrl?: string | null) => {
    if (typeof window !== 'undefined' && window.location.origin) {
      const endpoint = channel.toLowerCase();
      if (
        !serverUrl ||
        serverUrl.includes('localhost') ||
        serverUrl.includes('127.0.0.1') ||
        (!serverUrl.includes('ngrok') && !serverUrl.includes('trycloudflare') && !serverUrl.includes('loca.lt'))
      ) {
        return `${window.location.origin}/api/webhooks/${endpoint}`;
      }
      return serverUrl;
    }
    return serverUrl || `https://yourdomain.com/api/webhooks/${channel.toLowerCase()}`;
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('ক্লিপবোর্ডে কপি করা হয়েছে!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...addForm,
        channelIdentifier: addForm.channelIdentifier || addForm.facebookPageId,
      };

      const data = await apiFetch<any>('/api/pages', {
        method: 'POST',
        body: JSON.stringify(payload),
        retries: 1,
      });

      if (!data?.success) {
        toast.error(data?.error || 'চ্যানেল যুক্ত করতে ব্যর্থ হয়েছে।');
        setSaving(false);
        return;
      }

      toast.success(data.message || 'চ্যানেল সফলভাবে সংযুক্ত হয়েছে!');
      setShowAddModal(false);
      setAddForm({
        channel: 'FACEBOOK',
        pageName: '',
        facebookPageId: '',
        channelIdentifier: '',
        pageAccessToken: '',
        replyLanguage: 'AUTO',
        replyStyle: 'FRIENDLY',
        aiInstructions: '',
      });
      fetchPages();
    } catch (_) {
      toast.error('চ্যানেল যুক্ত করার প্রক্রিয়ায় সাময়িক বিঘ্ন ঘটেছে। আবার চেষ্টা করুন।');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (pageId: string) => {
    setTestingId(pageId);
    try {
      const data = await apiFetch<any>(`/api/pages/${pageId}/test`, {
        method: 'POST',
        retries: 1,
      });

      if (data?.success) {
        toast.success(data.message || 'চ্যানেল সফলভাবে connected!');
      } else {
        toast.error(data?.error || 'সংযোগ পরীক্ষা ব্যর্থ হয়েছে।');
      }
      fetchPages();
    } catch (_) {
      toast.error('কানেকশন টেস্ট সম্পন্ন হতে পারেনি।');
    } finally {
      setTestingId(null);
    }
  };

  const [runningFollowUpId, setRunningFollowUpId] = useState<string | null>(null);

  const handleTriggerFollowUp = async (pageId: string) => {
    setRunningFollowUpId(pageId);
    try {
      const data = await apiFetch<any>(`/api/cron/follow-up?pageId=${pageId}`, {
        method: 'POST',
        retries: 1,
      });
      if (data?.success) {
        if (data.sentCount > 0) {
          toast.success(data.message || `সফল! ${data.sentCount} টি গ্রাহককে ফলো-আপ মেসেজ পাঠানো হয়েছে।`);
        } else {
          toast.info(data.message || 'এখনো কোনো গ্রাহকের অপেক্ষা সময় পার হয়নি।');
        }
      } else {
        toast.error(data?.error || 'ফলো-আপ চালাতে সমস্যা হয়েছে।');
      }
      fetchPages();
    } catch (_) {
      toast.error('ফলো-আপ প্রক্রিয়ায় সংযোগ পাওয়া যায়নি।');
    } finally {
      setRunningFollowUpId(null);
    }
  };

  const openEditModal = (page: any) => {
    setSelectedPage(page);
    setEditForm({
      channel: page.channel || 'FACEBOOK',
      pageName: page.pageName || '',
      facebookPageId: page.facebookPageId || '',
      channelIdentifier: page.channelIdentifier || page.facebookPageId || '',
      pageAccessToken: '',
      verifyToken: page.verifyToken || '',
      replyDelaySeconds: page.replyDelaySeconds !== undefined ? page.replyDelaySeconds : 3,
      connectionStatus: page.connectionStatus || 'PENDING',
      autoReplyEnabled: page.autoReplyEnabled ?? true,
      humanHandoffEnabled: page.humanHandoffEnabled ?? true,
      replyLanguage: page.replyLanguage || 'AUTO',
      replyStyle: page.replyStyle || 'FRIENDLY',
      productImageReply: page.productImageReply ?? true,
      maxImagesPerConversation: page.maxImagesPerConversation !== undefined ? page.maxImagesPerConversation : 2,
      maxImagesPerReply: page.maxImagesPerReply !== undefined ? page.maxImagesPerReply : 1,
      orderDetection: page.orderDetection ?? true,
      voiceProcessing: page.voiceProcessing ?? true,
      imageUnderstanding: page.imageUnderstanding ?? true,
      followUpEnabled: page.followUpEnabled ?? false,
      followUpWaitMinutes: page.followUpWaitMinutes !== undefined ? page.followUpWaitMinutes : 30,
      followUpMessage: page.followUpMessage || '',
      followUpOnlySeen: page.followUpOnlySeen ?? false,
      followUpMaxCount: page.followUpMaxCount !== undefined ? page.followUpMaxCount : 1,
      followUpFrequency: page.followUpFrequency || 'ONCE',
      followUpIntervalHours: page.followUpIntervalHours !== undefined ? page.followUpIntervalHours : 24,
      aiInstructions: page.aiInstructions || '',
      extraConfig: page.extraConfig || '',
    });
    setShowEditModal(true);
  };

  const handleUpdatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPage) return;
    setSaving(true);

    try {
      const data = await apiFetch<any>(`/api/pages/${selectedPage.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
        retries: 1,
      });

      if (!data?.success) {
        toast.error(data?.error || 'চ্যানেল আপডেট করতে ব্যর্থ হয়েছে।');
        setSaving(false);
        return;
      }

      toast.success(data.message || 'চ্যানেল সেটিংস সফলভাবে আপডেট হয়েছে!');
      setShowEditModal(false);
      fetchPages();
    } catch (_) {
      toast.error('চ্যানেল আপডেট প্রক্রিয়ায় সাময়িক বিঘ্ন ঘটেছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (pageId: string, name: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${name}" চ্যানেলটি মুছে ফেলতে চান? এতে সম্পর্কিত মেসেজ মুছে যেতে পারে।`)) {
      return;
    }

    try {
      const data = await apiFetch<any>(`/api/pages/${pageId}`, {
        method: 'DELETE',
        retries: 1,
      });

      if (data?.success) {
        toast.success('চ্যানেল সফলভাবে মুছে ফেলা হয়েছে!');
        fetchPages();
      } else {
        toast.error(data?.error || 'মুছে ফেলতে ব্যর্থ হয়েছে।');
      }
    } catch (_) {
      toast.error('মুছে ফেলার প্রক্রিয়ায় ত্রুটি হয়েছে।');
    }
  };

  const filteredPages =
    activeFilter === 'ALL'
      ? pages
      : pages.filter((p) => (p.channel || 'FACEBOOK').toUpperCase() === activeFilter);

  const currentGuide = CONNECTION_GUIDES[addForm.channel] || CONNECTION_GUIDES.FACEBOOK;

  return (
    <DashboardLayout
      title="সোশ্যাল মিডিয়া ও চ্যানেল"
      subtitle="Facebook, WhatsApp, Instagram, X এবং Telegram AI অটোমেশন"
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full overflow-hidden">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/80 p-6 rounded-2xl border border-indigo-100 shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                সোশ্যাল মিডিয়া ও চ্যানেল সমূহ
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Facebook Messenger, WhatsApp, Instagram, X (Twitter) এবং Telegram এর স্বয়ংক্রিয় AI কানেক্ট ও পরিচালনা করুন।
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setShowGuidebook(!showGuidebook)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold transition-colors shadow-2xs"
            >
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>{showGuidebook ? 'গাইডবুক বন্ধ' : 'কানেকশন গাইডবুক'}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all transform active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন চ্যানেল যুক্ত করুন</span>
            </button>
          </div>
        </div>

        {/* Expandable Quick Connection Guidebook Banner */}
        {showGuidebook && (
          <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    সহজ চ্যানেল কানেকশন গাইডবুক (Step-by-Step)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    প্রতিটি প্ল্যাটফর্মের টোকেন ও আইডি পাওয়ার সহজ নিয়মাবলী
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuidebook(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {Object.entries(CONNECTION_GUIDES).map(([key, guide]) => (
                <div
                  key={key}
                  className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-indigo-200 transition-colors shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <ChannelIcon channel={key} size="sm" />
                        <span className="text-xs font-bold text-slate-800">{key}</span>
                      </div>
                      <a
                        href={guide.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5"
                      >
                        <span>{guide.portalLabel}</span>
                      </a>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {guide.steps.slice(0, 3).map((st, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-slate-700">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] text-slate-600 leading-tight">
                            {st.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setAddForm((prev) => ({ ...prev, channel: key }));
                      setShowGuidebook(false);
                      setShowAddModal(true);
                    }}
                    className="mt-3 w-full py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[11px] font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <span>কানেক্ট করুন</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channel Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {CHANNELS.map((ch) => {
            const count =
              ch.id === 'ALL'
                ? pages.length
                : pages.filter((p) => (p.channel || 'FACEBOOK').toUpperCase() === ch.id).length;
            const isActive = activeFilter === ch.id;

            return (
              <button
                key={ch.id}
                onClick={() => setActiveFilter(ch.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs border border-indigo-500'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <span>{ch.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Channels Grid / Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-slate-500 text-sm">চ্যানেল তথ্য লোড হচ্ছে...</p>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-100">
              <Globe className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              কোনো {activeFilter !== 'ALL' ? activeFilter : ''} চ্যানেল সংযুক্ত নেই
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
              আপনার ব্যবসা প্রসারিত করতে WhatsApp, Instagram, X, Telegram অথবা Facebook পেজ সংযুক্ত করে অটো-রিপ্লাই ও অর্ডার গ্রহণ শুরু করুন।
            </p>
            <button
              onClick={() => {
                setAddForm((prev) => ({
                  ...prev,
                  channel: activeFilter === 'ALL' ? 'FACEBOOK' : activeFilter,
                }));
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>চ্যানেল সংযুক্ত করুন</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0">
            {filteredPages.map((page) => {
              const currentChannel = (page.channel || 'FACEBOOK').toUpperCase();
              const isTesting = testingId === page.id;
              const webhookUrl = getDisplayWebhookUrl(currentChannel, page.webhookUrl);

              return (
                <div
                  key={page.id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all relative overflow-hidden group min-w-0 max-w-full"
                >
                  <div className="min-w-0">
                    {/* Header Info */}
                    <div className="flex items-start justify-between gap-3 mb-3.5 min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ChannelIcon channel={currentChannel} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="text-base font-bold text-slate-900 truncate">
                              {page.pageName}
                            </h3>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                              {currentChannel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                            ID: {page.facebookPageId}
                            {page.pageUsername && ` • @${page.pageUsername}`}
                          </p>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            page.connectionStatus === 'CONNECTED'
                              ? 'bg-emerald-500 animate-pulse'
                              : page.connectionStatus === 'PENDING'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            page.connectionStatus === 'CONNECTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : page.connectionStatus === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {page.connectionStatus === 'CONNECTED'
                            ? 'সক্রিয় (Connected)'
                            : page.connectionStatus === 'PENDING'
                            ? 'অযাচাইকৃত (টেস্ট করুন)'
                            : page.connectionStatus === 'TOKEN_EXPIRED'
                            ? 'টোকেন ত্রুটি (Disconnected)'
                            : 'নিষ্ক্রিয় (Disconnected)'}
                        </span>
                      </div>
                    </div>

                    {/* Stats Pill Row */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 mb-3.5 bg-slate-50/70 rounded-xl px-2.5">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-500 block">কথোপকথন</span>
                        <span className="text-sm font-bold text-slate-900">
                          {page.counts?.conversations || 0}
                        </span>
                      </div>
                      <div className="text-center border-x border-slate-200/60">
                        <span className="text-[10px] text-slate-500 block">অর্ডার</span>
                        <span className="text-sm font-bold text-emerald-600">
                          {page.counts?.orders || 0}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-slate-500 block">পণ্য সংখ্যা</span>
                        <span className="text-sm font-bold text-indigo-600">
                          {page.counts?.products || 0}
                        </span>
                      </div>
                    </div>

                    {/* Webhook & Verify Token Box */}
                    <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 text-xs mb-3.5 min-w-0">
                      <div className="min-w-0">
                        <span className="text-slate-600 block mb-1 text-[11px] font-medium">
                          Webhook Callback URL:
                        </span>
                        <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 min-w-0 shadow-2xs">
                          <span className="truncate pr-2 min-w-0 flex-1">{webhookUrl}</span>
                          <button
                            onClick={() => handleCopy(webhookUrl, `url-${page.id}`)}
                            className="text-slate-400 hover:text-slate-700 shrink-0 p-0.5 ml-1"
                            title="Copy URL"
                          >
                            {copiedKey === `url-${page.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {currentChannel !== 'TELEGRAM' && (
                        <div className="min-w-0">
                          <span className="text-slate-600 block mb-1 text-[11px] font-medium">
                            Verify Token:
                          </span>
                          <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 min-w-0 shadow-2xs">
                            <span className="truncate pr-2 min-w-0 flex-1">{page.verifyToken}</span>
                            <button
                              onClick={() => handleCopy(page.verifyToken, `tok-${page.id}`)}
                              className="text-slate-400 hover:text-slate-700 shrink-0 p-0.5 ml-1"
                              title="Copy Token"
                            >
                              {copiedKey === `tok-${page.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feature Indicators */}
                    <div className="flex flex-wrap gap-1.5 text-[10px] mb-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md flex items-center gap-1 font-medium ${
                          page.autoReplyEnabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <Bot className="w-3 h-3" />
                        AI রিপ্লাই {page.autoReplyEnabled ? 'অন' : 'অফ'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md flex items-center gap-1 font-medium ${
                          page.orderDetection
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <ShoppingBag className="w-3 h-3" />
                        অর্ডার ক্যাপচার
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                        ভাষা: {page.replyLanguage}
                      </span>
                      {page.followUpEnabled && (
                        <span className="px-2 py-0.5 rounded-md flex items-center gap-1 font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          ফলো-আপ ({page.followUpFrequency === 'DAILY' ? 'প্রতিদিন' : page.followUpFrequency === 'CUSTOM_INTERVAL' ? `${page.followUpIntervalHours || 24}ঘ পর` : '১ বার'})
                        </span>
                      )}
                      {page.productImageReply && (
                        <span className="px-2 py-0.5 rounded-md flex items-center gap-1 font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <ImageIcon className="w-3 h-3 text-blue-600" />
                          ছবি: {page.maxImagesPerConversation === 0 ? 'সীমাহীন' : `${page.maxImagesPerConversation ?? 2} বার`} • একবারে {page.maxImagesPerReply === 0 ? 'সব' : `${page.maxImagesPerReply ?? 1}টি`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleTestConnection(page.id)}
                        disabled={isTesting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                        <span>{isTesting ? 'টেস্ট হচ্ছে...' : 'কানেকশন টেস্ট'}</span>
                      </button>

                      {page.followUpEnabled && (
                        <button
                          onClick={() => handleTriggerFollowUp(page.id)}
                          disabled={runningFollowUpId === page.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors disabled:opacity-50"
                          title="নির্ধারিত গ্রাহকদের এখনই ফলো-আপ পাঠান"
                        >
                          <Clock className={`w-3.5 h-3.5 text-amber-600 ${runningFollowUpId === page.id ? 'animate-spin' : ''}`} />
                          <span>{runningFollowUpId === page.id ? 'চেক হচ্ছে...' : 'ফলো-আপ রান'}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(page)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors border border-slate-200/80"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>সেটিংস</span>
                      </button>
                      <button
                        onClick={() => handleDeletePage(page.id, page.pageName)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Channel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Channel Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl relative my-auto max-h-[92vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <ChannelIcon channel={addForm.channel} size="sm" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-tight">
                      নতুন চ্যানেল সংযুক্ত করুন
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      নিচের ধাপে ধাপে গাইড দেখে আপনার অ্যাকাউন্টটি ১ ক্লিকে কানেক্ট করুন
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body Scrollable */}
              <div className="overflow-y-auto p-5 space-y-4 scrollbar-thin flex-1 bg-white">
                {/* Platform Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    সোশ্যাল প্ল্যাটফর্ম নির্বাচন করুন *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'FACEBOOK', label: 'Facebook Page', icon: 'FACEBOOK' },
                      { id: 'WHATSAPP', label: 'WhatsApp Business', icon: 'WHATSAPP' },
                      { id: 'INSTAGRAM', label: 'Instagram Direct', icon: 'INSTAGRAM' },
                      { id: 'X', label: 'X (Twitter)', icon: 'X' },
                      { id: 'TELEGRAM', label: 'Telegram Bot', icon: 'TELEGRAM' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAddForm({ ...addForm, channel: item.id })}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          addForm.channel === item.id
                            ? 'border-indigo-600 bg-indigo-50/90 text-indigo-700 shadow-xs ring-2 ring-indigo-500/10'
                            : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <ChannelIcon channel={item.id} size="sm" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step-by-Step Connection Guide Box */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 overflow-hidden">
                  <div
                    onClick={() => setShowModalGuide(!showModalGuide)}
                    className="p-3 bg-indigo-50/80 flex items-center justify-between cursor-pointer select-none border-b border-indigo-100"
                  >
                    <div className="flex items-center gap-2 text-indigo-950 text-xs font-bold truncate">
                      <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">{currentGuide.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={currentGuide.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <span>{currentGuide.portalLabel}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-slate-400 p-0.5">
                        {showModalGuide ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </span>
                    </div>
                  </div>

                  {showModalGuide && (
                    <div className="p-3.5 space-y-2 text-xs">
                      {currentGuide.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200">
                            {idx + 1}
                          </span>
                          <div className="space-y-0.5 min-w-0">
                            <h4 className="font-semibold text-slate-800 text-xs">{step.title}</h4>
                            <p className="text-slate-600 text-[11px] leading-relaxed">
                              {step.desc}
                            </p>
                            {step.tip && (
                              <p className="text-indigo-700 text-[10px] font-mono bg-indigo-100/70 px-1.5 py-0.5 rounded border border-indigo-200 inline-block mt-0.5">
                                💡 {step.tip}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <form id="addChannelForm" onSubmit={handleAddPage} className="space-y-3.5">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {addForm.channel === 'WHATSAPP'
                        ? 'ব্যবসা / WhatsApp ডিসপ্লে নাম *'
                        : addForm.channel === 'INSTAGRAM'
                        ? 'Instagram অ্যাকাউন্ট বা ব্র্যান্ড নাম *'
                        : addForm.channel === 'X'
                        ? 'X ব্র্যান্ড বা হ্যান্ডেল নাম (@username) *'
                        : addForm.channel === 'TELEGRAM'
                        ? 'বটের ডিসপ্লে নাম (ঐচ্ছিক)'
                        : 'Facebook Page-এর নাম *'}
                    </label>
                    <input
                      type="text"
                      required={addForm.channel !== 'TELEGRAM'}
                      placeholder={
                        addForm.channel === 'WHATSAPP'
                          ? 'যেমন: My Shop WhatsApp'
                          : addForm.channel === 'TELEGRAM'
                          ? 'যেমন: Shop Support Bot (খালি রাখলে টোকেন থেকে নেবে)'
                          : 'যেমন: Fashion House BD'
                      }
                      value={addForm.pageName}
                      onChange={(e) => setAddForm({ ...addForm, pageName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    />
                  </div>

                  {/* ID */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        {currentGuide.idLabel}
                      </label>
                      <span className="text-[10px] text-indigo-600 font-mono flex items-center gap-1 font-medium">
                        <Hash className="w-3 h-3" /> আইডি ইনপুট
                      </span>
                    </div>
                    <input
                      type="text"
                      required={addForm.channel !== 'TELEGRAM' && addForm.channel !== 'X'}
                      placeholder={addForm.channel === 'TELEGRAM' ? 'খালি রাখলে বটের টোকেন থেকে স্বয়ংক্রিয়ভাবে ডিটেক্ট হবে' : currentGuide.idPlaceholder}
                      value={addForm.facebookPageId}
                      onChange={(e) => setAddForm({ ...addForm, facebookPageId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      📍 {currentGuide.idHelp}
                    </p>
                  </div>

                  {/* Token */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        {currentGuide.tokenLabel}
                      </label>
                      <span className="text-[10px] text-indigo-600 font-mono flex items-center gap-1 font-medium">
                        <Key className="w-3 h-3" /> সিকিউর টোকেন
                      </span>
                    </div>
                    <textarea
                      required
                      rows={2}
                      placeholder={currentGuide.tokenPlaceholder}
                      value={addForm.pageAccessToken}
                      onChange={(e) => setAddForm({ ...addForm, pageAccessToken: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      🔐 {currentGuide.tokenHelp}
                    </p>
                  </div>

                  {/* Settings */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        রিপ্লাই ভাষা
                      </label>
                      <select
                        value={addForm.replyLanguage}
                        onChange={(e) => setAddForm({ ...addForm, replyLanguage: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      >
                        <option value="AUTO">অটো (বাংলা + ইংলিশ)</option>
                        <option value="BANGLA">বাংলা</option>
                        <option value="BANGLISH">বাংলিশ</option>
                        <option value="ENGLISH">English</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        কথোপকথন শৈলী
                      </label>
                      <select
                        value={addForm.replyStyle}
                        onChange={(e) => setAddForm({ ...addForm, replyStyle: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      >
                        <option value="FRIENDLY">বন্ধুভাবাপন্ন (Friendly)</option>
                        <option value="PROFESSIONAL">পেশাদার (Professional)</option>
                        <option value="SALES_FOCUSED">বিক্রয়মুখী (Sales Focused)</option>
                        <option value="SHORT">সংক্ষিপ্ত (Short)</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 shrink-0 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  form="addChannelForm"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition-colors"
                >
                  {saving ? 'সংযুক্ত হচ্ছে...' : 'কানেক্ট ও সেভ করুন'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comprehensive Edit Channel Studio Modal */}
        {showEditModal && selectedPage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl relative my-auto max-h-[92vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <ChannelIcon channel={editForm.channel || selectedPage.channel} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">চ্যানেল সেটিংস ও কনফিগারেশন</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase">
                        {editForm.channel || selectedPage.channel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      সকল অপশন আপডেট, এআই রিপ্লাই ডিলে টাইম অ্যাডজাস্ট ও চ্যানেল ম্যানেজ করুন
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <form id="editChannelForm" onSubmit={handleUpdatePage} className="space-y-6">
                  
                  {/* Section 1: Basic Channel Info */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Settings className="w-4 h-4 text-indigo-600" />
                      বেসিক ইনফরমেশন ও চ্যানেল টাইপ
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Channel Type */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          চ্যানেল প্ল্যাটফর্ম
                        </label>
                        <select
                          value={editForm.channel}
                          onChange={(e) => setEditForm({ ...editForm, channel: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        >
                          <option value="FACEBOOK">Facebook Messenger</option>
                          <option value="WHATSAPP">WhatsApp Cloud API</option>
                          <option value="INSTAGRAM">Instagram Direct</option>
                          <option value="X">X (Twitter) DM</option>
                          <option value="TELEGRAM">Telegram Bot</option>
                        </select>
                      </div>

                      {/* Channel Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          চ্যানেলের প্রদর্শিত নাম *
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.pageName}
                          onChange={(e) => setEditForm({ ...editForm, pageName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        />
                      </div>

                      {/* Channel / Page ID */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          চ্যানেল বা Page ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.facebookPageId}
                          onChange={(e) => setEditForm({ ...editForm, facebookPageId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        />
                      </div>

                      {/* Connection Status */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          কানেকশন স্ট্যাটাস
                        </label>
                        <select
                          value={editForm.connectionStatus}
                          onChange={(e) => setEditForm({ ...editForm, connectionStatus: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        >
                          <option value="CONNECTED">সক্রিয় (Connected)</option>
                          <option value="PENDING">অযাচাইকৃত (Pending Test)</option>
                          <option value="DISCONNECTED">নিষ্ক্রিয় (Disconnected)</option>
                          <option value="TOKEN_EXPIRED">টোকেন ত্রুটি (Expired)</option>
                        </select>
                      </div>
                    </div>

                    {/* Access Token */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Access Token / API Key
                        </label>
                        <span className="text-[10px] text-slate-400">
                          (অপরিবর্তিত রাখতে খালি রাখুন)
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="নতুন টোকেন বা এপিআই কি দিতে চাইলে এখানে পেস্ট করুন..."
                        value={editForm.pageAccessToken}
                        onChange={(e) => setEditForm({ ...editForm, pageAccessToken: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Section 2: AI Reply Delay Time (User Request Highlight) */}
                  <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        AI রিপ্লাই ডিলে টাইম (Reply Delay Pacing)
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
                        {editForm.replyDelaySeconds ?? 3} সেকেন্ড ডিলে
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      রোবটিক তাৎক্ষণিক উত্তরের বদলে স্বাভাবিক মানুষের মতো টাইপিং ইফেক্ট দিয়ে উত্তর পাঠাতে ডিলে সেট করুন। গ্রাহক দেখতে পাবেন এজেন্ট টাইপ করছে।
                    </p>

                    {/* Presets */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                      {[
                        { sec: 0, label: 'তাৎক্ষণিক (0s)', sub: 'Instant Bot' },
                        { sec: 2, label: 'দ্রুত (2s)', sub: 'Fast reply' },
                        { sec: 3, label: 'প্রাকৃতিক (3s)', sub: 'Recommended' },
                        { sec: 5, label: 'চিন্তাশীল (5s)', sub: 'Thoughtful' },
                        { sec: 8, label: 'বাস্তবসম্মত (8s)', sub: 'Human-like' },
                      ].map((preset) => {
                        const isSelected = (editForm.replyDelaySeconds ?? 3) === preset.sec;
                        return (
                          <button
                            key={preset.sec}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, replyDelaySeconds: preset.sec })}
                            className={`p-2 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-xs font-bold">{preset.label}</div>
                            <div className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                              {preset.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Slider for custom seconds */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                        <span>কাস্টম ডিলে সময় (০ থেকে ৩০ সেকেন্ড):</span>
                        <span className="font-mono font-bold text-indigo-700">{editForm.replyDelaySeconds ?? 3}s</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={editForm.replyDelaySeconds ?? 3}
                        onChange={(e) => setEditForm({ ...editForm, replyDelaySeconds: parseInt(e.target.value, 10) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                        <span>০ সেকেন্ড (সরাসরি)</span>
                        <span>১৫ সেকেন্ড</span>
                        <span>৩০ সেকেন্ড (সর্বোচ্চ)</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: AI Language, Tone & Instructions */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      এআই ভাষা, স্টাইল ও কাস্টম নির্দেশনা
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          রিপ্লাই ভাষা
                        </label>
                        <select
                          value={editForm.replyLanguage}
                          onChange={(e) => setEditForm({ ...editForm, replyLanguage: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        >
                          <option value="AUTO">অটো ডিটেকশন (বাংলা + বাংলিশ + ইংলিশ)</option>
                          <option value="BANGLA">শুদ্ধ বাংলা (Bangla Only)</option>
                          <option value="BANGLISH">বাংলিশ (Banglish/Roman)</option>
                          <option value="ENGLISH">English Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          কথোপকথন শৈলী (Tone)
                        </label>
                        <select
                          value={editForm.replyStyle}
                          onChange={(e) => setEditForm({ ...editForm, replyStyle: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        >
                          <option value="FRIENDLY">বন্ধুভাবাপন্ন ও আন্তরিক (Friendly)</option>
                          <option value="PROFESSIONAL">পেশাদার ও মার্জিত (Professional)</option>
                          <option value="SALES_FOCUSED">বিক্রয়মুখী ও কনভার্শনমুখী (Sales Focused)</option>
                          <option value="SHORT">সংক্ষিপ্ত ও টু-দ্য-পয়েন্ট (Short & Direct)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        এই চ্যানেলের জন্য বিশেষ AI নির্দেশনা (Custom Prompt)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="যেমন: ডেলিভারি চার্জ ঢাকার মধ্যে ৬০ টাকা, বাইরে ১২০ টাকা। সব সময় বিনয়ের সাথে স্যার/ম্যাম সম্বোধন করবে..."
                        value={editForm.aiInstructions || ''}
                        onChange={(e) => setEditForm({ ...editForm, aiInstructions: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Section 4: Feature Toggles (All Options Add/Remove) */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Zap className="w-4 h-4 text-indigo-600" />
                      স্বয়ংক্রিয় ফিচার সক্রিয়/নিষ্ক্রিয় করুন (All Toggles)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="text-xs font-bold text-slate-800">স্বয়ংক্রিয় AI রিপ্লাই</div>
                          <div className="text-[10px] text-slate-500">ইনকামিং মেসেজে স্বয়ংক্রিয় উত্তর দেবে</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={editForm.autoReplyEnabled}
                          onChange={(e) => setEditForm({ ...editForm, autoReplyEnabled: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="text-xs font-bold text-slate-800">অর্ডার ডিটেকশন ও সেভ</div>
                          <div className="text-[10px] text-slate-500">নাম, ফোন ও ঠিকানা পেয়ে অর্ডার তৈরি করবে</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={editForm.orderDetection}
                          onChange={(e) => setEditForm({ ...editForm, orderDetection: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="text-xs font-bold text-slate-800">পণ্যের ছবি পাঠানো</div>
                          <div className="text-[10px] text-slate-500">ইনভেন্টরি থেকে পণ্যের ফটো রিপ্লাই দেবে</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={editForm.productImageReply}
                          onChange={(e) => setEditForm({ ...editForm, productImageReply: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                      </label>

                      {/* Image Limit per conversation configuration */}
                      {editForm.productImageReply && (
                        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-2.5 transition-all">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                                প্রতি কনভারসেশনে ছবি পাঠানোর সীমা (Image Limit)
                              </div>
                              <div className="text-[10px] text-indigo-700/80 mt-0.5">
                                পুরো চ্যাট সেশনে সর্বোচ্চ কতবার ছবি পাঠাবে (গ্রাহককে স্প্যাম রোধে)
                              </div>
                            </div>
                            <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-600 text-white rounded-full shadow-xs">
                              {editForm.maxImagesPerConversation === 0 ? 'সীমাহীন' : `${editForm.maxImagesPerConversation ?? 2} বার`}
                            </span>
                          </div>

                          {/* Quick Presets */}
                          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                            {[
                              { label: '১ বার', value: 1 },
                              { label: '২ বার (স্ট্যান্ডার্ড)', value: 2 },
                              { label: '৩ বার', value: 3 },
                              { label: 'সীমাহীন', value: 0 },
                            ].map((preset) => (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => setEditForm({ ...editForm, maxImagesPerConversation: preset.value })}
                                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  (editForm.maxImagesPerConversation ?? 2) === preset.value
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-white text-slate-700 hover:bg-indigo-100/60 border border-indigo-200/60'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>

                          {/* Custom number input */}
                          <div className="flex items-center justify-between pt-1 border-t border-indigo-100/80 text-[11px] text-slate-600">
                            <span>কাস্টম সংখ্যা নির্ধারণ করুন:</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={editForm.maxImagesPerConversation ?? 2}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setEditForm({
                                    ...editForm,
                                    maxImagesPerConversation: isNaN(val) ? 0 : Math.max(0, Math.min(50, val)),
                                  });
                                }}
                                className="w-16 px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs text-center font-bold text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="text-[10px] text-slate-400">বার (০ = আনলিমিটেড)</span>
                            </div>
                          </div>

                          {/* Images Per Reply configuration */}
                          <div className="pt-2.5 border-t border-indigo-200/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                  একবারে সর্বোচ্চ কতটি ছবি পাঠাবে (Images per Reply)
                                </div>
                                <div className="text-[10px] text-indigo-700/80 mt-0.5">
                                  গ্রাহক ছবি চাইলে একসাথে সর্বোচ্চ কয়টি ছবি পাঠাবে
                                </div>
                              </div>
                              <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-600 text-white rounded-full shadow-xs">
                                {editForm.maxImagesPerReply === 0 ? 'সবগুলো' : `${editForm.maxImagesPerReply ?? 1}টি`}
                              </span>
                            </div>

                            {/* Quick Presets for Images Per Reply */}
                            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                              {[
                                { label: '১টি (ডিফল্ট)', value: 1 },
                                { label: '২টি', value: 2 },
                                { label: '৩টি', value: 3 },
                                { label: 'সবগুলো', value: 0 },
                              ].map((preset) => (
                                <button
                                  key={preset.value}
                                  type="button"
                                  onClick={() => setEditForm({ ...editForm, maxImagesPerReply: preset.value })}
                                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                                    (editForm.maxImagesPerReply ?? 1) === preset.value
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'bg-white text-slate-700 hover:bg-indigo-100/60 border border-indigo-200/60'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>

                            {/* Custom number input for maxImagesPerReply */}
                            <div className="flex items-center justify-between pt-1 border-t border-indigo-100/80 text-[11px] text-slate-600">
                              <span>কাস্টম সংখ্যা:</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={editForm.maxImagesPerReply ?? 1}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setEditForm({
                                      ...editForm,
                                      maxImagesPerReply: isNaN(val) ? 1 : Math.max(0, Math.min(10, val)),
                                    });
                                  }}
                                  className="w-16 px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs text-center font-bold text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <span className="text-[10px] text-slate-400">টি (০ = সবগুলো)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="text-xs font-bold text-slate-800">হিউম্যান হ্যান্ডঅফ মোড</div>
                          <div className="text-[10px] text-slate-500">গ্রাহক এজেন্ট চাইলে AI সাময়িক পজ হবে</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={editForm.humanHandoffEnabled}
                          onChange={(e) => setEditForm({ ...editForm, humanHandoffEnabled: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="text-xs font-bold text-slate-800">ভয়েস মেসেজ প্রসেসিং</div>
                          <div className="text-[10px] text-slate-500">গ্রাহকের অডিও শুনে বুঝে উত্তর দেবে</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={editForm.voiceProcessing}
                          onChange={(e) => setEditForm({ ...editForm, voiceProcessing: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="text-xs font-bold text-slate-800">ছবি বোঝা (Vision AI)</div>
                          <div className="text-[10px] text-slate-500">গ্রাহকের পাঠানো ছবি দেখে পণ্য শনাক্ত করবে</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={editForm.imageUnderstanding}
                          onChange={(e) => setEditForm({ ...editForm, imageUnderstanding: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Section 5: Automated Follow-Up Messages for Seen/Unreplied Customers (Moved to Follow-Up Hub) */}
                  <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-amber-100/30 border border-amber-200 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                          <MessageSquareReply className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            অটোমেটেড ফলো-আপ (Seen কিন্তু Reply দেয়নি)
                          </div>
                          <div className="text-[10px] text-slate-500">
                            AI ফলো-আপ অটোমেশন ও শিডিউল হাব
                          </div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.followUpEnabled}
                          onChange={(e) => setEditForm({ ...editForm, followUpEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      যেসব গ্রাহক পেজের রিপ্লাই সিন (Seen / Read) করেছেন কিন্তু কোনো উত্তর বা অর্ডার দেননি, তাদের নির্দিষ্ট সময় (মিনিট/ঘন্টা/দিন) পর স্বয়ংক্রিয় ফলো-আপ বার্তা পাঠানো হয়। সম্পূর্ণ কাস্টম সময় ও মাল্টি-স্টেপ শিডিউল ফলো-আপ সেকশন থেকে ম্যানেজ করুন।
                    </p>

                    {editForm.followUpEnabled && (
                      <div className="pt-2 border-t border-amber-200/70 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                            <span className="text-slate-500 block text-[10px]">অপেক্ষার সময়:</span>
                            <span className="font-bold text-amber-900">{editForm.followUpWaitMinutes ?? 30} মিনিট</span>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                            <span className="text-slate-500 block text-[10px]">টার্গেট ফিল্টার:</span>
                            <span className="font-bold text-amber-900">{editForm.followUpOnlySeen ? 'শুধু সিন করা গ্রাহক' : 'সকল গ্রাহক'}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <a
                            href={`/dashboard/follow-up?pageId=${selectedPage?.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            AI ফলো-আপ ও শিডিউল কনফিগার করুন
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            disabled={runningFollowUpId === selectedPage?.id}
                            onClick={() => selectedPage?.id && handleTriggerFollowUp(selectedPage.id)}
                            className="px-3 py-2.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${runningFollowUpId === selectedPage?.id ? 'animate-spin' : ''}`} />
                            {runningFollowUpId === selectedPage?.id ? 'চলছে...' : 'এখনই টেস্ট রান'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 6: Webhook Credentials */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      ওয়েবহুক ক্রিডেনশিয়ালস (Webhook URL & Verify Token)
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-700 mb-1">Webhook URL</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={getDisplayWebhookUrl(editForm.channel || selectedPage.channel, selectedPage.webhookUrl)}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-[11px] select-all"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopy(getDisplayWebhookUrl(editForm.channel || selectedPage.channel, selectedPage.webhookUrl), 'edit_webhook')}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1 shrink-0"
                          >
                            {copiedKey === 'edit_webhook' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            কপি
                          </button>
                        </div>
                      </div>

                      {selectedPage.verifyToken && (
                        <div>
                          <div className="text-[11px] font-semibold text-slate-700 mb-1">Verify Token</div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editForm.verifyToken || selectedPage.verifyToken}
                              onChange={(e) => setEditForm({ ...editForm, verifyToken: e.target.value })}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={() => handleCopy(editForm.verifyToken || selectedPage.verifyToken, 'edit_token')}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1 shrink-0"
                            >
                              {copiedKey === 'edit_token' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                              কপি
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 6: Danger Zone (Remove / Delete Channel Option) */}
                  <div className="border border-red-200 rounded-xl p-4 bg-red-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        চ্যানেল রিমুভ / মুছে ফেলার অপশন (Danger Zone)
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(false);
                          handleDeletePage(selectedPage.id, selectedPage.pageName);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        এই চ্যানেলটি সম্পূর্ণ মুছে ফেলুন
                      </button>
                    </div>
                    <p className="text-[11px] text-red-600/90 leading-relaxed">
                      চ্যানেলটি মুছে ফেললে সিস্টেম আর কোনো ইনকামিং বার্তা গ্রহণ করবে না। তবে পূর্বে সেভ করা অর্ডার অপরিবর্তিত থাকবে।
                    </p>
                  </div>

                </form>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 shrink-0 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition-colors"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  form="editChannelForm"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      সংরক্ষণ হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      সকল পরিবর্তন সংরক্ষণ করুন
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
