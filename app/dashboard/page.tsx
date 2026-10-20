'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Layers,
  MessageSquare,
  Bot,
  ShoppingCart,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Inbox,
  UserCheck,
  Send,
  Zap,
  BarChart2,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export default function DashboardOverviewPage() {
  const toast = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('today');

  const fetchOverviewData = async (range = timeRange) => {
    try {
      setLoading(true);
      const data = await apiFetch<any>(`/api/reports?range=${range}`, { retries: 2 });

      if (data?.success) {
        setStats(data);
      }
    } catch (_) {
      // Handled silently with retries
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData(timeRange);
  }, [timeRange]);

  const metrics = stats?.metrics || {};
  const monthlyUsed = metrics.messagesSentThisMonth || 0;
  const monthlyLimit = metrics.monthlyMessageLimit || 0;
  const usagePercent =
    monthlyLimit > 0 ? Math.min(Math.round((monthlyUsed / monthlyLimit) * 100), 100) : 0;

  return (
    <DashboardLayout
      title="ওভারভিউ ড্যাশবোর্ড"
      subtitle="আপনার Facebook Messenger AI অটোমেশনের সর্বমোট মেসেজ সংখ্যা, রিয়েল-টাইম পরিসংখ্যান ও গতিবিধি"
    >
      {/* Top Controls: Time Filter & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>লাইভ অ্যানালিটিক্স ওভারভিউ</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </h2>
          <p className="text-xs text-slate-500">সকল পেজের মেসেজ ও অটোমেশন রিয়েল-টাইমে পর্যবেক্ষণ করুন</p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              timeRange === 'today'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            আজকে
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              timeRange === '7d'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            গত ৭ দিন
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              timeRange === '30d'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            গত ৩০ দিন
          </button>
          <button
            onClick={() => fetchOverviewData(timeRange)}
            title="রিফ্রেশ ডাটা"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top 4 Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
        {/* Card 1: Total Messages */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> মোট মেসেজ সংখ্যা
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200/60">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '...' : (metrics.allTimeTotalMessages ?? metrics.totalMessages ?? 0).toLocaleString()}
            </h3>
            <span className="text-xs text-slate-500 font-medium">টি সর্বমোট</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
            <span>
              {timeRange === 'today' ? 'আজকে' : timeRange === '7d' ? '৭ দিনে' : '৩০ দিনে'}:{' '}
              <strong className="text-slate-700">{(metrics.totalMessages ?? 0).toLocaleString()}</strong> টি
            </span>
            <span>
              ইনকামিং: <strong className="text-emerald-600">{(metrics.totalIncoming ?? 0).toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* Card 2: AI Replies */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" /> AI স্বয়ংক্রিয় রিপ্লাই
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '...' : (metrics.allTimeAiReplies ?? metrics.totalAiReplies ?? 0).toLocaleString()}
            </h3>
            <span className="text-xs text-slate-500 font-medium">টি মোট</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
            <span>
              {timeRange === 'today' ? 'আজকে' : 'সিলেক্টেড'}:{' '}
              <strong className="text-slate-700">{(metrics.totalAiReplies ?? 0).toLocaleString()}</strong> টি
            </span>
            <span className="text-emerald-600 font-semibold">১.৮ সে. গড় গতি</span>
          </div>
        </div>

        {/* Card 3: Connected Pages */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition-all shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> সক্রিয় Facebook Page
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '...' : stats?.pagesBreakdown?.length || 0}
            </h3>
            <span className="text-xs text-slate-500 font-medium">টি পেজ সংযুক্ত</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
            <span>
              মোট চ্যাট:{' '}
              <strong className="text-slate-700">{(metrics.allTimeConversations || 0).toLocaleString()}</strong> টি
            </span>
            <Link href="/dashboard/pages" className="text-indigo-600 hover:underline font-medium">
              ম্যানেজ করুন
            </Link>
          </div>
        </div>

        {/* Card 4: Orders & Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5" /> ক্যাপচার্ড অর্ডার
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '...' : (metrics.totalOrders || 0).toLocaleString()}
            </h3>
            <span className="text-xs text-amber-600 font-semibold">
              ({(metrics.totalRevenue || 0).toLocaleString()} ৳)
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
            <span>কনভার্শন রেট: {metrics.conversionRate || 0}%</span>
            <Link href="/dashboard/orders" className="text-amber-600 hover:underline font-medium">
              অর্ডার দেখুন
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Comprehensive Message Breakdown & Subscription Quota Box                  */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              <span>মেসেজ ও অটোমেশন সম্পূর্ণ পরিসংখ্যান (All Message Metrics)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ইনকামিং, আউটগোয়িং, AI অটো-রিপ্লাই এবং বর্তমান সাবস্ক্রিপশন কোটা ব্যবহার
            </p>
          </div>

          <Link
            href="/dashboard/conversations"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200/60 text-xs font-semibold transition-colors self-start sm:self-auto shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>ইনবক্স ওপেন করুন</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Metric 1: Total All-time Messages */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              সর্বমোট মেসেজ
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {(metrics.allTimeTotalMessages ?? 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">ইনকামিং + আউটগোয়িং</div>
          </div>

          {/* Metric 2: Total Incoming */}
          <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-200/60">
            <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider mb-1">
              গ্রাহক ইনকামিং
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-sky-900">
              {(metrics.allTimeIncoming ?? 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-sky-600 mt-1">
              {timeRange === 'today' ? 'আজকে' : 'সিলেক্টেড'}: +{(metrics.totalIncoming || 0).toLocaleString()}
            </div>
          </div>

          {/* Metric 3: AI Auto Replies */}
          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/60">
            <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider mb-1">
              AI অটো রিপ্লাই
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-purple-900">
              {(metrics.allTimeAiReplies ?? 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-purple-600 mt-1">
              {timeRange === 'today' ? 'আজকে' : 'সিলেক্টেড'}: +{(metrics.totalAiReplies || 0).toLocaleString()}
            </div>
          </div>

          {/* Metric 4: Total Conversations */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">
              মোট কথোপকথন
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-900">
              {(metrics.allTimeConversations ?? 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600 mt-1">কাস্টমার চ্যাট থ্রেড</div>
          </div>

          {/* Metric 5: Monthly Plan Quota */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 col-span-2 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-1">
              <span>চলতি মাসের কোটা</span>
              <span className="text-[10px] text-amber-600 font-medium">{metrics.packageName || 'সক্রিয়'}</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-amber-900">
              {monthlyUsed.toLocaleString()} / {monthlyLimit > 0 ? monthlyLimit.toLocaleString() : '∞'}
            </div>
            {/* Progress bar */}
            {monthlyLimit > 0 && (
              <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full ${
                    usagePercent > 85 ? 'bg-red-500' : usagePercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                ></div>
              </div>
            )}
            <div className="text-[10px] text-amber-700 mt-1">
              {monthlyLimit > 0 ? `${usagePercent}% ব্যবহৃত হয়েছে` : 'আনলিমিটেড মেসেজ'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Connected Pages & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Connected Pages Status (2 Columns) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Facebook Page সমূহ</h3>
              <p className="text-xs text-slate-500">সংযুক্ত ফেসবুক পেজের স্ট্যাটাস ও কার্যক্রম</p>
            </div>
            <Link
              href="/dashboard/pages"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> পেজ যুক্ত করুন
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">ডাটা লোড হচ্ছে...</div>
          ) : stats?.pagesBreakdown?.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 mb-1">এখনও কোনো Facebook Page সংযুক্ত করা হয়নি</h4>
              <p className="text-xs text-slate-500 mb-4">অটোমেশন শুরু করতে এখনই আপনার ফেসবুক পেজ যুক্ত করুন</p>
              <Link
                href="/dashboard/pages"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> নতুন Page যুক্ত করুন
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.pagesBreakdown?.map((page: any) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/70 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/70 flex items-center justify-center font-bold text-sm">
                      {(page.name || 'P').charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{page.name || 'Unnamed Page'}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span>কথোপকথন: {page.conversations}</span>
                        <span>•</span>
                        <span>অর্ডার: {page.orders}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        page.status === 'CONNECTED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {page.status === 'CONNECTED' ? 'সক্রিয়' : 'টোকেন এক্সপায়ার্ড'}
                    </span>
                    <Link
                      href={`/dashboard/pages`}
                      className="text-xs text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Launch / Setup Guide Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">AI রিপ্লাই কনফিগারেশন</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              আপনার ব্যবসার ধরণ অনুযায়ী AI-কে বিশেষ ট্রেনিং দিন। ১৪টি সহজ প্রশ্নের উত্তর দিয়ে কাস্টম AI রুলস তৈরি করুন।
            </p>

            <div className="space-y-2 mb-6">
              <Link
                href="/dashboard/ai-rules"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
              >
                <span>🤖 AI রুলস বিল্ডার (Easy Mode)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/dashboard/products"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
              >
                <span>📦 প্রোডাক্ট ইনভেন্টরি যুক্ত করুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/dashboard/conversations"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
              >
                <span>💬 মেসেঞ্জার ইনবক্স মনিটর</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/60 text-xs text-slate-600">
            <p className="font-semibold text-indigo-700 mb-1">💡 টিপস</p>
            প্রোডাক্ট তালিকায় ছবি এবং সঠিক দাম দিলে AI কাস্টমারকে ছবিসহ দাম জানিয়ে দ্রুত অর্ডার কনফার্ম করতে পারে।
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
