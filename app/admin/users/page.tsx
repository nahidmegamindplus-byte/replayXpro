'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Layers,
  Globe,
  Edit2,
  X,
  Phone,
  Building,
  Key,
  Eye,
  EyeOff,
  MessageCircle,
  Bot,
  Ban,
  Shield,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  LogIn,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export default function AdminUsersPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'USERS' | 'IP_BLOCKS'>('USERS');
  const [users, setUsers] = useState<any[]>([]);
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [facebookPageUrl, setFacebookPageUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('USER');
  const [status, setStatus] = useState('ACTIVE');
  const [plan, setPlan] = useState('STARTER');
  const [planStatus, setPlanStatus] = useState('ACTIVE');
  const [monthlyMessageLimit, setMonthlyMessageLimit] = useState(500);
  const [aiChatEnabled, setAiChatEnabled] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add IP Block Modal State
  const [showIpBlockModal, setShowIpBlockModal] = useState(false);
  const [targetIp, setTargetIp] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockUserWithIp, setBlockUserWithIp] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>('/api/admin/users', { retries: 2 });
      if (data?.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (e) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedIps = async () => {
    try {
      const data = await apiFetch<any>('/api/admin/ip-block', { retries: 2 });
      if (data?.success && Array.isArray(data.blockedIps)) {
        setBlockedIps(data.blockedIps);
      }
    } catch (e) {
      // Handled safely
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBlockedIps();
  }, []);

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setFullName(user.fullName || '');
    setBusinessName(user.businessName || '');
    setFacebookPageUrl(user.facebookPageUrl || '');
    setPhone(user.phone || '');
    setRole(user.role || 'USER');
    setStatus(user.status || 'ACTIVE');
    setPlan(user.plan || 'STARTER');
    setPlanStatus(user.planStatus || 'ACTIVE');
    setMonthlyMessageLimit(user.monthlyMessageLimit || 500);
    setAiChatEnabled(user.aiChatEnabled !== false);
    setIsBlocked(Boolean(user.isBlocked));
    setNewPassword('');
    setShowNewPassword(false);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      const payload: any = {
        userId: editingUser.id,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        facebookPageUrl: facebookPageUrl.trim() || null,
        phone: phone.trim() || null,
        role,
        status,
        plan,
        planStatus,
        monthlyMessageLimit: Number(monthlyMessageLimit) || 500,
        aiChatEnabled,
        isBlocked,
      };

      if (newPassword && newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'ব্যবহারকারীর তথ্য সফলভাবে আপডেট হয়েছে!');
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  ...payload,
                  aiChatEnabled,
                  isBlocked,
                }
              : u
          )
        );
        setEditingUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ হয়েছে।');
      }
    } catch (e: any) {
      toast.error('সার্ভার যোগাযোগে ত্রুটি।');
    } finally {
      setSaving(false);
    }
  };

  // Instant 1-Click AI Chat Toggle with Optimistic UI
  const handleToggleAiChat = async (user: any) => {
    const nextVal = user.aiChatEnabled === false ? true : false;

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, aiChatEnabled: nextVal } : u))
    );

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, aiChatEnabled: nextVal }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          nextVal
            ? `🤖 ${user.fullName}-এর AI চ্যাট চালু (ON) করা হয়েছে!`
            : `🛑 ${user.fullName}-এর AI চ্যাট বন্ধ (OFF) করা হয়েছে!`
        );
      } else {
        // Revert on error
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, aiChatEnabled: !nextVal } : u))
        );
        toast.error(data.error || 'AI চ্যাট পরিবর্তন ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, aiChatEnabled: !nextVal } : u))
      );
      toast.error('সার্ভার ত্রুটি।');
    }
  };

  // Instant 1-Click User Account Status Toggle with Optimistic UI
  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    );

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: nextStatus }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`অ্যাকাউন্ট স্ট্যাটাস আপডেট হয়েছে: ${nextStatus === 'ACTIVE' ? 'সক্রিয়' : 'স্থগিত'}`);
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: currentStatus } : u))
        );
        toast.error(data.error || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: currentStatus } : u))
      );
      toast.error('সার্ভার ত্রুটি।');
    }
  };

  // Instant 1-Click User Block Toggle with Optimistic UI
  const handleToggleUserBlock = async (user: any) => {
    const nextVal = !user.isBlocked;

    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isBlocked: nextVal } : u))
    );

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, isBlocked: nextVal }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          nextVal
            ? `🚨 ${user.fullName} (${user.email}) কে ব্লক করা হয়েছে!`
            : `✅ ${user.fullName} (${user.email}) কে আনব্লক করা হয়েছে!`
        );
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isBlocked: !nextVal } : u))
        );
        toast.error(data.error || 'ব্লক স্ট্যাটাস পরিবর্তন ব্যর্থ।');
      }
    } catch (e) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isBlocked: !nextVal } : u))
      );
      toast.error('সার্ভার ত্রুটি।');
    }
  };

  // Block an IP Directly
  const handleQuickBlockIp = async (ip: string, userFullName?: string) => {
    if (!ip || ip === '127.0.0.1') {
      toast.error('বৈধ আইপি ঠিকানা প্রয়োজন।');
      return;
    }

    if (!confirm(`আপনি কি নিশ্চিতভাবে এই আইপি (${ip}) ব্লক করতে চান? এই আইপি থেকে কেউ লগইন বা রেজিস্ট্রেশন করতে পারবে না।`)) return;

    try {
      const res = await fetch('/api/admin/ip-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: ip,
          reason: userFullName ? `${userFullName}-এর আইপি ব্লক করা হয়েছে` : 'অ্যাডমিন দ্বারা ব্লক করা হয়েছে',
          blockUserWithIp: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `আইপি (${ip}) সফলভাবে ব্লক করা হয়েছে!`);
        fetchBlockedIps();
        fetchUsers();
      } else {
        toast.error(data.error || 'আইপি ব্লক করতে ব্যর্থ।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    }
  };

  // Unblock IP
  const handleUnblockIp = async (ipAddress: string) => {
    try {
      const res = await fetch(`/api/admin/ip-block?ipAddress=${encodeURIComponent(ipAddress)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`আইপি (${ipAddress}) আনব্লক করা হয়েছে!`);
        fetchBlockedIps();
        fetchUsers();
      } else {
        toast.error(data.error || 'আনব্লক করতে ব্যর্থ।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    }
  };

  // Submit Manual IP Block Form
  const handleAddIpBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetIp.trim()) return;

    setSavingBlock(true);
    try {
      const res = await fetch('/api/admin/ip-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: targetIp.trim(),
          reason: blockReason.trim() || 'ম্যানুয়াল অ্যাডমিন ব্লক',
          blockUserWithIp,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'আইপি সফলভাবে ব্লক করা হয়েছে!');
        setShowIpBlockModal(false);
        setTargetIp('');
        setBlockReason('');
        setBlockUserWithIp(false);
        fetchBlockedIps();
        fetchUsers();
      } else {
        toast.error(data.error || 'ব্লক করতে সমস্যা হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    } finally {
      setSavingBlock(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে ব্যবহারকারী "${email}" এবং তার সমস্ত ডাটা মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('ব্যবহারকারী সফলভাবে মুছে ফেলা হয়েছে।');
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        toast.error(data.error || 'মুছতে ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    }
  };

  const handleImpersonateUser = async (user: any) => {
    try {
      setImpersonatingId(user.id);
      toast.info(`${user.fullName}-এর ড্যাশবোর্ডে লগইন করা হচ্ছে...`);
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `${user.fullName}-এর অ্যাকাউন্টে প্রবেশ সফল!`);
        window.location.href = data.redirect || '/dashboard';
      } else {
        toast.error(data.error || 'লগইন ব্যর্থ হয়েছে।');
        setImpersonatingId(null);
      }
    } catch (e) {
      toast.error('সার্ভার যোগাযোগে ত্রুটি।');
      setImpersonatingId(null);
    }
  };

  const blockedIpSet = new Set(blockedIps.map((b) => b.ipAddress));

  const filteredUsers = (users || []).filter(
    (u) =>
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      u.registrationIp?.toLowerCase().includes(search.toLowerCase()) ||
      u.lastLoginIp?.toLowerCase().includes(search.toLowerCase()) ||
      u.facebookPageUrl?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout
      title="👥 ব্যবহারকারী ও আইপি সিকিউরিটি (User & IP Security)"
      subtitle="রেজিস্টার্ড ইউজার, AI চ্যাট অন/অফ কন্ট্রোল, আইপি ট্র্যাকিং ও আইপি ব্লক ব্যবস্থাপনা"
    >
      {/* Tab Switcher & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('USERS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'USERS'
                  ? 'bg-white text-purple-700 shadow-xs ring-1 ring-purple-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ব্যবহারকারী তালিকা ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('IP_BLOCKS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'IP_BLOCKS'
                  ? 'bg-white text-rose-700 shadow-xs ring-1 ring-rose-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>আইপি ব্লক লিস্ট ({blockedIps.length})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'USERS' ? (
            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="নাম, ইমেইল, IP বা FB Page খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 shadow-xs transition-all"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowIpBlockModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন আইপি ব্লক করুন</span>
            </button>
          )}

          <button
            onClick={() => {
              fetchUsers();
              fetchBlockedIps();
              toast.success('তথ্য রিফ্রেশ করা হয়েছে');
            }}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-purple-600 shadow-xs transition-colors"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'USERS' && (
        <>
          {loading ? (
            <div className="py-24 text-center text-sm text-slate-500">ব্যবহারকারী তালিকা লোড হচ্ছে...</div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">ব্যবহারকারী</th>
                      <th className="py-3.5 px-4 font-semibold">ব্যবসা ও ফেসবুক পেজ</th>
                      <th className="py-3.5 px-4 font-semibold">AI চ্যাট কন্ট্রোল</th>
                      <th className="py-3.5 px-4 font-semibold">IP ট্র্যাকিং ও ব্লক</th>
                      <th className="py-3.5 px-4 font-semibold">প্ল্যান / সাবস্ক্রিপশন</th>
                      <th className="py-3.5 px-4 font-semibold">অ্যাকাউন্ট স্ট্যাটাস</th>
                      <th className="py-3.5 px-4 font-semibold">তারিখ</th>
                      <th className="py-3.5 px-4 font-semibold text-right">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const isRegIpBlocked = u.registrationIp && blockedIpSet.has(u.registrationIp);
                      const isLoginIpBlocked = u.lastLoginIp && blockedIpSet.has(u.lastLoginIp);

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* User Info */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {u.role === 'ADMIN' && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 text-[9px] font-bold border border-purple-200">
                                  ADMIN
                                </span>
                              )}
                              {u.isBlocked && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-bold border border-rose-200">
                                  BLOCKED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                            {u.phone && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-mono">{u.phone}</span>
                                <a
                                  href={`https://wa.me/${u.phone.replace(/[^\d]/g, '').replace(/^01/, '8801')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[9px] font-bold"
                                  title="WhatsApp এ কথা বলুন"
                                >
                                  <MessageCircle className="w-2.5 h-2.5" />
                                  <span>WhatsApp</span>
                                </a>
                              </div>
                            )}
                          </td>

                          {/* Business & Page */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 mb-0.5">{u.businessName || 'N/A'}</div>
                            {u.facebookPageUrl ? (
                              <a
                                href={u.facebookPageUrl.startsWith('http') ? u.facebookPageUrl : `https://${u.facebookPageUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 hover:underline max-w-[200px] truncate"
                                title={u.facebookPageUrl}
                              >
                                <Globe className="w-3 h-3 shrink-0" />
                                <span className="truncate">{u.facebookPageUrl.replace(/^https?:\/\/(www\.)?facebook\.com\//, '')}</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400">পেজ লিঙ্ক নেই</span>
                            )}
                          </td>

                          {/* AI Chat ON / OFF Toggle */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleAiChat(u)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                                u.aiChatEnabled !== false
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 ring-1 ring-emerald-500/20'
                                  : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 ring-1 ring-rose-500/20'
                              }`}
                              title={u.aiChatEnabled !== false ? 'AI চ্যাট বন্ধ করতে ক্লিক করুন' : 'AI চ্যাট চালু করতে ক্লিক করুন'}
                            >
                              <Bot className="w-3.5 h-3.5" />
                              <span>{u.aiChatEnabled !== false ? '🟢 AI চালু (ON)' : '🔴 AI বন্ধ (OFF)'}</span>
                            </button>
                          </td>

                          {/* IP Tracking & IP Block Button */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {/* Reg IP */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400">Reg:</span>
                                <span className="font-mono text-[11px] text-slate-700 font-semibold">
                                  {u.registrationIp || '127.0.0.1'}
                                </span>
                                {u.registrationIp && u.registrationIp !== '127.0.0.1' && (
                                  isRegIpBlocked ? (
                                    <button
                                      type="button"
                                      onClick={() => handleUnblockIp(u.registrationIp)}
                                      className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-[9px] font-bold cursor-pointer"
                                      title="আইপি আনব্লক করুন"
                                    >
                                      🚫 ব্লকড (আনব্লক)
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickBlockIp(u.registrationIp, u.fullName)}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 border border-slate-200 text-[9px] font-bold transition-colors cursor-pointer"
                                      title="এই আইপি ব্লক করুন"
                                    >
                                      🚫 IP ব্লক
                                    </button>
                                  )
                                )}
                              </div>

                              {/* Login IP */}
                              {u.lastLoginIp && u.lastLoginIp !== u.registrationIp && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400">Last:</span>
                                  <span className="font-mono text-[11px] text-slate-700 font-semibold">
                                    {u.lastLoginIp}
                                  </span>
                                  {u.lastLoginIp !== '127.0.0.1' && (
                                    isLoginIpBlocked ? (
                                      <button
                                        type="button"
                                        onClick={() => handleUnblockIp(u.lastLoginIp)}
                                        className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-[9px] font-bold cursor-pointer"
                                      >
                                        🚫 ব্লকড
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleQuickBlockIp(u.lastLoginIp, u.fullName)}
                                        className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 border border-slate-200 text-[9px] font-bold transition-colors cursor-pointer"
                                      >
                                        🚫 IP ব্লক
                                      </button>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Plan & Subscription */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-semibold text-purple-700 text-xs">{u.plan}</div>
                            <span
                              className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.planStatus === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : u.planStatus === 'PENDING_APPROVAL'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {u.planStatus === 'ACTIVE'
                                ? '✓ প্যাকেজ সক্রিয়'
                                : u.planStatus === 'PENDING_APPROVAL'
                                ? '⏳ অপেক্ষমান'
                                : '✕ প্যাকেজ নেই'}
                            </span>
                          </td>

                          {/* Account Status / Block */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u.id, u.status)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors w-fit cursor-pointer ${
                                  u.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                <span>{u.status === 'ACTIVE' ? 'সক্রিয়' : 'স্থগিত'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleUserBlock(u)}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors w-fit cursor-pointer ${
                                  u.isBlocked
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                                }`}
                              >
                                <Ban className="w-3 h-3" />
                                <span>{u.isBlocked ? 'ইউজার ব্লকড' : 'ইউজার ব্লক'}</span>
                              </button>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleImpersonateUser(u)}
                                disabled={impersonatingId === u.id}
                                className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                                title="১-ক্লিকে এই ইউজারের ড্যাশবোর্ডে প্রবেশ করুন এবং সব কাজ করুন"
                              >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>{impersonatingId === u.id ? 'লগইন হচ্ছে...' : 'লগইন (অ্যাক্সেস)'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(u)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 transition-colors shadow-2xs cursor-pointer"
                                title="সম্পাদনা ও সেটিংস"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(u)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 transition-colors shadow-2xs cursor-pointer"
                                title="পাসওয়ার্ড রিসেট করুন"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: IP BLOCKLIST MANAGEMENT */}
      {activeTab === 'IP_BLOCKS' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>স্থায়ীভাবে ব্লককৃত আইপি তালিকা (Active Blocked IPs)</span>
              </h3>
              <p className="text-xs text-slate-500">
                এই আইপিগুলো থেকে যেকোনো লগইন, সাইনআপ বা রিকুয়েস্ট তাৎক্ষণিকভাবে 403 Forbidden দ্বারা ব্লক করা হয়।
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowIpBlockModal(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন আইপি ব্লক</span>
            </button>
          </div>

          {blockedIps.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              কোনো আইপি ব্লক করা নেই। সিস্টেম সম্পূর্ণ সুরক্ষিত।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 font-semibold">আইপি ঠিকানা (IP Address)</th>
                    <th className="py-3 px-4 font-semibold">ব্লক করার কারণ</th>
                    <th className="py-3 px-4 font-semibold">ব্লক করেছেন</th>
                    <th className="py-3 px-4 font-semibold">তারিখ ও সময়</th>
                    <th className="py-3 px-4 font-semibold text-right">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {blockedIps.map((b) => (
                    <tr key={b.id} className="hover:bg-rose-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-700 text-xs">
                        {b.ipAddress}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800">
                        {b.reason || 'অ্যাডমিন একশন'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {b.blockedBy || 'ADMIN'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleUnblockIp(b.ipAddress)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          ✅ আনব্লক করুন
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manual IP Block Modal */}
      {showIpBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowIpBlockModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              <span>নতুন আইপি ব্লক করুন (Block IP)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              নির্দিষ্ট কোনো আইপি থেকে সিস্টেমে প্রবেশ নিষিদ্ধ করতে আইপি ও কারণ লিখুন।
            </p>

            <form onSubmit={handleAddIpBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  আইপি ঠিকানা (IP Address) *
                </label>
                <input
                  type="text"
                  required
                  value={targetIp}
                  onChange={(e) => setTargetIp(e.target.value)}
                  placeholder="যেমন: 103.145.78.22"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ব্লক করার কারণ (Reason)
                </label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="যেমন: স্প্যামিং / অননুমোদিত অ্যাক্সেস"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center gap-2">
                <input
                  type="checkbox"
                  id="blockUserWithIpCheck"
                  checked={blockUserWithIp}
                  onChange={(e) => setBlockUserWithIp(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                />
                <label htmlFor="blockUserWithIpCheck" className="text-xs text-rose-900 cursor-pointer font-medium">
                  এই আইপি যুক্ত সমস্ত অ্যাকাউন্টও ব্লক করুন
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIpBlockModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingBlock || !targetIp.trim()}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingBlock ? 'ব্লক হচ্ছে...' : 'আইপি ব্লক নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-purple-600" />
              <span>ব্যবহারকারী প্রোফাইল ও প্ল্যান এডিট</span>
            </h3>
            <p className="text-xs text-slate-500 mb-5 font-mono">{editingUser.email}</p>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পুরো নাম *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ব্যবসার নাম *</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ফেসবুক পেজ লিঙ্ক (URL)</label>
                <input
                  type="text"
                  value={facebookPageUrl}
                  onChange={(e) => setFacebookPageUrl(e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ফোন নম্বর</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">রোল (Role)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  >
                    <option value="USER">USER (সাধারণ ইউজার)</option>
                    <option value="ADMIN">ADMIN (অ্যাডমিন)</option>
                  </select>
                </div>
              </div>

              {/* Package & Plan Status Settings */}
              <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
                <h4 className="text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>সাবস্ক্রিপশন ও মেসেজ লিমিট নিয়ন্ত্রণ</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      প্যাকেজ প্ল্যান
                    </label>
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-purple-900"
                    >
                      <option value="FREE">FREE (ফ্রি)</option>
                      <option value="STARTER">STARTER</option>
                      <option value="BUSINESS">BUSINESS</option>
                      <option value="PRO">PRO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      প্ল্যান স্ট্যাটাস
                    </label>
                    <select
                      value={planStatus}
                      onChange={(e) => setPlanStatus(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-purple-900"
                    >
                      <option value="ACTIVE">✓ ACTIVE (সক্রিয়)</option>
                      <option value="PENDING_APPROVAL">⏳ PENDING (অপেক্ষমান)</option>
                      <option value="INACTIVE">✕ INACTIVE (নিষ্ক্রিয়)</option>
                      <option value="EXPIRED">⚠️ EXPIRED (মেয়াদোত্তীর্ণ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      মাসিক মেসেজ লিমিট
                    </label>
                    <input
                      type="number"
                      value={monthlyMessageLimit}
                      onChange={(e) => setMonthlyMessageLimit(parseInt(e.target.value, 10) || 500)}
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* AI Chat & Block Controls in Edit Modal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    AI স্বয়ংক্রিয় চ্যাট
                  </label>
                  <select
                    value={aiChatEnabled ? 'true' : 'false'}
                    onChange={(e) => setAiChatEnabled(e.target.value === 'true')}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="true">🟢 চালু (Enabled)</option>
                    <option value="false">🔴 বন্ধ (Disabled)</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    অ্যাকাউন্ট স্ট্যাটাস
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="ACTIVE">🟢 সক্রিয় (Active)</option>
                    <option value="DISABLED">⚪ স্থগিত (Disabled)</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    ইউজার ব্লক
                  </label>
                  <select
                    value={isBlocked ? 'true' : 'false'}
                    onChange={(e) => setIsBlocked(e.target.value === 'true')}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="false">✅ স্বাভাবিক (Normal)</option>
                    <option value="true">🚨 ব্লকড (Blocked)</option>
                  </select>
                </div>
              </div>

              {/* Password Reset */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  নতুন পাসওয়ার্ড সেট করুন (পরিবর্তন না করতে চাইলে খালি রাখুন)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষর..."
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : 'সব তথ্য সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
