'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  MessageSquare,
  Search,
  Bot,
  User,
  Pause,
  Play,
  Send,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  Mic,
  Plus,
  Layers,
  X,
  Phone,
  MapPin,
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Volume2,
  RefreshCw,
  Edit3,
  Info,
  Calendar,
  Mail,
  Tag,
  Check,
  Eye,
  MessageSquareReply,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

// Fast module caches across tab switches and initial render (0ms response)
let moduleCachedInboxList: any[] = [];
let moduleCachedActiveConv: any = null;
const moduleCachedMessages: Record<string, { conversation: any; messages: any[] }> = {};

export default function ConversationsPage() {
  const toast = useToast();
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // In-memory instant message cache for 0ms conversation switching
  const messagesCacheRef = useRef<Record<string, { conversation: any; messages: any[] }>>({});

  // 0ms instant loading from module memory or localStorage cache
  const [conversations, setConversations] = useState<any[]>(() => {
    if (moduleCachedInboxList.length > 0) return moduleCachedInboxList;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('replyx_inbox_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            moduleCachedInboxList = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return [];
  });

  const [loadingList, setLoadingList] = useState<boolean>(() => {
    if (moduleCachedInboxList.length > 0) return false;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('replyx_inbox_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return false;
        }
      } catch (_) {}
    }
    return true;
  });

  const [selectedConv, setSelectedConv] = useState<any>(() => {
    if (moduleCachedActiveConv) return moduleCachedActiveConv;
    if (moduleCachedInboxList.length > 0) return moduleCachedInboxList[0];
    return null;
  });

  const [messages, setMessages] = useState<any[]>(() => {
    if (moduleCachedActiveConv?.id && moduleCachedMessages[moduleCachedActiveConv.id]?.messages) {
      return moduleCachedMessages[moduleCachedActiveConv.id].messages;
    }
    return [];
  });

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile responsive view toggle (false = show list, true = show chat thread)
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');

  // Customer Data inspection & Name Edit state
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempCustomerName, setTempCustomerName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Input & Order modal
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    product: '',
    quantity: '1',
    price: '',
    notes: '',
  });

  // Isolated Container Scroll to Bottom helper (No Window Jump)
  const scrollToBottom = useCallback((smooth = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceFromBottom > 150);
  };

  const fetchConversations = async (keepSelection = true) => {
    try {
      if (!keepSelection && conversations.length === 0) setLoadingList(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (channelFilter !== 'ALL') params.append('channel', channelFilter);

      const data = await apiFetch<any>(`/api/conversations?${params.toString()}`, { retries: 1 });

      if (data?.success && Array.isArray(data.conversations)) {
        moduleCachedInboxList = data.conversations;
        setConversations(data.conversations);
        try {
          localStorage.setItem('replyx_inbox_cache', JSON.stringify(data.conversations));
        } catch (_) {}

        if (data.conversations.length > 0 && !selectedConv) {
          loadConversation(data.conversations[0].id, false);
        }
      }
    } catch (_) {
      // Safe fallback handled silently by apiFetch
    } finally {
      setLoadingList(false);
      setIsRefreshing(false);
    }
  };

  const loadConversation = async (id: string, openMobileChat = true) => {
    if (openMobileChat) {
      setMobileShowChat(true);
    }

    // Instant switch if conversation is already in memory or localStorage cache (0ms delay)
    let cached = messagesCacheRef.current[id] || moduleCachedMessages[id];
    if (!cached && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`replyx_msg_${id}`);
        if (stored) {
          cached = JSON.parse(stored);
        }
      } catch (_) {}
    }

    if (cached) {
      moduleCachedActiveConv = cached.conversation;
      setSelectedConv(cached.conversation);
      setMessages(cached.messages);
      setLoadingMessages(false);
      setTimeout(() => scrollToBottom(false), 30);
    } else {
      setLoadingMessages(true);
    }

    try {
      const data = await apiFetch<any>(`/api/conversations/${id}`, { retries: 1 });

      if (data?.success && data.conversation) {
        const cachePayload = {
          conversation: data.conversation,
          messages: data.messages || [],
        };
        messagesCacheRef.current[id] = cachePayload;
        moduleCachedMessages[id] = cachePayload;
        moduleCachedActiveConv = data.conversation;

        try {
          localStorage.setItem(`replyx_msg_${id}`, JSON.stringify(cachePayload));
        } catch (_) {}

        setSelectedConv(data.conversation);
        setMessages(data.messages || []);

        setOrderForm({
          customerName: data.conversation.customerName || '',
          phone: '',
          address: '',
          product: '',
          quantity: '1',
          price: '',
          notes: '',
        });

        setTimeout(() => {
          scrollToBottom(false);
        }, 50);
      }
    } catch (e) {
      if (!cached) toast.error('মেসেজ লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [search, statusFilter, channelFilter]);

  // 1. Background live message polling for open conversation (every 4.5 seconds)
  useEffect(() => {
    if (!selectedConv?.id) return;
    let isCancelled = false;

    const pollInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const data = await apiFetch<any>(`/api/conversations/${selectedConv.id}`, { retries: 1 });
        if (!isCancelled && data?.success && Array.isArray(data.messages)) {
          setMessages((prev: any[]) => {
            if (data.messages.length > prev.length) {
              setTimeout(() => scrollToBottom(true), 80);
              return data.messages;
            }
            return prev;
          });
          if (data.conversation) {
            setSelectedConv((prev: any) => (prev ? { ...prev, ...data.conversation } : data.conversation));
          }
        }
      } catch (_) {}
    }, 4500);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
    };
  }, [selectedConv?.id]);

  // 2. Background conversation list auto-refresh (every 12 seconds)
  useEffect(() => {
    const listInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
        fetchConversations(true);
      }
    }, 12000);
    return () => clearInterval(listInterval);
  }, [search, statusFilter, channelFilter]);

  // 3. Periodic follow-up automation runner (runs safely every 2 minutes while on dashboard)
  useEffect(() => {
    const triggerFollowUp = async () => {
      try {
        await fetch('/api/cron/follow-up', { method: 'POST' });
      } catch (_) {}
    };

    triggerFollowUp();
    const interval = setInterval(triggerFollowUp, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Instant Follow-up dispatch handler
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const handleSendInstantFollowUp = async () => {
    if (!selectedConv) return;
    try {
      setSendingFollowUp(true);
      const res = await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_INSTANT_FOLLOW_UP',
          conversationId: selectedConv.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'গ্রাহকের নিকট ফলো-আপ পাঠানো হয়েছে!');
        loadConversation(selectedConv.id, false);
      } else {
        toast.error(data.error || 'ফলো-আপ পাঠানো সম্ভব হয়নি।');
      }
    } catch (e) {
      toast.error('সার্ভারে যোগাযোগ করা যায়নি।');
    } finally {
      setSendingFollowUp(false);
    }
  };

  const handleSendManualReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !replyText.trim() || sending) return;

    const sentText = replyText.trim();
    setSending(true);
    setReplyText('');

    // Instant Optimistic Message Bubble in UI (0ms delay)
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: any = {
      id: tempId,
      conversationId: selectedConv.id,
      direction: 'OUTGOING',
      messageText: sentText,
      createdAt: new Date().toISOString(),
      aiGenerated: false,
      isPending: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 40);

    // Update conversation preview in sidebar
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConv.id
          ? { ...c, lastMessage: sentText, lastMessageAt: new Date().toISOString() }
          : c
      )
    );

    try {
      const res = await fetch(`/api/conversations/${selectedConv.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageText: sentText, switchToHumanMode: true }),
      });

      const data = await res.json();
      if (data.success && data.savedMessage) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.savedMessage : m))
        );
        // Sync cache
        if (messagesCacheRef.current[selectedConv.id]) {
          messagesCacheRef.current[selectedConv.id].messages = (
            messagesCacheRef.current[selectedConv.id].messages || []
          )
            .filter((m) => m.id !== tempId)
            .concat(data.savedMessage);
          if (data.conversation) {
            messagesCacheRef.current[selectedConv.id].conversation = data.conversation;
          }
        }
        if (data.conversation) {
          setSelectedConv(data.conversation);
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedConv.id ? data.conversation : c))
          );
        }
        setTimeout(() => scrollToBottom(true), 60);
      } else {
        // Rollback on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setReplyText(sentText);
        toast.error(data.error || 'মেসেজ পাঠাতে ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setReplyText(sentText);
      toast.error('মেসেজ পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setSending(false);
    }
  };

  // Safe check if a conversation has AI Active or Human Mode
  const isConvAiActive = (c: any) => Boolean(c?.aiEnabled) && c?.status !== 'HUMAN_MODE';

  const handleToggleAiForConv = async (convId: string, targetAiEnabled: boolean) => {
    const targetStatus = targetAiEnabled ? 'ACTIVE' : 'HUMAN_MODE';

    // 1. Optimistic UI update immediately (0ms delay)
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === convId
          ? { ...c, aiEnabled: targetAiEnabled, status: targetStatus }
          : c
      );
      moduleCachedInboxList = updated;
      try {
        localStorage.setItem('replyx_inbox_cache', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    if (selectedConv?.id === convId) {
      setSelectedConv((prev: any) => ({
        ...prev,
        aiEnabled: targetAiEnabled,
        status: targetStatus,
      }));
    }

    if (messagesCacheRef.current[convId]?.conversation) {
      messagesCacheRef.current[convId].conversation.aiEnabled = targetAiEnabled;
      messagesCacheRef.current[convId].conversation.status = targetStatus;
    }

    toast.success(
      targetAiEnabled
        ? '🤖 AI মোড চালু করা হয়েছে! এখন থেকে AI অটো-রিপ্লাই দেবে।'
        : '👤 হিউম্যান মোড সক্রিয় হয়েছে! AI বন্ধ আছে, আপনি ম্যানুয়ালি চ্যাট করতে পারবেন।'
    );

    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiEnabled: targetAiEnabled,
          status: targetStatus,
        }),
      });

      const data = await res.json();
      if (data.success && data.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, ...data.conversation } : c))
        );
        if (selectedConv?.id === convId) {
          setSelectedConv((prev: any) => ({ ...prev, ...data.conversation }));
        }
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      // Revert on failure
      const revertAi = !targetAiEnabled;
      const revertStatus = revertAi ? 'ACTIVE' : 'HUMAN_MODE';
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, aiEnabled: revertAi, status: revertStatus }
            : c
        )
      );
      if (selectedConv?.id === convId) {
        setSelectedConv((prev: any) => ({
          ...prev,
          aiEnabled: revertAi,
          status: revertStatus,
        }));
      }
      toast.error('মোড পরিবর্তন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  const handleToggleAi = () => {
    if (!selectedConv) return;
    handleToggleAiForConv(selectedConv.id, !isConvAiActive(selectedConv));
  };

  const handleUpdateCustomerName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !tempCustomerName.trim()) return;
    setSavingName(true);

    try {
      const res = await fetch(`/api/conversations/${selectedConv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: tempCustomerName.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedConv((prev: any) => ({ ...prev, customerName: tempCustomerName.trim() }));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConv.id ? { ...c, customerName: tempCustomerName.trim() } : c
          )
        );
        setEditingName(false);
        toast.success('গ্রাহকের নাম সফলভাবে আপডেট করা হয়েছে!');
      } else {
        toast.error(data.error || 'নাম আপডেট করতে ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('নাম আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setSavingName(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv) return;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: selectedConv.pageId,
          conversationId: selectedConv.id,
          customerName: orderForm.customerName,
          phone: orderForm.phone,
          address: orderForm.address,
          product: orderForm.product,
          quantity: orderForm.quantity,
          price: orderForm.price,
          totalPrice: parseFloat(orderForm.price || '0') * parseInt(orderForm.quantity || '1', 10),
          notes: orderForm.notes,
          status: 'PENDING',
          source: 'MANUAL',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('অর্ডার সফলভাবে তৈরি হয়েছে!');
        setShowOrderModal(false);
        setOrderForm({ customerName: '', phone: '', address: '', product: '', quantity: '1', price: '', notes: '' });
      }
    } catch (e) {
      toast.error('অর্ডার তৈরি করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <DashboardLayout
      title="ইনবক্স ও লাইভ কনভারসেশন"
      subtitle="কাস্টমারের সাথে সরাসরি চ্যাট করুন, ভয়েস মেসেজ ও AI উত্তর নিয়ন্ত্রণ করুন"
      noPaddingMobile={true}
    >
      <div className="bg-white border-0 sm:border border-slate-200/90 rounded-none sm:rounded-3xl shadow-none sm:shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[calc(100dvh-57px)] sm:h-[calc(100dvh-135px)] min-h-0 sm:min-h-[580px] max-h-none sm:max-h-[920px]">
        {/* ========================================================================= */}
        {/* Left Pane: Customer List / Inbox (4 Columns)                              */}
        {/* ========================================================================= */}
        <div
          className={`${
            mobileShowChat ? 'hidden lg:flex' : 'flex'
          } lg:col-span-4 border-r border-slate-200/90 flex-col h-full bg-slate-50/50 min-h-0`}
        >
          {/* Filter & Search Header */}
          <div className="p-4 border-b border-slate-200/90 space-y-3 shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="গ্রাহকের নাম বা মেসেজ খুঁজুন..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <button
                onClick={() => {
                  setIsRefreshing(true);
                  fetchConversations(true);
                }}
                title="রিফ্রেশ ইনবক্স"
                className={`p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 transition-colors ${
                  isRefreshing ? 'animate-spin text-indigo-600' : ''
                }`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-colors font-medium whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                সকল চ্যাট
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1 rounded-lg transition-colors font-medium whitespace-nowrap ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                AI সক্রিয়
              </button>
              <button
                onClick={() => setStatusFilter('HUMAN_MODE')}
                className={`px-3 py-1 rounded-lg transition-colors font-medium whitespace-nowrap ${
                  statusFilter === 'HUMAN_MODE'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                হিউম্যান মোড
              </button>
            </div>

            {/* Social Channel Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pt-1 text-[11px] no-scrollbar">
              {[
                { id: 'ALL', label: 'সকল' },
                { id: 'FACEBOOK', label: 'FB' },
                { id: 'WHATSAPP', label: 'WhatsApp' },
                { id: 'INSTAGRAM', label: 'Instagram' },
                { id: 'X', label: 'X' },
                { id: 'TELEGRAM', label: 'Telegram' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setChannelFilter(ch.id)}
                  className={`px-2.5 py-0.5 rounded-full transition-colors font-medium whitespace-nowrap ${
                    channelFilter === ch.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List with Isolated Smooth Scrolling */}
          <div className="flex-1 min-h-0 chat-scroll-container divide-y divide-slate-100">
            {loadingList ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-xs text-slate-500">ইনবক্স লোড হচ্ছে...</div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500 px-4 space-y-1">
                <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-slate-700">কোনো কথোপকথন নেই</p>
                <p className="text-[11px] text-slate-400">আপনার পেজে মেসেজ আসলে এখানে তালিকাভুক্ত হবে</p>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = selectedConv?.id === c.id;
                const isVoiceMessage =
                  c.lastMessage?.includes('🎙️') ||
                  c.lastMessage?.toLowerCase().includes('voice') ||
                  c.lastMessage?.toLowerCase().includes('ভয়েস');

                return (
                  <button
                    key={c.id}
                    onClick={() => loadConversation(c.id, true)}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-3 border-indigo-600'
                        : 'hover:bg-white/80 bg-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {c.customerName?.charAt(0) || 'C'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {c.customerName || `Customer (${c.senderPsid?.slice(-4) || '...' })`}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {c.lastMessageAt
                            ? new Date(c.lastMessageAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      <p
                        className={`text-xs truncate mb-1.5 ${
                          isVoiceMessage ? 'text-indigo-600 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {c.lastMessage || 'নতুন বার্তা'}
                      </p>

                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            (c.channel || c.page?.channel) === 'WHATSAPP'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : (c.channel || c.page?.channel) === 'INSTAGRAM'
                              ? 'bg-pink-50 text-pink-700 border border-pink-200'
                              : (c.channel || c.page?.channel) === 'X'
                              ? 'bg-slate-100 text-slate-800 border border-slate-200'
                              : (c.channel || c.page?.channel) === 'TELEGRAM'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {c.channel || c.page?.channel || 'FB'}
                          </span>
                          <span className="text-slate-500 truncate">{c.page?.pageName || 'Channel'}</span>
                        </div>
                        {/* 1-Tap Quick Human/AI Mode Switcher in Inbox List */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAiForConv(c.id, !isConvAiActive(c));
                          }}
                          title={isConvAiActive(c) ? 'হিউম্যান মোডে নিতে ক্লিক করুন (AI বন্ধ হবে)' : 'AI চালু করতে ক্লিক করুন'}
                          className={`px-2 py-0.5 rounded-full flex items-center gap-1 font-bold transition-all text-[9.5px] shrink-0 active:scale-95 shadow-2xs ${
                            isConvAiActive(c)
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                              : 'text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 ring-2 ring-amber-400/20'
                          }`}
                        >
                          {isConvAiActive(c) ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>AI চালু</span>
                            </>
                          ) : (
                            <>
                              <User className="w-2.5 h-2.5 text-amber-700" />
                              <span>হিউম্যান</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Right Pane: Active Message Thread & Actions (8 Columns)                   */}
        {/* ========================================================================= */}
        <div
          className={`${
            !mobileShowChat ? 'hidden lg:flex' : 'flex'
          } lg:col-span-8 flex-col h-full bg-[#f8fafc] min-h-0 relative`}
        >
          {selectedConv ? (
            <>
              {/* Thread Header */}
              <div className="p-2.5 sm:p-4 border-b border-slate-200/90 bg-white flex items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-xs">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileShowChat(false)}
                    className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 shrink-0"
                    title="ইনবক্সে ফিরে যান"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-xs">
                    {selectedConv.customerName?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {editingName ? (
                        <form onSubmit={handleUpdateCustomerName} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            required
                            autoFocus
                            value={tempCustomerName}
                            onChange={(e) => setTempCustomerName(e.target.value)}
                            className="px-2 py-1 text-xs font-bold bg-white border border-indigo-500 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="submit"
                            disabled={savingName}
                            className="p-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                            title="সংরক্ষণ করুন"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingName(false)}
                            className="p-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            title="বাতিল"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-1 group min-w-0">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[200px]">
                            {selectedConv.customerName || `Customer (${selectedConv.senderPsid})`}
                          </h3>
                          <button
                            onClick={() => {
                              setTempCustomerName(selectedConv.customerName || '');
                              setEditingName(true);
                            }}
                            className="opacity-60 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity shrink-0"
                            title="গ্রাহকের আসল নাম এডিট করুন"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md shrink-0 ${
                        (selectedConv.channel || selectedConv.page?.channel) === 'WHATSAPP'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : (selectedConv.channel || selectedConv.page?.channel) === 'INSTAGRAM'
                          ? 'bg-pink-50 text-pink-700 border border-pink-200'
                          : (selectedConv.channel || selectedConv.page?.channel) === 'X'
                          ? 'bg-slate-100 text-slate-800 border border-slate-200'
                          : (selectedConv.channel || selectedConv.page?.channel) === 'TELEGRAM'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {selectedConv.channel || selectedConv.page?.channel || 'FB'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-[11px] text-slate-500 truncate">
                      <span className="truncate">আইডি: <span className="font-mono text-slate-700 font-medium">{selectedConv.senderPsid?.slice(-6) || selectedConv.senderPsid}</span></span>
                      <span>•</span>
                      <span className="truncate">{selectedConv.page?.pageName || 'Live'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {/* Dedicated 1-Click Segmented Mode Switcher (AI Mode <-> Human Mode) */}
                  <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200/90 shrink-0 shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleToggleAiForConv(selectedConv.id, true)}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                        isConvAiActive(selectedConv)
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="AI অটোমেটিক রিপ্লাই সক্রিয় করুন"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span className="hidden xs:inline">AI চালু</span>
                      <span className="xs:hidden">AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAiForConv(selectedConv.id, false)}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                        !isConvAiActive(selectedConv)
                          ? 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-300 font-extrabold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="হিউম্যান মোডে নিন (AI বন্ধ থাকবে, আপনি নিজে রিপ্লাই দেবেন)"
                    >
                      <User className="w-3 h-3" />
                      <span className="hidden xs:inline">হিউম্যান</span>
                      <span className="xs:hidden">ম্যানুয়াল</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                    className={`inline-flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold transition-colors shadow-xs ${
                      showCustomerDetails
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-500/10'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title="গ্রাহকের বিস্তারিত ডাটা দেখুন"
                  >
                    <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="hidden md:inline">ডাটা</span>
                  </button>

                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors shadow-xs"
                    title="নতুন অর্ডার তৈরি করুন"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span className="hidden md:inline">অর্ডার</span>
                  </button>

                  <button
                    onClick={handleSendInstantFollowUp}
                    disabled={sendingFollowUp}
                    className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
                    title="এই গ্রাহককে এখনই সরাসরি এআই ফলো-আপ বার্তা পাঠান"
                  >
                    {sendingFollowUp ? (
                      <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <MessageSquareReply className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    )}
                    <span className="hidden md:inline">ফলো-আপ</span>
                  </button>
                </div>
              </div>

              {/* Customer Real Data & Profile Inspector Drawer */}
              {showCustomerDetails && (
                <div className="bg-white border-b border-indigo-100 p-4 shrink-0 transition-all animate-fadeIn">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>কাস্টমার রিয়েল ডাটা ও প্রোফাইল বিবরণ</span>
                    </div>
                    <button
                      onClick={() => setShowCustomerDetails(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Customer Name & Edit */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-semibold mb-1 flex items-center justify-between">
                        <span>কাস্টমারের নাম</span>
                        <button
                          onClick={() => {
                            setTempCustomerName(selectedConv.customerName || '');
                            setEditingName(true);
                          }}
                          className="text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          <Edit3 className="w-2.5 h-2.5" /> এডিট
                        </button>
                      </div>
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {selectedConv.customerName || 'অজ্ঞাত'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        আইডি: <span className="font-mono text-slate-600">{selectedConv.senderPsid}</span>
                      </div>
                    </div>

                    {/* Channel & Status */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-semibold mb-1">কানেকশন ও প্ল্যাটফর্ম</div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{selectedConv.channel || selectedConv.page?.channel || 'FACEBOOK'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                          {selectedConv.page?.pageName}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>প্রথম যোগাযোগ: {new Date(selectedConv.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Orders Summary */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-semibold mb-1">অর্ডার হিস্ট্রি ও সামারি</div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{selectedConv.orders?.length || 0} টি অর্ডার তৈরি</span>
                        {(selectedConv.orders?.length || 0) > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            নিয়মিত গ্রাহক
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 truncate">
                        সর্বশেষ মেসেজ: {selectedConv.lastMessageAt ? new Date(selectedConv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Seen & Follow-Up Status Ribbon */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">সিন (Seen) স্ট্যাটাস:</span>
                      {selectedConv.lastSeenAt ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>সিন করেছেন ({new Date(selectedConv.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          <span>এখনো সিন করেননি / ডেলিভার্ড</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedConv.lastFollowUpSentAt ? (
                        <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                          <MessageSquareReply className="w-3 h-3 text-amber-600" />
                          <span>অটো ফলো-আপ পাঠানো হয়েছে: {new Date(selectedConv.lastFollowUpSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          অটোমেটিক ফলো-আপ শিডিউল সক্রিয়
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Dedicated Human Mode Active Alert Ribbon */}
              {!isConvAiActive(selectedConv) && (
                <div className="px-3.5 py-2 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border-b border-amber-300 text-amber-950 text-xs flex items-center justify-between gap-2 shrink-0 animate-fadeIn">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                      <User className="w-3 h-3" />
                    </div>
                    <div className="truncate">
                      <span className="font-extrabold text-amber-900">হিউম্যান মোড সক্রিয়:</span>{' '}
                      <span className="text-amber-800 text-[11px] hidden sm:inline">AI অটো-রিপ্লাই স্থগিত আছে। আপনি সরাসরি গ্রাহকের সাথে কথা বলছেন।</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAiForConv(selectedConv.id, true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-[11px] shrink-0 transition-colors shadow-2xs flex items-center gap-1"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>AI চালু করুন</span>
                  </button>
                </div>
              )}

              {/* Message List - Isolated Scroll Container with Momentum Scrolling */}
              <div
                ref={chatContainerRef}
                onScroll={handleChatScroll}
                className="flex-1 min-h-0 chat-scroll-instant p-3 sm:p-6 space-y-3 sm:space-y-4 relative bg-[#f8fafc]"
              >
                {loadingMessages ? (
                  <div className="space-y-4 py-4 animate-pulse">
                    {/* Skeleton incoming bubble */}
                    <div className="flex justify-start">
                      <div className="bg-slate-200/90 rounded-2xl rounded-tl-none p-3.5 w-3/4 max-w-[280px] space-y-2">
                        <div className="h-2 bg-slate-300 rounded w-1/4"></div>
                        <div className="h-2.5 bg-slate-300 rounded w-5/6"></div>
                        <div className="h-2.5 bg-slate-300 rounded w-2/3"></div>
                      </div>
                    </div>
                    {/* Skeleton outgoing bubble */}
                    <div className="flex justify-end">
                      <div className="bg-indigo-200/80 rounded-2xl rounded-tr-none p-3.5 w-2/3 max-w-[260px] space-y-2">
                        <div className="h-2 bg-indigo-300 rounded w-1/4 ml-auto"></div>
                        <div className="h-2.5 bg-indigo-300 rounded w-4/5 ml-auto"></div>
                        <div className="h-2.5 bg-indigo-300 rounded w-3/5 ml-auto"></div>
                      </div>
                    </div>
                    {/* Skeleton incoming bubble */}
                    <div className="flex justify-start">
                      <div className="bg-slate-200/90 rounded-2xl rounded-tl-none p-3.5 w-1/2 max-w-[220px] space-y-2">
                        <div className="h-2 bg-slate-300 rounded w-1/3"></div>
                        <div className="h-2.5 bg-slate-300 rounded w-4/5"></div>
                      </div>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-24 text-center text-xs text-slate-400 space-y-1">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">এই কথোপকথনে কোনো বার্তা নেই</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isIncoming = m.direction === 'INCOMING';
                    const hasAudio =
                      m.mediaUrl &&
                      (m.messageType === 'AUDIO' ||
                        m.mediaUrl.includes('.mp4') ||
                        m.mediaUrl.includes('.aac') ||
                        m.mediaUrl.includes('.ogg') ||
                        m.mediaUrl.includes('.mp3') ||
                        m.mediaUrl.includes('.wav') ||
                        m.mediaUrl.includes('audioclip'));

                    return (
                      <div
                        key={m.id}
                        className={`flex ${isIncoming ? 'justify-start' : 'justify-end'} ${m.isPending ? 'opacity-85' : ''}`}
                      >
                        <div
                          className={`max-w-[88%] sm:max-w-[75%] rounded-2xl p-3 sm:p-3.5 text-xs leading-relaxed shadow-xs ${
                            isIncoming
                              ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200/90'
                              : m.aiGenerated
                              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-sm'
                              : 'bg-slate-900 text-white rounded-tr-none shadow-sm'
                          }`}
                        >
                          {/* Message meta badge */}
                          <div className="flex items-center justify-between text-[10px] mb-1.5 opacity-80 gap-3">
                            <span className="font-medium">
                              {isIncoming
                                ? 'গ্রাহক'
                                : m.aiGenerated
                                ? `ReplyX AI (${m.aiModel || 'Smart'})`
                                : 'Human Agent'}
                            </span>
                            <span className="flex items-center gap-1">
                              {m.isPending ? (
                                <span className="text-[9px] text-indigo-200 font-semibold flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 animate-spin" />
                                  <span>যাচ্ছে...</span>
                                </span>
                              ) : (
                                new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              )}
                            </span>
                          </div>

                          {/* Text content */}
                          {m.messageText && <p className="whitespace-pre-wrap">{m.messageText}</p>}

                          {/* Image Attachment if present */}
                          {m.mediaUrl && m.messageType === 'IMAGE' && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-slate-200">
                              <img
                                src={m.mediaUrl}
                                alt="Attached Media"
                                className="max-h-60 w-full object-cover rounded-xl"
                                loading="lazy"
                              />
                            </div>
                          )}

                          {/* Audio Player for Voice Messages */}
                          {hasAudio && (
                            <div className="mt-2.5 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 space-y-2 text-slate-900">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 font-semibold">
                                  <Mic className="w-3.5 h-3.5 animate-pulse text-indigo-600" />
                                  <span>গ্রাহকের ভয়েস নোট:</span>
                                </div>
                                <a
                                  href={m.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors font-medium"
                                >
                                  <span>শুনুন</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                              <audio
                                controls
                                src={m.mediaUrl}
                                className="w-full h-8 rounded-lg outline-none"
                                preload="metadata"
                              />
                            </div>
                          )}

                          {/* Audio transcription if present */}
                          {m.transcription && (
                            <div className="mt-2 bg-indigo-50/70 border border-indigo-100 p-2.5 rounded-xl text-[11px] space-y-1">
                              <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-semibold">
                                <Mic className="w-3 h-3 text-indigo-600" />
                                <span>ভয়েস রূপান্তর (Transcription):</span>
                              </div>
                              <p className="text-slate-800 italic font-medium leading-relaxed">
                                "{m.transcription}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Floating "Scroll to Latest" Button */}
              {showScrollBottom && (
                <button
                  onClick={() => scrollToBottom(true)}
                  className="absolute bottom-20 right-4 sm:right-6 z-20 px-3 py-1.5 sm:py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xl transition-all duration-200 flex items-center gap-1.5"
                  title="সর্বশেষ মেসেজে যান"
                >
                  <span className="text-[11px] sm:text-xs">সর্বশেষ</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Reply Input Bar - Sticky Bottom */}
              <form
                onSubmit={handleSendManualReply}
                className="p-2.5 sm:p-4 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] sm:pb-4 bg-white border-t border-slate-200/90 shrink-0"
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Quick 1-Click Human Mode Toggle in Input Bar */}
                  <button
                    type="button"
                    onClick={() => handleToggleAiForConv(selectedConv.id, !isConvAiActive(selectedConv))}
                    className={`px-2.5 py-2 rounded-xl border text-[11px] sm:text-xs font-bold transition-all shrink-0 h-[42px] flex items-center gap-1.5 ${
                      !isConvAiActive(selectedConv)
                        ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                    title={isConvAiActive(selectedConv) ? 'হিউম্যান মোডে নিন (AI বন্ধ হবে)' : 'AI চালু করুন'}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{!isConvAiActive(selectedConv) ? 'হিউম্যান' : 'AI'}</span>
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="ম্যানুয়াল রিপ্লাই লিখুন..."
                      autoComplete="off"
                      autoCorrect="off"
                      enterKeyHint="send"
                      className="w-full pl-3 sm:pl-4 pr-12 sm:pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-[15px] sm:text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all font-normal"
                    />
                    <span className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[9px] sm:text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1 sm:px-1.5 py-0.5 rounded border border-indigo-200/60 uppercase">
                      {selectedConv.channel || selectedConv.page?.channel || 'LIVE'}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="px-3 sm:px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs shrink-0 h-[42px]"
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span className="hidden sm:inline">যাচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">পাঠান</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">কোনো কথোপকথন নির্বাচন করা হয়নি</h4>
              <p className="text-xs text-slate-400 mt-1">বাম পাশের তালিকা থেকে একটি কাস্টমার চ্যাট সিলেক্ট করুন</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Order Creator Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setShowOrderModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">নতুন অর্ডার তৈরি করুন</h3>
            <p className="text-xs text-slate-500 mb-6">কথোপকথন থেকে সরাসরি অর্ডার বুক করুন</p>

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">গ্রাহকের নাম *</label>
                <input
                  type="text"
                  required
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ফোন নম্বর *</label>
                <input
                  type="tel"
                  required
                  value={orderForm.phone}
                  onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ডেলিভারি ঠিকানা *</label>
                <textarea
                  rows={2}
                  required
                  value={orderForm.address}
                  onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
                  placeholder="বাড়ি নং, রোড, থানা, জেলা"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পণ্য (Product) *</label>
                <input
                  type="text"
                  required
                  value={orderForm.product}
                  onChange={(e) => setOrderForm({ ...orderForm, product: e.target.value })}
                  placeholder="পণ্যের নাম ও সাইজ"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পরিমাণ</label>
                  <input
                    type="number"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মূল্য (৳)</label>
                  <input
                    type="number"
                    value={orderForm.price}
                    onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                    placeholder="মোট মূল্য"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  অর্ডার কনফার্ম করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
