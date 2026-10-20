'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
  MessageSquare,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Play,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Eye,
  X,
  ArrowRight,
  Settings2,
  Zap,
  RotateCcw,
  Repeat,
  Check,
  MessageSquareReply,
} from 'lucide-react';

interface ScheduleStep {
  id?: string;
  stepNumber: number;
  dayOffset: number;
  timeOfDay: string;
  title: string;
  guidelinePrompt?: string | null;
  isEnabled: boolean;
}

interface FollowUpLogItem {
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
  page?: { id: string; pageName: string; channel: string };
  conversation?: {
    id: string;
    customerName?: string;
    followUpStatus: string;
    currentFollowUpStep: number;
  };
}

interface ConversationItem {
  id: string;
  customerName?: string;
  senderPsid: string;
  channel: string;
  followUpStatus: string;
  currentFollowUpStep: number;
  nextFollowUpDueAt?: string;
  lastFollowUpSentAt?: string;
  lastMessage?: string;
  lastMessageAt: string;
  createdAt: string;
  page?: { id: string; pageName: string; channel: string };
  followUpLogs?: FollowUpLogItem[];
}

interface PageFollowUpSettings {
  id?: string;
  followUpEnabled: boolean;
  followUpWaitMinutes: number;
  followUpOnlySeen: boolean;
  followUpFrequency: string; // 'ONCE' | 'DAILY' | 'CUSTOM_INTERVAL'
  followUpIntervalHours: number;
  followUpMaxCount: number;
  followUpMessage: string;
}

export default function FollowUpPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [runningManual, setRunningManual] = useState(false);
  const [savingSteps, setSavingSteps] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Data states
  const [steps, setSteps] = useState<ScheduleStep[]>([]);
  const [pageSettings, setPageSettings] = useState<PageFollowUpSettings>({
    followUpEnabled: true,
    followUpWaitMinutes: 30,
    followUpOnlySeen: true,
    followUpFrequency: 'CUSTOM_INTERVAL',
    followUpIntervalHours: 24,
    followUpMaxCount: 5,
    followUpMessage: '',
  });

  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    inProgressCount: 0,
    repliedCount: 0,
    convertedCount: 0,
    completedCount: 0,
    totalSentLogs: 0,
    conversionRate: 0,
  });
  const [recentLogs, setRecentLogs] = useState<FollowUpLogItem[]>([]);
  const [activeConversations, setActiveConversations] = useState<ConversationItem[]>([]);
  const [pages, setPages] = useState<Array<{ id: string; pageName: string; channel: string; followUpEnabled: boolean }>>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'rules' | 'schedule' | 'pipeline' | 'logs'>('rules');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Step Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [stepTimeUnit, setStepTimeUnit] = useState<'minutes' | 'hours' | 'days'>('days');
  const [stepCustomMinutes, setStepCustomMinutes] = useState<number>(30);
  const [stepCustomHours, setStepCustomHours] = useState<number>(2);
  const [stepFormData, setStepFormData] = useState({
    dayOffset: 1,
    timeOfDay: '10:00',
    title: '',
    guidelinePrompt: '',
    isEnabled: true,
  });

  // History Modal
  const [historyModalConv, setHistoryModalConv] = useState<ConversationItem | null>(null);

  const fetchFollowUpData = async (pageId?: string) => {
    try {
      setLoading(true);
      const url = pageId ? `/api/follow-up?pageId=${pageId}` : '/api/follow-up';
      const data = await apiFetch<any>(url, { retries: 2 });
      if (data?.success) {
        setSteps(data.steps || []);
        setMetrics(data.metrics || {});
        setRecentLogs(data.recentLogs || []);
        setActiveConversations(data.activeConversations || []);
        setPages(data.pages || []);
        if (data.pageSettings) {
          setPageSettings({
            followUpEnabled: Boolean(data.pageSettings.followUpEnabled),
            followUpWaitMinutes: data.pageSettings.followUpWaitMinutes ?? 30,
            followUpOnlySeen: data.pageSettings.followUpOnlySeen !== false,
            followUpFrequency: data.pageSettings.followUpFrequency || 'CUSTOM_INTERVAL',
            followUpIntervalHours: data.pageSettings.followUpIntervalHours ?? 24,
            followUpMaxCount: data.pageSettings.followUpMaxCount ?? 5,
            followUpMessage: data.pageSettings.followUpMessage || '',
          });
        }
      }
    } catch (e: any) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUpData(selectedPageId || undefined);
  }, [selectedPageId]);

  // Run Manual Follow-up Check
  const handleRunManual = async () => {
    try {
      setRunningManual(true);
      const res = await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TRIGGER', pageId: selectedPageId || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'ফলো-আপ চেক সফলভাবে সম্পন্ন হয়েছে!');
        fetchFollowUpData(selectedPageId || undefined);
      } else {
        toast.error(data.error || 'প্রক্রিয়া চালাতে সমস্যা হয়েছে');
      }
    } catch (e) {
      toast.error('সার্ভার এরর');
    } finally {
      setRunningManual(false);
    }
  };

  // Save Page-level Follow-up Settings
  const handleSavePageSettings = async (updatedSettings?: Partial<PageFollowUpSettings>) => {
    const payload = {
      ...pageSettings,
      ...(updatedSettings || {}),
    };
    try {
      setSavingSettings(true);
      const res = await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PAGE_SETTINGS',
          pageId: selectedPageId || undefined,
          ...payload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (updatedSettings) {
          setPageSettings(payload);
        }
        toast.success('অটোমেটেড ফলো-আপ রুলস ও সেটিংস সংরক্ষিত হয়েছে!');
        fetchFollowUpData(selectedPageId || undefined);
      } else {
        toast.error(data.error || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch (e) {
      toast.error('সার্ভার কানেকশন ত্রুটি');
    } finally {
      setSavingSettings(false);
    }
  };

  // Helper: compute total minutes of a step for precise sorting
  const getStepTotalMinutes = (step: ScheduleStep): number => {
    if (step.timeOfDay?.startsWith('MIN:')) {
      const mins = parseInt(step.timeOfDay.replace('MIN:', ''), 10);
      return isNaN(mins) || mins <= 0 ? 1 : mins;
    }
    if (step.timeOfDay?.startsWith('HR:')) {
      const hrs = parseInt(step.timeOfDay.replace('HR:', ''), 10);
      return isNaN(hrs) || hrs <= 0 ? 60 : hrs * 60;
    }
    if (step.dayOffset === 0 && step.timeOfDay?.includes(':')) {
      const [h, m] = step.timeOfDay.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        return Math.max(1, h * 60 + m);
      }
    }
    return Math.max(1, step.dayOffset || 1) * 24 * 60;
  };

  // Helper: format step timing for badges and UI
  const formatStepTimingDisplay = (step: ScheduleStep) => {
    if (step.timeOfDay?.startsWith('MIN:')) {
      const mins = parseInt(step.timeOfDay.replace('MIN:', ''), 10) || 1;
      return {
        badge: `${mins} মিনিট পর`,
        timeText: 'তাৎক্ষণিক/মিনিট শিডিউল',
        isMinute: true,
      };
    }
    if (step.timeOfDay?.startsWith('HR:')) {
      const hrs = parseInt(step.timeOfDay.replace('HR:', ''), 10) || 1;
      return {
        badge: `${hrs} ঘণ্টা পর`,
        timeText: 'ঘণ্টা ভিত্তিক শিডিউল',
        isHour: true,
      };
    }
    if (step.dayOffset === 0) {
      return {
        badge: 'একই দিনে',
        timeText: formatTimeDisplay(step.timeOfDay),
        isDay: true,
      };
    }
    return {
      badge: `${step.dayOffset} দিন পর`,
      timeText: formatTimeDisplay(step.timeOfDay),
      isDay: true,
    };
  };

  // Open Step Modal
  const openAddStepModal = () => {
    const nextStepNum = steps.length + 1;
    setEditingStepIndex(null);
    setStepTimeUnit('minutes');
    setStepCustomMinutes(1);
    setStepCustomHours(1);
    setStepFormData({
      dayOffset: 0,
      timeOfDay: 'MIN:1',
      title: `${nextStepNum}ম ফলো-আপ (১ মিনিট পর)`,
      guidelinePrompt: '',
      isEnabled: true,
    });
    setModalOpen(true);
  };

  const openEditStepModal = (index: number) => {
    const target = steps[index];
    setEditingStepIndex(index);
    if (target.timeOfDay?.startsWith('MIN:')) {
      const mins = parseInt(target.timeOfDay.replace('MIN:', ''), 10) || 1;
      setStepTimeUnit('minutes');
      setStepCustomMinutes(mins);
      setStepFormData({
        dayOffset: 0,
        timeOfDay: target.timeOfDay,
        title: target.title,
        guidelinePrompt: target.guidelinePrompt || '',
        isEnabled: target.isEnabled,
      });
    } else if (target.timeOfDay?.startsWith('HR:')) {
      const hrs = parseInt(target.timeOfDay.replace('HR:', ''), 10) || 1;
      setStepTimeUnit('hours');
      setStepCustomHours(hrs);
      setStepFormData({
        dayOffset: 0,
        timeOfDay: target.timeOfDay,
        title: target.title,
        guidelinePrompt: target.guidelinePrompt || '',
        isEnabled: target.isEnabled,
      });
    } else {
      setStepTimeUnit('days');
      setStepFormData({
        dayOffset: target.dayOffset || 1,
        timeOfDay: target.timeOfDay || '10:00',
        title: target.title,
        guidelinePrompt: target.guidelinePrompt || '',
        isEnabled: target.isEnabled,
      });
    }
    setModalOpen(true);
  };

  // Save Step (Add / Edit local list and persist)
  const handleSaveStepModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSteps = [...steps];

    let computedDayOffset = 1;
    let computedTimeOfDay = '10:00';
    let defaultTitle = stepFormData.title?.trim();

    if (stepTimeUnit === 'minutes') {
      const mins = Math.max(1, stepCustomMinutes || 1);
      computedDayOffset = 0;
      computedTimeOfDay = `MIN:${mins}`;
      if (!defaultTitle) {
        defaultTitle = `ফলো-আপ (${mins} মিনিট পর)`;
      }
    } else if (stepTimeUnit === 'hours') {
      const hrs = Math.max(1, stepCustomHours || 1);
      computedDayOffset = 0;
      computedTimeOfDay = `HR:${hrs}`;
      if (!defaultTitle) {
        defaultTitle = `ফলো-আপ (${hrs} ঘণ্টা পর)`;
      }
    } else {
      computedDayOffset = Math.max(1, Number(stepFormData.dayOffset) || 1);
      computedTimeOfDay = stepFormData.timeOfDay || '10:00';
      if (!defaultTitle) {
        defaultTitle = `ধাপ #${(editingStepIndex !== null ? editingStepIndex : updatedSteps.length) + 1} (${computedDayOffset} দিন পর)`;
      }
    }

    const stepPayload: ScheduleStep = {
      stepNumber: (editingStepIndex !== null ? editingStepIndex : updatedSteps.length) + 1,
      dayOffset: computedDayOffset,
      timeOfDay: computedTimeOfDay,
      title: defaultTitle,
      guidelinePrompt: stepFormData.guidelinePrompt,
      isEnabled: stepFormData.isEnabled,
    };

    if (editingStepIndex !== null) {
      updatedSteps[editingStepIndex] = {
        ...updatedSteps[editingStepIndex],
        ...stepPayload,
      };
    } else {
      updatedSteps.push(stepPayload);
    }

    // Sort by total minutes
    updatedSteps.sort((a, b) => getStepTotalMinutes(a) - getStepTotalMinutes(b));
    // Re-index stepNumbers
    const finalSteps = updatedSteps.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));

    setSteps(finalSteps);
    setModalOpen(false);
    await persistSteps(finalSteps);
  };

  // Delete Step
  const handleDeleteStep = async (index: number) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই ফলো-আপ ধাপটি মুছে ফেলতে চান?')) return;
    const filtered = steps.filter((_, idx) => idx !== index);
    const finalSteps = filtered.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setSteps(finalSteps);
    await persistSteps(finalSteps);
  };

  // Toggle Step Enable/Disable
  const handleToggleStep = async (index: number) => {
    const updated = [...steps];
    updated[index].isEnabled = !updated[index].isEnabled;
    setSteps(updated);
    await persistSteps(updated);
  };

  // Save steps to backend
  const persistSteps = async (stepsToSave: ScheduleStep[]) => {
    try {
      setSavingSteps(true);
      const res = await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_STEPS',
          pageId: selectedPageId || undefined,
          steps: stepsToSave,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('শিডিউল সংরক্ষিত হয়েছে!');
      } else {
        toast.error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch (e) {
      toast.error('সার্ভার কানেকশন ত্রুটি');
    } finally {
      setSavingSteps(false);
    }
  };

  // Reset to default 5-step schedule
  const handleResetToDefault = async () => {
    if (!confirm('ডিফল্ট ৫-ধাপের রেকমেন্ডেড শিডিউলে রিসেট করতে চান?')) return;
    const defaultSteps: ScheduleStep[] = [
      {
        stepNumber: 1,
        dayOffset: 1,
        timeOfDay: '10:00',
        title: '১ম ফলো-আপ (১ দিন পর - সকাল ১০টা)',
        guidelinePrompt: 'পছন্দের পণ্য নিয়ে কোনো প্রশ্ন আছে কিনা নম্রভাবে ও আন্তরিকভাবে জানতে চান।',
        isEnabled: true,
      },
      {
        stepNumber: 2,
        dayOffset: 3,
        timeOfDay: '16:00',
        title: '২য় ফলো-আপ (৩ দিন পর - বিকাল ৪টা)',
        guidelinePrompt: 'পণ্যের প্রিমিয়াম কোয়ালিটি ও ক্যাশ অন ডেলিভারি (COD) সুবিধার কথা মনে করিয়ে দিন।',
        isEnabled: true,
      },
      {
        stepNumber: 3,
        dayOffset: 7,
        timeOfDay: '20:00',
        title: '৩য় ফলো-আপ (৭ দিন পর - রাত ৮টা)',
        guidelinePrompt: 'স্টক সীমিত হতে পারে এমন বন্ধুত্বপূর্ণ রিমাইন্ডার দিন।',
        isEnabled: true,
      },
      {
        stepNumber: 4,
        dayOffset: 15,
        timeOfDay: '11:00',
        title: '৪র্থ ফলো-আপ (১৫ দিন পর - সকাল ১১টা)',
        guidelinePrompt: 'কোনো সাহায্য লাগবে কিনা বা পছন্দের অন্য পণ্য দেখতে চান কিনা জানতে চান।',
        isEnabled: true,
      },
      {
        stepNumber: 5,
        dayOffset: 25,
        timeOfDay: '17:00',
        title: '৫ম ফলো-আপ (২৫ দিন পর - বিকাল ৫টা)',
        guidelinePrompt: 'মাসের সমাপনী আন্তরিক সম্ভাষণ ও যেকোনো প্রয়োজনে যোগাযোগের আহ্বান জানান।',
        isEnabled: true,
      },
    ];

    setSteps(defaultSteps);
    await persistSteps(defaultSteps);
  };

  // Format Time Helper
  const formatTimeDisplay = (time24: string) => {
    if (!time24) return '১০:০০ AM';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><RefreshCw className="w-3 h-3 animate-spin text-amber-600" /> ফলো-আপ চলছে</span>;
      case 'CUSTOMER_REPLIED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> রিপ্লাই করেছে</span>;
      case 'ORDER_PLACED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"><ShoppingBag className="w-3 h-3 text-indigo-600" /> অর্ডার সম্পন্ন</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"><ShieldCheck className="w-3 h-3 text-slate-500" /> সমাপ্ত</span>;
      case 'PAUSED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">পজ করা</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">অপেক্ষমাণ</span>;
    }
  };

  const filteredConversations = activeConversations.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.followUpStatus === statusFilter;
  });

  return (
    <DashboardLayout
      title="AI ফলো-আপ অটোমেশন ও শিডিউল"
      subtitle="সিন কিন্তু উত্তর না দেওয়া গ্রাহকদের কাছে কাস্টম টাইম ও শিডিউলে স্বয়ংক্রিয় এআই ফলো-আপ বার্তা পাঠান।"
    >
      <div className="space-y-8">
        {/* Page Top Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  AI ফলো-আপ অটোমেশন ও শিডিউল
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                    Seen & Unreplied রিকভারি
                  </span>
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  যেসব গ্রাহক মেসেজ সিন করেছেন বা অর্ডার দেননি, তাদের সাথে কাস্টম সময়ে স্বয়ংক্রিয় ফলো-আপ করে সেলস বাড়ান।
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Filter */}
            {pages.length > 0 && (
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value="">সকল পেজ ও চ্যানেল</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.pageName} ({p.channel})
                  </option>
                ))}
              </select>
            )}

            {/* Run Automation Now */}
            <button
              onClick={handleRunManual}
              disabled={runningManual}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${runningManual ? 'animate-spin' : ''}`} />
              {runningManual ? 'ফলো-আপ চলছে...' : 'এখনই চেক ও রান করুন'}
            </button>
          </div>
        </div>

        {/* Funnel & Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">ফলো-আপ পাইপলাইন</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.inProgressCount || 0}</h3>
              <p className="text-xs text-amber-600 font-medium mt-0.5">গ্রাহক চলমান ধাপে আছেন</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">রিপ্লাই করেছে</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{metrics.repliedCount || 0}</h3>
              <p className="text-xs text-slate-400 mt-0.5">ফলো-আপের পর আবার চ্যাট করেছে</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">অর্ডার সম্পন্ন</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{metrics.convertedCount || 0}</h3>
              <p className="text-xs text-indigo-600 font-medium mt-0.5">সফল কনভার্সন</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">মোট পাঠানো মেসেজ</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalSentLogs || 0}</h3>
              <p className="text-xs text-slate-400 mt-0.5">অটোমেটিক AI ফলো-আপ</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Send className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">কনভার্সন রেট</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.conversionRate || 0}%</h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">সফল ফলো-আপ রেট</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('rules')}
              className={`pb-4 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-600" />
              অটোমেটেড ফলো-আপ মেসেজ (Seen কিন্তু Reply দেয়নি)
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-4 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'schedule'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              মাল্টি-স্টেপ শিডিউল বিল্ডার ({steps.length} টি ধাপ)
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`pb-4 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'pipeline'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              লাইভ ফলো-আপ পাইপলাইন ({activeConversations.length})
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-4 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Send className="w-4 h-4" />
              মেসেজ হিস্ট্রি ও অডিট লগ ({recentLogs.length})
            </button>
          </nav>
        </div>

        {/* TAB 1: AUTOMATED FOLLOW-UP RULES & SETTINGS (SEEN BUT UNREPLIED) */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <MessageSquareReply className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      অটোমেটেড ফলো-আপ মেসেজ (Seen কিন্তু Reply দেয়নি)
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                        ১০০% অটোমেশন
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      যেসব গ্রাহক মেসেজ সিন করেছেন কিন্তু অর্ডার বা রিপ্লাই দেননি, তাদের কাছে নির্দিষ্ট সময় পর স্বয়ংক্রিয় মেসেজ পাঠানো হবে।
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">
                    {pageSettings.followUpEnabled ? 'ফলো-আপ সক্রিয়' : 'ফলো-আপ নিষ্ক্রিয়'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageSettings.followUpEnabled}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setPageSettings({ ...pageSettings, followUpEnabled: val });
                        handleSavePageSettings({ followUpEnabled: val });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>

              {pageSettings.followUpEnabled ? (
                <div className="space-y-6 animate-fadeIn">
                  {/* 1. Target Audience: Seen Only vs Unseen */}
                  <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
                    <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                      ১. ফলো-আপের টার্গেট অডিয়েন্স ফিল্টার:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPageSettings({ ...pageSettings, followUpOnlySeen: true });
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                          pageSettings.followUpOnlySeen
                            ? 'bg-amber-50/90 border-amber-500 ring-1 ring-amber-500 text-amber-950 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                        }`}
                      >
                        <Eye className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">শুধুমাত্র সিন (Seen) করলে পাঠাবে</div>
                          <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                            গ্রাহক মেসেজ ওপেন করে পড়েছে (Seen) নিশ্চিত হওয়ার পর আপনার নির্ধারিত সময় পার হলে ফলো-আপ যাবে।
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPageSettings({ ...pageSettings, followUpOnlySeen: false });
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                          !pageSettings.followUpOnlySeen
                            ? 'bg-amber-50/90 border-amber-500 ring-1 ring-amber-500 text-amber-950 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                        }`}
                      >
                        <MessageSquareReply className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">সিন না করলেও পাঠাবে (ম্যাক্সিমাম রিকভারি)</div>
                          <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                            গ্রাহক মেসেজ সিন করুক বা না করুক, নির্ধারিত অপেক্ষা সময় পার হলেই স্বয়ংক্রিয় ফলো-আপ পাঠানো হবে।
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 2. Flexible Custom Wait Time */}
                  <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                          ২. কতক্ষণ পর ফলো-আপ পাঠানো হবে? (Custom Time)
                        </label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ১ মিনিট থেকে শুরু করে ইচ্ছামতো যেকোনো মিনিট বা ঘন্টা নির্ধারণ করুন।
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white shadow-xs">
                        {pageSettings.followUpWaitMinutes >= 60 && pageSettings.followUpWaitMinutes % 60 === 0
                          ? `${pageSettings.followUpWaitMinutes / 60} ঘন্টা পর`
                          : `${pageSettings.followUpWaitMinutes} মিনিট পর`}
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      {[
                        { mins: 1, label: '১ মিনিট', sub: 'তাৎক্ষণিক টেস্ট' },
                        { mins: 5, label: '৫ মিনিট', sub: 'খুব দ্রুত' },
                        { mins: 15, label: '১৫ মিনিট', sub: 'দ্রুত' },
                        { mins: 30, label: '৩০ মিনিট', sub: 'স্ট্যান্ডার্ড' },
                        { mins: 60, label: '১ ঘন্টা', sub: 'স্বাভাবিক' },
                        { mins: 120, label: '২ ঘন্টা', sub: 'ধীরেসুস্থে' },
                      ].map((p) => {
                        const isSel = (pageSettings.followUpWaitMinutes ?? 30) === p.mins;
                        return (
                          <button
                            key={p.mins}
                            type="button"
                            onClick={() => setPageSettings({ ...pageSettings, followUpWaitMinutes: p.mins })}
                            className={`p-2 rounded-xl border text-center transition-all ${
                              isSel
                                ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50/50'
                            }`}
                          >
                            <div className="text-xs font-bold">{p.label}</div>
                            <div className={`text-[9px] ${isSel ? 'text-amber-100' : 'text-slate-400'}`}>
                              {p.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Input & Range Slider */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-700">
                          ইচ্ছামতো কাস্টম মিনিট টাইপ করুন:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="10080"
                            value={pageSettings.followUpWaitMinutes}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setPageSettings({
                                ...pageSettings,
                                followUpWaitMinutes: isNaN(val) ? 1 : Math.max(1, val),
                              });
                            }}
                            className="w-24 px-3 py-1.5 text-xs font-bold text-center bg-slate-50 border border-slate-200 rounded-lg text-amber-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          />
                          <span className="text-xs font-semibold text-slate-600">মিনিট</span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="1"
                        max="180"
                        step="1"
                        value={Math.min(180, pageSettings.followUpWaitMinutes || 1)}
                        onChange={(e) =>
                          setPageSettings({
                            ...pageSettings,
                            followUpWaitMinutes: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                        <span>১ মিনিট (টেস্ট)</span>
                        <span>১৫ মিনিট</span>
                        <span>৩০ মিনিট</span>
                        <span>১ ঘন্টা (৬০ মি)</span>
                        <span>৩ ঘন্টা (১৮০ মি)</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Frequency & Recurrence */}
                  <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                        ৩. পুনরাবৃত্তি ও শিডিউল (Frequency)
                      </label>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        {pageSettings.followUpFrequency === 'DAILY'
                          ? 'প্রতিদিন (Daily)'
                          : pageSettings.followUpFrequency === 'CUSTOM_INTERVAL'
                          ? `প্রতি ${pageSettings.followUpIntervalHours || 24} ঘন্টা পর পর`
                          : '১ বার মাত্র (One-off)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setPageSettings({ ...pageSettings, followUpFrequency: 'ONCE', followUpMaxCount: 1 })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          pageSettings.followUpFrequency === 'ONCE'
                            ? 'bg-amber-50/90 border-amber-500 ring-1 ring-amber-500 text-amber-950 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900">১ বার মাত্র (One-off)</span>
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight">
                          গ্রাহকের কাছে শুধুমাত্র ১ বারই ফলো-আপ পাঠানো হবে।
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPageSettings({ ...pageSettings, followUpFrequency: 'DAILY', followUpMaxCount: Math.max(3, pageSettings.followUpMaxCount) })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          pageSettings.followUpFrequency === 'DAILY'
                            ? 'bg-amber-50/90 border-amber-500 ring-1 ring-amber-500 text-amber-950 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900">প্রতিদিন (Daily)</span>
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight">
                          গ্রাহক কোনো রিপ্লাই না দিলে প্রতি ২৪ ঘন্টা পর পর নতুন ফলো-আপ বার্তা পাঠাবে।
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPageSettings({ ...pageSettings, followUpFrequency: 'CUSTOM_INTERVAL', followUpMaxCount: Math.max(3, pageSettings.followUpMaxCount) })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          pageSettings.followUpFrequency === 'CUSTOM_INTERVAL'
                            ? 'bg-amber-50/90 border-amber-500 ring-1 ring-amber-500 text-amber-950 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Repeat className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900">কাস্টম ঘন্টা পর পর</span>
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight">
                          আপনার নির্ধারিত নির্দিষ্ট ঘন্টা (যেমন ৬, ১২, ২৪ বা ৪৮ ঘন্টা) পর পর ফলো-আপ যাবে।
                        </div>
                      </button>
                    </div>

                    {pageSettings.followUpFrequency === 'CUSTOM_INTERVAL' && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-700">পরবর্তী মেসেজ পাঠানোর বিরতি:</span>
                        <div className="flex items-center gap-2">
                          {[6, 12, 24, 48, 72].map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setPageSettings({ ...pageSettings, followUpIntervalHours: h })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                pageSettings.followUpIntervalHours === h
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {h} ঘন্টা
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Max Count Limit */}
                  <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                        ৪. সর্বোচ্চ কয়বার ফলো-আপ পাঠানো হবে?
                      </label>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-600 text-white">
                        {pageSettings.followUpFrequency === 'ONCE'
                          ? '১ বার'
                          : pageSettings.followUpMaxCount >= 999
                          ? 'আনলিমিটেড (রিপ্লাই পর্যন্ত)'
                          : `${pageSettings.followUpMaxCount} বার`}
                      </span>
                    </div>

                    {pageSettings.followUpFrequency !== 'ONCE' && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { count: 1, label: '১ বার', sub: 'শুধুমাত্র ১ বার' },
                          { count: 2, label: '২ বার', sub: 'মডারেট' },
                          { count: 3, label: '৩ বার', sub: 'সুপারিশকৃত' },
                          { count: 5, label: '৫ বার', sub: 'সর্বোচ্চ চেষ্টা' },
                          { count: 999, label: 'আনলিমিটেড', sub: 'রিপ্লাই পর্যন্ত' },
                        ].map((c) => {
                          const isSel = pageSettings.followUpMaxCount === c.count;
                          return (
                            <button
                              key={c.count}
                              type="button"
                              onClick={() => setPageSettings({ ...pageSettings, followUpMaxCount: c.count })}
                              className={`p-2.5 rounded-xl border text-center transition-all ${
                                isSel
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50/60'
                              }`}
                            >
                              <div className="text-xs font-bold">{c.label}</div>
                              <div className={`text-[9px] ${isSel ? 'text-amber-100' : 'text-slate-400'}`}>
                                {c.sub}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 5. Custom Follow-up Message Template */}
                  <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        ৫. কাস্টম ফলো-আপ মেসেজ টেমপ্লেট (ঐচ্ছিক)
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        প্লেসহোল্ডার: &#123;name&#125;
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="যেমন: আসসালামু আলাইকুম {name}! আপনার পছন্দের পণ্যটি নিয়ে কোনো প্রশ্ন ছিল কি? স্টক সীমিত, কোনো হেল্প লাগলে জানান... (খালি রাখলে AI স্বয়ংক্রিয়ভাবে পার্সোনালাইজড মেসেজ দেবে)"
                      value={pageSettings.followUpMessage}
                      onChange={(e) => setPageSettings({ ...pageSettings, followUpMessage: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500">
                      💡 খালি রাখলে আমাদের AI সিস্টেম স্বয়ংক্রিয়ভাবে কাস্টমারের আগের চ্যাট বিশ্লেষণ করে ইউনিক ও প্রফেশনাল মেসেজ তৈরি করবে।
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={savingSettings}
                      onClick={() => handleSavePageSettings()}
                      className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {savingSettings ? 'সংরক্ষণ হচ্ছে...' : 'পলিসি ও সেটিংস সংরক্ষণ করুন'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">স্বয়ংক্রিয় ফলো-আপ বর্তমানে নিষ্ক্রিয় রয়েছে</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    উপরে ডানপাশের সুইচটি চালু করে সিন করা কাস্টমারদের জন্য স্বয়ংক্রিয় ফলো-আপ কনফিগার করুন।
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULE BUILDER */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    কাস্টমাইজেবল মাল্টি-স্টেপ শিডিউল বিল্ডার
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                      ডাইনামিক স্টেপস
                    </span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    গ্রাহকের কাছে কবে, কখন এবং কয়টি ফলো-আপ পাঠানো হবে তা ইচ্ছামতো কাস্টম টাইমসহ সাজিয়ে নিন।
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResetToDefault}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    ডিফল্ট ৫-ধাপে রিসেট
                  </button>

                  <button
                    onClick={openAddStepModal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    নতুন ফলো-আপ ধাপ যোগ করুন
                  </button>
                </div>
              </div>

              {/* Steps Cards List */}
              {loading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  শিডিউল লোড হচ্ছে...
                </div>
              ) : steps.length === 0 ? (
                <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">কোনো ফলো-আপ শিডিউল তৈরি করা নেই</p>
                  <p className="text-xs text-slate-500 mt-1">
                    উপরের &quot;নতুন ফলো-আপ ধাপ যোগ করুন&quot; বাটনে ক্লিক করে শিডিউল তৈরি করুন।
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {steps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className={`p-5 rounded-2xl border transition-all ${
                        step.isEnabled
                          ? 'bg-white border-slate-200/90 shadow-2xs hover:border-indigo-300'
                          : 'bg-slate-50/70 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                            #{step.stepNumber}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                              {(() => {
                                const timing = formatStepTimingDisplay(step);
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 shadow-2xs ${
                                      timing.isMinute
                                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                                        : timing.isHour
                                        ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                                        : 'bg-purple-50 text-purple-900 border-purple-300'
                                    }`}>
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      {timing.badge}
                                    </span>
                                    {timing.isDay && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                        {timing.timeText}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="font-semibold text-slate-700">AI নির্দেশিকা:</span>
                              {step.guidelinePrompt || 'স্বাভাবিক ও আন্তরিক ভঙ্গিতে ফলো-আপ করুন।'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Toggle active */}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step.isEnabled}
                              onChange={() => handleToggleStep(idx)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>

                          {/* Edit */}
                          <button
                            onClick={() => openEditStepModal(idx)}
                            className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="এডিট করুন"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
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

            {/* Smart Information Callout */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 flex items-start gap-4">
              <Sparkles className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">AI মেমরি ও নন-রিপিটিশন সুরক্ষা (Zero Repetition Guarantee)</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  আমাদের AI সিস্টেম প্রতিবার মেসেজ পাঠানোর আগে গ্রাহকের পূর্ববর্তী সব চ্যাট হিস্ট্রি এবং আগে পাঠানো সকল ফলো-আপ মেসেজ বিশ্লেষণ করে। ফলে একই গ্রাহককে কখনোই একই মেসেজ দুইবার পাঠানো হয় না; প্রতিটি ফলো-আপ হয় সম্পূর্ণ ইউনিক ও আকর্ষণীয়। গ্রাহক রিপ্লাই দিলে বা অর্ডার করলে ফলো-আপ স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যায়।
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE PIPELINE */}
        {activeTab === 'pipeline' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">গ্রাহক ফলো-আপ পাইপলাইন</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  গত ৩০ দিনে যেসব গ্রাহকের সাথে ফলো-আপ চলছে বা সম্পন্ন হয়েছে তাদের বর্তমান স্ট্যাটাস।
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { key: 'ALL', label: 'সকল' },
                  { key: 'IN_PROGRESS', label: 'চলমান' },
                  { key: 'CUSTOMER_REPLIED', label: 'রিপ্লাই করেছে' },
                  { key: 'ORDER_PLACED', label: 'অর্ডার সম্পন্ন' },
                  { key: 'COMPLETED', label: 'সমাপ্ত' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      statusFilter === tab.key
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline Table */}
            {filteredConversations.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">এই ক্যাটাগরিতে কোনো গ্রাহক নেই</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold text-xs">
                      <th className="py-3.5 px-4 rounded-l-xl">গ্রাহক ও চ্যানেল</th>
                      <th className="py-3.5 px-4">বর্তমান ধাপ</th>
                      <th className="py-3.5 px-4">স্ট্যাটাস</th>
                      <th className="py-3.5 px-4">সর্বশেষ ফলো-আপ</th>
                      <th className="py-3.5 px-4 rounded-r-xl text-right">মেসেজ হিস্ট্রি</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredConversations.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-900">{c.customerName || c.senderPsid}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {c.channel}
                            </span>
                            {c.page?.pageName && <span>• {c.page.pageName}</span>}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            ধাপ #{c.currentFollowUpStep} / {steps.length || 5}
                          </span>
                        </td>

                        <td className="py-4 px-4">{getStatusBadge(c.followUpStatus)}</td>

                        <td className="py-4 px-4 text-xs text-slate-500">
                          {c.lastFollowUpSentAt
                            ? new Date(c.lastFollowUpSentAt).toLocaleString('bn-BD', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'এখনো পাঠানো হয়নি'}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => setHistoryModalConv(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            মেসেজ দেখুন
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

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">ফলো-আপ মেসেজ হিস্ট্রি ও অডিট লগ</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                প্রতিটি স্বয়ংক্রিয় ফলো-আপ মেসেজের বিস্তারিত লগ এবং AI মডেল ট্র্যাকিং।
              </p>
            </div>

            {recentLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Send className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">কোনো ফলো-আপ লগ পাওয়া যায়নি</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{log.customerName || log.senderPsid}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                          ধাপ #{log.stepNumber} ({log.dayOffset} দিন পর)
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {log.channel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleString('bn-BD', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                      &ldquo;{log.messageText}&rdquo;
                    </p>

                    <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                      <span>মডেল: {log.aiModel || 'Smart AI'}</span>
                      <span className="text-emerald-600 font-semibold">সফলভাবে প্রেরিত ✓</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* STEP ADD / EDIT MODAL */}
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
              {editingStepIndex !== null ? 'ফলো-আপ ধাপ সম্পাদনা করুন' : 'নতুন ফলো-আপ ধাপ যুক্ত করুন'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              ১ মিনিট থেকে শুরু করে ইচ্ছামতো যেকোনো মিনিট, ঘণ্টা বা দিন পর ফলো-আপ শিডিউল নির্ধারণ করুন।
            </p>

            <form onSubmit={handleSaveStepModal} className="space-y-4">
              {/* Unit Selector: Minutes vs Hours vs Days */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  সময় নির্ধারণের একক (Time Unit):
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setStepTimeUnit('minutes');
                      setStepFormData({
                        ...stepFormData,
                        title: stepFormData.title.includes('ফলো-আপ') ? `ফলো-আপ (${stepCustomMinutes || 1} মিনিট পর)` : stepFormData.title,
                      });
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      stepTimeUnit === 'minutes'
                        ? 'bg-white text-amber-700 shadow-xs ring-1 ring-amber-300'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    মিনিট ভিত্তিক
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStepTimeUnit('hours');
                      setStepFormData({
                        ...stepFormData,
                        title: stepFormData.title.includes('ফলো-আপ') ? `ফলো-আপ (${stepCustomHours || 1} ঘণ্টা পর)` : stepFormData.title,
                      });
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      stepTimeUnit === 'hours'
                        ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-300'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    ঘণ্টা ভিত্তিক
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStepTimeUnit('days');
                      setStepFormData({
                        ...stepFormData,
                        title: stepFormData.title.includes('ফলো-আপ') ? `ফলো-আপ (${stepFormData.dayOffset || 1} দিন পর)` : stepFormData.title,
                      });
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      stepTimeUnit === 'days'
                        ? 'bg-white text-purple-700 shadow-xs ring-1 ring-purple-300'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    দিন ভিত্তিক
                  </button>
                </div>
              </div>

              {/* 1. MINUTES CONFIGURATION */}
              {stepTimeUnit === 'minutes' && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950">কত মিনিট পর মেসেজ যাবে?</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-600 text-white">
                      {stepCustomMinutes || 1} মিনিট পর
                    </span>
                  </div>

                  {/* Quick Minute Presets */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { m: 1, label: '১ মিনিট' },
                      { m: 5, label: '৫ মিনিট' },
                      { m: 15, label: '১৫ মিনিট' },
                      { m: 30, label: '৩০ মিনিট' },
                      { m: 45, label: '৪৫ মিনিট' },
                    ].map((item) => (
                      <button
                        key={item.m}
                        type="button"
                        onClick={() => {
                          setStepCustomMinutes(item.m);
                          setStepFormData({
                            ...stepFormData,
                            title: `ফলো-আপ (${item.m} মিনিট পর)`,
                          });
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                          (stepCustomMinutes || 1) === item.m
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/60'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Minute Input */}
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-amber-200">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-[11px] text-slate-700 font-medium">কাস্টম মিনিট লিখুন:</span>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={stepCustomMinutes}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setStepCustomMinutes(val);
                        setStepFormData({
                          ...stepFormData,
                          title: `ফলো-আপ (${val} মিনিট পর)`,
                        });
                      }}
                      className="w-20 text-xs font-bold text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-slate-600">মিনিট পর</span>
                  </div>
                </div>
              )}

              {/* 2. HOURS CONFIGURATION */}
              {stepTimeUnit === 'hours' && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950">কত ঘণ্টা পর মেসেজ যাবে?</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
                      {stepCustomHours || 1} ঘণ্টা পর
                    </span>
                  </div>

                  {/* Quick Hour Presets */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { h: 1, label: '১ ঘণ্টা' },
                      { h: 2, label: '২ ঘণ্টা' },
                      { h: 4, label: '৪ ঘণ্টা' },
                      { h: 6, label: '৬ ঘণ্টা' },
                      { h: 12, label: '১২ ঘণ্টা' },
                    ].map((item) => (
                      <button
                        key={item.h}
                        type="button"
                        onClick={() => {
                          setStepCustomHours(item.h);
                          setStepFormData({
                            ...stepFormData,
                            title: `ফলো-আপ (${item.h} ঘণ্টা পর)`,
                          });
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                          (stepCustomHours || 1) === item.h
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-100/60'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Hour Input */}
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-indigo-200">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-[11px] text-slate-700 font-medium">কাস্টম ঘণ্টা লিখুন:</span>
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={stepCustomHours}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setStepCustomHours(val);
                        setStepFormData({
                          ...stepFormData,
                          title: `ফলো-আপ (${val} ঘণ্টা পর)`,
                        });
                      }}
                      className="w-20 text-xs font-bold text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-indigo-950 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-600">ঘণ্টা পর</span>
                  </div>
                </div>
              )}

              {/* 3. DAYS CONFIGURATION */}
              {stepTimeUnit === 'days' && (
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        কয় দিন পর? (Day Offset)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        required
                        value={stepFormData.dayOffset || 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setStepFormData({
                            ...stepFormData,
                            dayOffset: val,
                            title: `ফলো-আপ (${val} দিন পর)`,
                          });
                        }}
                        className="w-full text-sm font-bold bg-white border border-purple-200 rounded-xl px-3.5 py-2 text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        placeholder="যেমন: 3"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        কখন পাঠাবে? (Time of Day)
                      </label>
                      <input
                        type="time"
                        required
                        value={stepFormData.timeOfDay.startsWith('MIN:') || stepFormData.timeOfDay.startsWith('HR:') ? '10:00' : stepFormData.timeOfDay}
                        onChange={(e) => setStepFormData({ ...stepFormData, timeOfDay: e.target.value })}
                        className="w-full text-sm font-bold bg-white border border-purple-200 rounded-xl px-3.5 py-2 text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ধাপের নাম / টাইটেল
                </label>
                <input
                  type="text"
                  required
                  value={stepFormData.title}
                  onChange={(e) => setStepFormData({ ...stepFormData, title: e.target.value })}
                  className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="যেমন: ১ম ফলো-আপ (১ মিনিট পর)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  AI ফলো-আপ নির্দেশনা (Custom AI Guideline)
                </label>
                <textarea
                  rows={3}
                  value={stepFormData.guidelinePrompt}
                  onChange={(e) => setStepFormData({ ...stepFormData, guidelinePrompt: e.target.value })}
                  className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="যেমন: ক্যাশ অন ডেলিভারি এবং দ্রুত ডেলিভারির সুবিধা মনে করিয়ে দিয়ে নম্রভাবে জানতে চান..."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isEnabledCheckbox"
                  checked={stepFormData.isEnabled}
                  onChange={(e) => setStepFormData({ ...stepFormData, isEnabled: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <label htmlFor="isEnabledCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  এই ধাপটি সক্রিয় রাখুন
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
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white shadow-sm transition-all disabled:opacity-50"
                >
                  {savingSteps ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER HISTORY & MEMORY MODAL */}
      {historyModalConv && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <button
              onClick={() => setHistoryModalConv(null)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {historyModalConv.customerName || historyModalConv.senderPsid}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                  {historyModalConv.channel}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                এই গ্রাহকের সাথে হওয়া সমস্ত ফলো-আপ মেসেজের মেমরি রেকর্ড।
              </p>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {!historyModalConv.followUpLogs || historyModalConv.followUpLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  কোনো পূর্ববর্তী ফলো-আপ লগ নেই।
                </div>
              ) : (
                historyModalConv.followUpLogs.map((log, idx) => (
                  <div key={log.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-purple-700">ধাপ #{log.stepNumber} ফলো-আপ</span>
                      <span className="text-slate-400">
                        {new Date(log.createdAt).toLocaleString('bn-BD', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-slate-200/60">
                      &ldquo;{log.messageText}&rdquo;
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryModalConv(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
