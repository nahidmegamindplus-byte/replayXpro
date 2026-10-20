'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';
import {
  Clock,
  Send,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Play,
  Calendar,
  Layers,
  ShieldAlert,
  Users,
  X,
  MessageSquare,
} from 'lucide-react';

interface GlobalScheduleStep {
  id?: string;
  stepNumber: number;
  dayOffset: number;
  timeOfDay: string;
  title: string;
  guidelinePrompt?: string | null;
  isEnabled: boolean;
  isGlobalDefault?: boolean;
}

interface AdminFollowUpLog {
  id: string;
  stepNumber: number;
  dayOffset: number;
  scheduledTime?: string;
  messageText: string;
  channel: string;
  customerName?: string;
  senderPsid: string;
  status: string;
  aiModel?: string;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
  page?: { id: string; pageName: string; channel: string };
  conversation?: {
    id: string;
    customerName?: string;
    followUpStatus: string;
    currentFollowUpStep: number;
  };
}

export default function AdminFollowUpPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [savingSteps, setSavingSteps] = useState(false);

  // States
  const [globalSteps, setGlobalSteps] = useState<GlobalScheduleStep[]>([]);
  const [stats, setStats] = useState({
    totalLogs: 0,
    activePagesCount: 0,
    inProgressCount: 0,
    repliedCount: 0,
    convertedCount: 0,
  });
  const [recentLogs, setRecentLogs] = useState<AdminFollowUpLog[]>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    dayOffset: 1,
    timeOfDay: '10:00',
    title: '',
    guidelinePrompt: '',
    isEnabled: true,
  });

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>('/api/admin/follow-up', { retries: 2 });
      if (data?.success) {
        setGlobalSteps(Array.isArray(data.globalSteps) ? data.globalSteps : []);
        setStats(data.stats || {});
        setRecentLogs(Array.isArray(data.recentLogs) ? data.recentLogs : []);
      }
    } catch (e) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // System-wide Trigger
  const handleTriggerAll = async () => {
    try {
      setTriggering(true);
      const res = await fetch('/api/admin/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TRIGGER_ALL' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'সিস্টেম-ওয়াইড ফলো-আপ সম্পন্ন!');
        fetchAdminData();
      } else {
        toast.error(data.error || 'প্রক্রিয়া চালাতে ব্যর্থ হয়েছে');
      }
    } catch (e) {
      toast.error('সার্ভার এরর');
    } finally {
      setTriggering(false);
    }
  };

  // Open Modal
  const openAddModal = () => {
    const nextNum = globalSteps.length + 1;
    const lastDay = globalSteps.length > 0 ? globalSteps[globalSteps.length - 1].dayOffset : 0;
    const suggestedDay = lastDay === 0 ? 1 : lastDay < 3 ? 3 : lastDay < 7 ? 7 : lastDay < 15 ? 15 : 25;

    setEditingIndex(null);
    setFormData({
      dayOffset: suggestedDay,
      timeOfDay: '10:00',
      title: `${nextNum}ম ফলো-আপ (${suggestedDay} দিন পর)`,
      guidelinePrompt: '',
      isEnabled: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (index: number) => {
    const target = globalSteps[index];
    setEditingIndex(index);
    setFormData({
      dayOffset: target.dayOffset,
      timeOfDay: target.timeOfDay,
      title: target.title,
      guidelinePrompt: target.guidelinePrompt || '',
      isEnabled: target.isEnabled,
    });
    setModalOpen(true);
  };

  // Save Modal Step
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [...globalSteps];

    if (editingIndex !== null) {
      updated[editingIndex] = {
        ...updated[editingIndex],
        dayOffset: Number(formData.dayOffset),
        timeOfDay: formData.timeOfDay,
        title: formData.title || `ধাপ #${editingIndex + 1}`,
        guidelinePrompt: formData.guidelinePrompt,
        isEnabled: formData.isEnabled,
      };
    } else {
      updated.push({
        stepNumber: updated.length + 1,
        dayOffset: Number(formData.dayOffset),
        timeOfDay: formData.timeOfDay,
        title: formData.title || `ধাপ #${updated.length + 1}`,
        guidelinePrompt: formData.guidelinePrompt,
        isEnabled: formData.isEnabled,
        isGlobalDefault: true,
      });
    }

    updated.sort((a, b) => a.dayOffset - b.dayOffset);
    const finalSteps = updated.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));

    setGlobalSteps(finalSteps);
    setModalOpen(false);
    await persistGlobalSteps(finalSteps);
  };

  const handleDeleteStep = async (index: number) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই গ্লোবাল ডিফল্ট ধাপটি মুছে ফেলতে চান?')) return;
    const filtered = globalSteps.filter((_, idx) => idx !== index);
    const finalSteps = filtered.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setGlobalSteps(finalSteps);
    await persistGlobalSteps(finalSteps);
  };

  const handleToggleStep = async (index: number) => {
    const updated = [...globalSteps];
    updated[index].isEnabled = !updated[index].isEnabled;
    setGlobalSteps(updated);
    await persistGlobalSteps(updated);
  };

  const persistGlobalSteps = async (stepsToSave: GlobalScheduleStep[]) => {
    try {
      setSavingSteps(true);
      const res = await fetch('/api/admin/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_GLOBAL_STEPS',
          steps: stepsToSave,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('গ্লোবাল শিডিউল সংরক্ষিত হয়েছে!');
      } else {
        toast.error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch (e) {
      toast.error('সার্ভার কানেকশন ত্রুটি');
    } finally {
      setSavingSteps(false);
    }
  };

  const handleResetToSystemDefault = async () => {
    if (!confirm('সিস্টেম স্ট্যান্ডার্ড ৫-ধাপের ডিফল্ট শিডিউলে রিসেট করতে চান?')) return;
    const defaultSteps: GlobalScheduleStep[] = [
      {
        stepNumber: 1,
        dayOffset: 1,
        timeOfDay: '10:00',
        title: '১ম ফলো-আপ (১ দিন পর - সকাল ১০টা)',
        guidelinePrompt: 'পছন্দের পণ্য নিয়ে কোনো প্রশ্ন আছে কিনা নম্রভাবে ও আন্তরিকভাবে জানতে চান।',
        isEnabled: true,
        isGlobalDefault: true,
      },
      {
        stepNumber: 2,
        dayOffset: 3,
        timeOfDay: '16:00',
        title: '২য় ফলো-আপ (৩ দিন পর - বিকাল ৪টা)',
        guidelinePrompt: 'পণ্যের প্রিমিয়াম কোয়ালিটি ও ক্যাশ অন ডেলিভারি (COD) সুবিধার কথা মনে করিয়ে দিন।',
        isEnabled: true,
        isGlobalDefault: true,
      },
      {
        stepNumber: 3,
        dayOffset: 7,
        timeOfDay: '20:00',
        title: '৩য় ফলো-আপ (৭ দিন পর - রাত ৮টা)',
        guidelinePrompt: 'স্টক সীমিত হতে পারে এমন বন্ধুত্বপূর্ণ রিমাইন্ডার দিন।',
        isEnabled: true,
        isGlobalDefault: true,
      },
      {
        stepNumber: 4,
        dayOffset: 15,
        timeOfDay: '11:00',
        title: '৪র্থ ফলো-আপ (১৫ দিন পর - সকাল ১১টা)',
        guidelinePrompt: 'কোনো সাহায্য লাগবে কিনা বা পছন্দের অন্য পণ্য দেখতে চান কিনা জানতে চান।',
        isEnabled: true,
        isGlobalDefault: true,
      },
      {
        stepNumber: 5,
        dayOffset: 25,
        timeOfDay: '17:00',
        title: '৫ম ফলো-আপ (২৫ দিন পর - বিকাল ৫টা)',
        guidelinePrompt: 'মাসের সমাপনী আন্তরিক সম্ভাষণ ও যেকোনো প্রয়োজনে যোগাযোগের আহ্বান জানান।',
        isEnabled: true,
        isGlobalDefault: true,
      },
    ];

    setGlobalSteps(defaultSteps);
    await persistGlobalSteps(defaultSteps);
  };

  const formatTimeDisplay = (time24: string) => {
    if (!time24) return '১০:০০ AM';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  return (
    <AdminLayout
      title="গ্লোবাল AI ফলো-আপ কন্ট্রোল ও শিডিউল"
      subtitle="প্ল্যাটফর্মের সকল ব্যবহারকারীর জন্য ডিফল্ট ফলো-আপ ধাপ নিয়ন্ত্রণ ও সার্বিক অডিট লগ মনিটর করুন।"
    >
      <div className="space-y-8">
        {/* Top Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                গ্লোবাল AI ফলো-আপ কন্ট্রোল ও শিডিউল
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                  সিস্টেম মাস্টার টেমপ্লেট
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                প্ল্যাটফর্মের সকল ব্যবহারকারীর জন্য ডিফল্ট ফলো-আপ ধাপ নিয়ন্ত্রণ ও সার্বিক অডিট লগ মনিটর করুন।
              </p>
            </div>
          </div>

          <button
            onClick={handleTriggerAll}
            disabled={triggering}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${triggering ? 'animate-spin' : ''}`} />
            {triggering ? 'স্ক্যান ও প্রসেসিং হচ্ছে...' : 'সিস্টেম-ওয়াইড ফলো-আপ রান করুন'}
          </button>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">মোট পাঠানো মেসেজ</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalLogs || 0}</h3>
              <p className="text-xs text-purple-600 font-medium mt-0.5">সারা প্ল্যাটফর্মে</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Send className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">সক্রিয় পেজসমূহ</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.activePagesCount || 0}</h3>
              <p className="text-xs text-slate-400 mt-0.5">ফলো-আপ সক্রিয় আছে</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">চলমান পাইপলাইন</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.inProgressCount || 0}</h3>
              <p className="text-xs text-slate-400 mt-0.5">গ্রাহক চলমান ধাপে আছেন</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">কাস্টমার রিপ্লাইড</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.repliedCount || 0}</h3>
              <p className="text-xs text-slate-400 mt-0.5">মেসেজের পর চ্যাট করেছে</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">অর্ডার সম্পন্ন</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{stats.convertedCount || 0}</h3>
              <p className="text-xs text-slate-400 mt-0.5">কনভার্সন অর্জন</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Global Default Schedule Builder */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                গ্লোবাল ডিফল্ট ফলো-আপ শিডিউল
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                  মাস্টার টেমপ্লেট
                </span>
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                যেসব ব্যবহারকারী কাস্টম শিডিউল তৈরি করবেন না, তাদের জন্য স্বয়ংক্রিয়ভাবে এই ডিফল্ট শিডিউলটি কার্যকর হবে।
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleResetToSystemDefault}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                স্ট্যান্ডার্ড ৫-ধাপে রিসেট
              </button>

              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                নতুন গ্লোবাল ধাপ যোগ করুন
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
              গ্লোবাল শিডিউল লোড হচ্ছে...
            </div>
          ) : globalSteps.length === 0 ? (
            <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">কোনো গ্লোবাল শিডিউল তৈরি করা নেই</p>
            </div>
          ) : (
            <div className="space-y-3">
              {globalSteps.map((step, idx) => (
                <div
                  key={step.id || idx}
                  className={`p-5 rounded-xl border transition-all ${
                    step.isEnabled
                      ? 'bg-white border-slate-200/90 shadow-xs hover:border-purple-300'
                      : 'bg-slate-50/70 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
                        #{step.stepNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                            {step.dayOffset} দিন পর
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeDisplay(step.timeOfDay)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="font-semibold text-slate-700">AI নির্দেশিকা:</span>
                          {step.guidelinePrompt || 'স্বাভাবিক ও আন্তরিক ভঙ্গিতে ফলো-আপ করুন।'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={step.isEnabled}
                          onChange={() => handleToggleStep(idx)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>

                      <button
                        onClick={() => openEditModal(idx)}
                        className="p-2 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="এডিট করুন"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteStep(idx)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform-wide Audit Trail & Log Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">প্ল্যাটফর্ম-ওয়াইড ফলো-আপ অডিট ট্রেইল</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              সকল ব্যবহারকারী ও পেজের মাধ্যমে প্রেরিত সাম্প্রতিক ফলো-আপ মেসেজের লাইভ লগ।
            </p>
          </div>

          {recentLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Send className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">কোনো ফলো-আপ লগ পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold text-xs">
                    <th className="py-3.5 px-4 rounded-l-xl">ইউজার ও পেজ</th>
                    <th className="py-3.5 px-4">গ্রাহক ও চ্যানেল</th>
                    <th className="py-3.5 px-4">ধাপ</th>
                    <th className="py-3.5 px-4">প্রেরিত মেসেজ</th>
                    <th className="py-3.5 px-4 rounded-r-xl">তারিখ ও সময়</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900">{log.user?.fullName || 'User'}</div>
                        <div className="text-xs text-slate-400">
                          {log.page?.pageName || 'Page'} ({log.user?.email || ''})
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900">{log.customerName || log.senderPsid}</div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium">
                          {log.channel}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          ধাপ #{log.stepNumber} ({log.dayOffset} দিন পর)
                        </span>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-xs text-slate-700 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                          &ldquo;{log.messageText}&rdquo;
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block">মডেল: {log.aiModel || 'AI'}</span>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('bn-BD', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* ADMIN STEP MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingIndex !== null ? 'গ্লোবাল ধাপ সম্পাদনা' : 'নতুন গ্লোবাল ডিফল্ট ধাপ'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              সকল ব্যবহারকারীর জন্য ডিফল্ট ফলো-আপ সময় ও AI গাইডলাইন নির্ধারণ করুন।
            </p>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কয় দিন পর? (Day Offset)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={formData.dayOffset}
                    onChange={(e) => setFormData({ ...formData, dayOffset: parseInt(e.target.value, 10) || 1 })}
                    className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কখন পাঠাবে? (Time of Day)
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.timeOfDay}
                    onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                    className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ধাপের টাইটেল
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  AI ফলো-আপ নির্দেশনা (Guideline Prompt)
                </label>
                <textarea
                  rows={3}
                  value={formData.guidelinePrompt}
                  onChange={(e) => setFormData({ ...formData, guidelinePrompt: e.target.value })}
                  className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="adminStepEnabled"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <label htmlFor="adminStepEnabled" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  এই গ্লোবাল ধাপটি সক্রিয় রাখুন
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingSteps}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all"
                >
                  {savingSteps ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
