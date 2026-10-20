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

export default function ConversationsPage() {
  const toast = useToast();
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
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
      if (!keepSelection) setLoadingList(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (channelFilter !== 'ALL') params.append('channel', channelFilter);

      const data = await apiFetch<any>(`/api/conversations?${params.toString()}`, { retries: 2 });

      if (data?.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
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
    try {
      setLoadingMessages(true);
      if (openMobileChat) {
        setMobileShowChat(true);
      }

      const data = await apiFetch<any>(`/api/conversations/${id}`, { retries: 2 });

      if (data?.success && data.conversation) {
        setSelectedConv(data.conversation);
        setMessages(data.messages || []);
        // Setup order form defaults
        setOrderForm({
          customerName: data.conversation.customerName || '',
          phone: '',
          address: '',
          product: '',
          quantity: '1',
          price: '',
          notes: '',
        });

        // Instant scroll to bottom without page jump
        setTimeout(() => {
          scrollToBottom(false);
        }, 60);
      }
    } catch (e) {
      toast.error('মেসেজ লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [search, statusFilter, channelFilter]);

  // Periodic follow-up automation runner (runs safely every 2 minutes while on dashboard)
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

  const handleSendManualReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !replyText.trim()) return;

    setSending(true);
    const sentText = replyText.trim();
    try {
      const res = await fetch(`/api/conversations/${selectedConv.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageText: sentText }),
      });

      const data = await res.json();
      if (data.success) {
        setReplyText('');
        setMessages((prev) => [...prev, data.savedMessage]);
        // Update current conversation last message preview
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConv.id
              ? { ...c, lastMessage: sentText, lastMessageAt: new Date().toISOString() }
              : c
          )
        );
        toast.success('মেসেজ সফলভাবে পাঠানো হয়েছে!');

        // Smooth scroll to newly added message
        setTimeout(() => {
          scrollToBottom(true);
        }, 80);
      } else {
        toast.error(data.error || 'মেসেজ পাঠাতে ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('মেসেজ পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setSending(false);
    }
  };

  const handleToggleAi = async () => {
    if (!selectedConv) return;
    const nextState = !selectedConv.aiEnabled;

    try {
      const res = await fetch(`/api/conversations/${selectedConv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiEnabled: nextState }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedConv(data.conversation);
        setConversations((prev) =>
          prev.map((c) => (c.id === data.conversation.id ? data.conversation : c))
        );
        toast.success(data.message);
      }
    } catch (e) {
      toast.error('AI স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে।');
    }
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
    >
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-140px)] min-h-[620px] max-h-[920px]">
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
                        <div className="flex items-center gap-1.5 truncate max-w-[140px]">
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
                        {c.aiEnabled ? (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-semibold shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> AI Active
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1 font-semibold shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Human Mode
                          </span>
                        )}
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
              <div className="p-4 border-b border-slate-200/90 bg-white flex items-center justify-between gap-3 shrink-0 shadow-xs">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileShowChat(false)}
                    className="lg:hidden p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900"
                    title="ইনবক্সে ফিরে যান"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    {selectedConv.customerName?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
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
                        <div className="flex items-center gap-1.5 group">
                          <h3 className="text-sm font-bold text-slate-900 leading-tight">
                            {selectedConv.customerName || `Customer (${selectedConv.senderPsid})`}
                          </h3>
                          <button
                            onClick={() => {
                              setTempCustomerName(selectedConv.customerName || '');
                              setEditingName(true);
                            }}
                            className="opacity-60 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity"
                            title="গ্রাহকের আসল নাম এডিট করুন"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
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
                        {selectedConv.channel || selectedConv.page?.channel || 'FACEBOOK'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>আইডি: <span className="font-mono text-slate-700 font-medium">{selectedConv.senderPsid}</span></span>
                      <span>•</span>
                      <span>চ্যানেল: <span className="text-slate-800 font-medium">{selectedConv.page?.pageName}</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors shadow-xs ${
                      showCustomerDetails
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-500/10'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title="গ্রাহকের বিস্তারিত ডাটা দেখুন"
                  >
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">গ্রাহক ডাটা</span>
                  </button>

                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors shadow-xs"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">অর্ডার তৈরি</span>
                  </button>

                  <button
                    onClick={handleToggleAi}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border shadow-xs ${
                      selectedConv.aiEnabled
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    {selectedConv.aiEnabled ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>AI পজ</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>AI চালু</span>
                      </>
                    )}
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

              {/* Message List - Isolated Scroll Container with Momentum Scrolling */}
              <div
                ref={chatContainerRef}
                onScroll={handleChatScroll}
                className="flex-1 min-h-0 chat-scroll-instant p-4 sm:p-6 space-y-4 relative bg-[#f8fafc]"
              >
                {loadingMessages ? (
                  <div className="py-24 text-center space-y-2">
                    <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div className="text-xs text-slate-500 font-medium">মেসেজ লোড হচ্ছে...</div>
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
                        className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
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
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
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
                            <div className="mt-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
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
                                  <span>ডাউনলোড / শুনুন</span>
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
                  className="absolute bottom-20 right-6 z-20 px-3 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xl transition-all duration-200 flex items-center gap-1.5"
                  title="সর্বশেষ মেসেজে যান"
                >
                  <span>সর্বশেষ মেসেজ</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Reply Input Bar - Sticky Bottom */}
              <form
                onSubmit={handleSendManualReply}
                className="p-4 bg-white border-t border-slate-200/90 shrink-0"
              >
                {!selectedConv.aiEnabled && (
                  <div className="mb-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5 font-medium">
                    <User className="w-3 h-3 text-amber-600" />
                    <span>হিউম্যান মোড সক্রিয় আছে। AI এখন কোনো অটোমেটিক রিপ্লাই দেবে না।</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`ম্যানুয়াল উত্তর লিখুন এবং সরাসরি ${selectedConv.channel || selectedConv.page?.channel || 'সোশ্যাল মিডিয়া'}-তে পাঠান...`}
                      className="w-full pl-4 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all font-normal"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60 uppercase">
                      {selectedConv.channel || selectedConv.page?.channel || 'LIVE'}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs shrink-0"
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>যাচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>সরাসরি পাঠান</span>
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
