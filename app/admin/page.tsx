'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  ShieldAlert,
  Users,
  Layers,
  MessageSquare,
  Bot,
  ShoppingCart,
  Activity,
  Sparkles,
  ArrowRight,
  Database,
  Cpu,
  Zap,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export default function AdminDashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>('/api/admin/stats', { retries: 2 });

      if (data?.success) {
        setStats(data.stats);
        setRecentLogs(data.recentLogs || []);
      }
    } catch (e) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  return (
    <AdminLayout
      title="অ্যাডমিন ড্যাশবোর্ড"
      subtitle="ReplyX AI প্ল্যাটফর্মের সামগ্রিক সিস্টেম পারফরম্যান্স এবং কন্ট্রোল সেন্টার"
    >
      {/* Top Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">সেন্ট্রাল AI ও সাবস্ক্রিপশন কন্ট্রোল</h4>
            <p className="text-[11px] text-slate-600">
              DeepSeek, Google Gemini এবং OpenAI কী টেস্ট ও গ্রাহকদের মেসেজ কোটা পরিচালনা
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/ai-settings"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xs transition-all"
          >
            <Bot className="w-4 h-4" />
            <span>AI ও API সেটিংস</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>সাবস্ক্রিপশন ও মেসেজ ব্যবহার</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">অ্যাডমিন স্ট্যাটিস্টিক্স লোড হচ্ছে...</div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">মোট ইউজার</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{stats?.totalUsers || 0}</p>
              <p className="text-[11px] text-slate-500 mt-1">{stats?.activeUsers || 0} জন সক্রিয় ইউজার</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">সংযুক্ত ফেসবুক পেজ</span>
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{stats?.totalPages || 0}</p>
              <p className="text-[11px] text-slate-500 mt-1">{stats?.activePages || 0} টি পেজ সক্রিয় আছে</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">মোট মেসেজ ও AI উত্তর</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{stats?.totalMessages || 0}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">{stats?.aiMessages || 0} টি অটো AI রিপ্লাই</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">মোট বিক্রয় ও অর্ডার</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">৳ {Number(stats?.totalRevenue || 0).toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-1">{stats?.totalOrders || 0} টি সফল অর্ডার</p>
            </div>
          </div>

          {/* Quick Management Links & Recent Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <span>ম্যানেজমেন্ট শর্টকাট</span>
              </h3>

              <div className="space-y-3">
                <Link
                  href="/admin/ai-settings"
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all group shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700">AI ও API সেটিংস</h4>
                      <p className="text-[11px] text-slate-500">DeepSeek / Gemini / OpenAI কী ও টেস্ট</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/admin/subscriptions"
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all group shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700">সাবস্ক্রিপশন ও মেসেজ ট্র্যাকিং</h4>
                      <p className="text-[11px] text-slate-500">টিয়ার অনুযায়ী মেসেজ সংখ্যা ও ইউজার কোটা</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/admin/users"
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all group shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700">ব্যবহারকারী পরিচালনা</h4>
                      <p className="text-[11px] text-slate-500">ইউজারদের স্ট্যাটাস, রোল পরিবর্তন ও অ্যাক্সেস</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/admin/settings"
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all group shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      💬
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">WhatsApp সাপোর্ট নম্বর ও সেটিংস</h4>
                      <p className="text-[11px] text-slate-500">লাইভ চ্যাট বাটন নম্বর, মেসেজ ও পজিশন পরিবর্তন</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/admin/pages"
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all group shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700">গ্লোবাল পেজ সমূহ</h4>
                      <p className="text-[11px] text-slate-500">সমস্ত কানেক্টেড পেজ ও ওয়েবহুক স্ট্যাটাস</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* System Audit Logs (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <span>সাম্প্রতিক প্ল্যাটফর্ম অ্যাক্টিভিটি লগ (Audit Trail)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="pb-3 font-semibold">সময়</th>
                      <th className="pb-3 font-semibold">অ্যাকশন</th>
                      <th className="pb-3 font-semibold">বিবরণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentLogs.length > 0 ? (
                      recentLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleTimeString('bn-BD', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 font-mono text-[10px]">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-slate-800">{log.description}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-400">
                          কোনো সাম্প্রতিক অ্যাক্টিভিটি লগ পাওয়া যায়নি।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
