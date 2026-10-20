'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Layers,
  Search,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export default function AdminPagesPage() {
  const toast = useToast();
  const [pages, setPages] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>('/api/admin/pages', { retries: 2 });
      if (data?.success && Array.isArray(data.pages)) {
        setPages(data.pages);
      }
    } catch (e) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const filteredPages = (pages || []).filter(
    (p) =>
      (p.pageName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.facebookPageId || '').toLowerCase().includes(search.toLowerCase()) ||
      p.owner?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      p.owner?.businessName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout
      title="সংযুক্ত ফেসবুক পেজ সমূহ (Global Pages)"
      subtitle="প্ল্যাটফর্মের সমস্ত ব্যবহারকারীর কানেক্টেড ফেসবুক পেজ এবং ওয়েবহুক স্ট্যাটাস"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="পেজ নাম, Page ID বা মালিকের নাম..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 shadow-xs transition-all"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500">
          মোট পেজ: <strong className="text-slate-900">{filteredPages.length}</strong> টি
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-slate-500">পেজ তালিকা লোড হচ্ছে...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">পেজের নাম</th>
                  <th className="py-3.5 px-4 font-semibold">Page ID</th>
                  <th className="py-3.5 px-4 font-semibold">মালিক / ব্যবসা</th>
                  <th className="py-3.5 px-4 font-semibold">কানেকশন স্ট্যাটাস</th>
                  <th className="py-3.5 px-4 font-semibold">অটো রিপ্লাই</th>
                  <th className="py-3.5 px-4 font-semibold">মেসেজ / অর্ডার</th>
                  <th className="py-3.5 px-4 font-semibold">তারিখ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPages.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.pageName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{p.facebookPageId}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{p.owner?.fullName}</div>
                      <div className="text-[11px] text-slate-500">{p.owner?.businessName || p.owner?.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
                          p.connectionStatus === 'CONNECTED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.connectionStatus === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {p.connectionStatus === 'CONNECTED'
                          ? 'সক্রিয় (Connected)'
                          : p.connectionStatus === 'PENDING'
                          ? 'অযাচাইকৃত (Pending)'
                          : 'নিষ্ক্রিয় (Disconnected)'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={p.autoReplyEnabled ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                        {p.autoReplyEnabled ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {p.counts?.conversations || 0} চ্যাট • {p.counts?.orders || 0} অর্ডার
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
