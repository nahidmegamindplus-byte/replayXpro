'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Link from 'next/link';
import {
  Key,
  Plus,
  Copy,
  Check,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Edit2,
  Trash2,
  Users,
  Sparkles,
  Layers,
  Bot,
  Zap,
  Phone,
  Building,
  Eye,
  X,
  Share2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export default function AdminLicensesPage() {
  const toast = useToast();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({ total: 0, active: 0, used: 0, expired: 0, revoked: 0 });
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<any>(null);
  const [viewingLicense, setViewingLicense] = useState<any>(null);

  // Generator Form State
  const [formPackageId, setFormPackageId] = useState('');
  const [formPlan, setFormPlan] = useState('BUSINESS');
  const [formCount, setFormCount] = useState('1');
  const [formDurationDays, setFormDurationDays] = useState('30');
  const [formMessageLimit, setFormMessageLimit] = useState('3000');
  const [formPageLimit, setFormPageLimit] = useState('3');
  const [formProductLimit, setFormProductLimit] = useState('200');
  const [formClientName, setFormClientName] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formClientNote, setFormClientNote] = useState('');
  const [formCustomPrefix, setFormCustomPrefix] = useState('RPLX');
  const [generating, setGenerating] = useState(false);

  // Edit Form State
  const [editDurationDays, setEditDurationDays] = useState('30');
  const [editMessageLimit, setEditMessageLimit] = useState('3000');
  const [editPageLimit, setEditPageLimit] = useState('3');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientNote, setEditClientNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>(`/api/admin/licenses?status=${statusFilter}`, { retries: 2 });
      if (data?.success) {
        setLicenses(Array.isArray(data.licenses) ? data.licenses : []);
        setCounts(data.counts || { total: 0, active: 0, used: 0, expired: 0, revoked: 0 });
      }
    } catch (e) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const data = await apiFetch<any>('/api/admin/packages', { retries: 2 });
      if (data?.success && Array.isArray(data.packages)) {
        setPackages(data.packages);
        if (data.packages.length > 0) {
          const defaultPkg = data.packages.find((p: any) => p.isPopular) || data.packages[0];
          setFormPackageId(defaultPkg.id);
          setFormPlan(defaultPkg.slug.toUpperCase());
          setFormDurationDays(defaultPkg.durationDays.toString());
          setFormMessageLimit(defaultPkg.messageLimit.toString());
          setFormPageLimit(defaultPkg.pageLimit.toString());
          setFormProductLimit(defaultPkg.productLimit.toString());
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchLicenses();
    fetchPackages();
  }, [statusFilter]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} কপি করা হয়েছে!`);
  };

  const handleCopyDirectLink = (key: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://replax-ai.vercel.app';
    const directLink = `${origin}/activate?key=${encodeURIComponent(key)}`;
    navigator.clipboard.writeText(directLink);
    toast.success('ডাইরেক্ট অ্যাক্টিভেশন লিংক কপি হয়েছে!');
  };

  const handlePackageChange = (pkgId: string) => {
    setFormPackageId(pkgId);
    const selectedPkg = packages.find((p) => p.id === pkgId);
    if (selectedPkg) {
      setFormPlan(selectedPkg.slug.toUpperCase());
      setFormDurationDays(selectedPkg.durationDays.toString());
      setFormMessageLimit(selectedPkg.messageLimit.toString());
      setFormPageLimit(selectedPkg.pageLimit.toString());
      setFormProductLimit(selectedPkg.productLimit.toString());
    }
  };

  // Generate License Keys
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: formPackageId || undefined,
          plan: formPlan,
          count: parseInt(formCount) || 1,
          durationDays: parseInt(formDurationDays) || 30,
          messageLimit: parseInt(formMessageLimit) || 3000,
          pageLimit: parseInt(formPageLimit) || 3,
          productLimit: parseInt(formProductLimit) || 200,
          clientName: formClientName,
          clientPhone: formClientPhone,
          clientNote: formClientNote,
          customPrefix: formCustomPrefix || 'RPLX',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'লাইসেন্স কি সফলভাবে তৈরি হয়েছে!');
        setGeneratedBatch(data.keys || []);
        fetchLicenses();
      } else {
        toast.error(data.error || 'লাইসেন্স তৈরি ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    } finally {
      setGenerating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (lic: any) => {
    setEditingLicense(lic);
    setEditDurationDays(lic.durationDays?.toString() || '30');
    setEditMessageLimit(lic.messageLimit?.toString() || '3000');
    setEditPageLimit(lic.pageLimit?.toString() || '3');
    setEditStatus(lic.status || 'ACTIVE');
    setEditClientName(lic.clientName || '');
    setEditClientPhone(lic.clientPhone || '');
    setEditClientNote(lic.clientNote || '');
    setIsEditModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicense) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/licenses/${editingLicense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationDays: parseInt(editDurationDays),
          messageLimit: parseInt(editMessageLimit),
          pageLimit: parseInt(editPageLimit),
          status: editStatus,
          clientName: editClientName,
          clientPhone: editClientPhone,
          clientNote: editClientNote,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('লাইসেন্স কি আপডেট হয়েছে!');
        setIsEditModalOpen(false);
        setEditingLicense(null);
        fetchLicenses();
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    } finally {
      setUpdating(false);
    }
  };

  // Toggle Revoke/Active
  const handleToggleStatus = async (lic: any) => {
    const nextStatus = lic.status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';
    const actionLabel = nextStatus === 'REVOKED' ? 'বাতিল (Revoke)' : 'সক্রিয় (Activate)';

    if (!confirm(`আপনি কি "${lic.key}" লাইসেন্সটি ${actionLabel} করতে চান?`)) return;

    try {
      const res = await fetch(`/api/admin/licenses/${lic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`লাইসেন্স কি ${actionLabel} করা হয়েছে!`);
        fetchLicenses();
      } else {
        toast.error(data.error || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    }
  };

  // Delete License
  const handleDeleteLicense = async (lic: any) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে "${lic.key}" লাইসেন্সটি মুছে ফেলতে চান? এটি স্থায়ীভাবে রিমুভ হয়ে যাবে।`)) return;

    try {
      const res = await fetch(`/api/admin/licenses/${lic.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        toast.success('লাইসেন্স কি সফলভাবে মুছে ফেলা হয়েছে!');
        fetchLicenses();
      } else {
        toast.error(data.error || 'মুছতে ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    }
  };

  const handleCopyAllBatch = () => {
    if (generatedBatch.length === 0) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://replax-ai.vercel.app';
    const text = generatedBatch
      .map((k, idx) => `${idx + 1}. Key: ${k.key} | Plan: ${k.plan} (${k.durationDays}d) | Link: ${origin}/activate?key=${k.key}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('সকল জেনারেটেড কি ও লিংক কপি হয়েছে!');
  };

  const filteredLicenses = (licenses || []).filter((l) => {
    const s = search.toLowerCase();
    return (
      l.key?.toLowerCase().includes(s) ||
      l.plan?.toLowerCase().includes(s) ||
      l.clientName?.toLowerCase().includes(s) ||
      l.clientPhone?.includes(s) ||
      l.clientNote?.toLowerCase().includes(s) ||
      l.usedByUser?.fullName?.toLowerCase().includes(s) ||
      l.usedByUser?.businessName?.toLowerCase().includes(s) ||
      l.usedByUser?.email?.toLowerCase().includes(s)
    );
  });

  return (
    <AdminLayout
      title="🔑 লাইসেন্স কি জেনারেটর ও ইনস্ট্যান্ট এক্সেস কন্ট্রোল"
      subtitle="গ্রাহকদের জন্য রেজিস্ট্রেশনবিহীন ইনস্ট্যান্ট ড্যাশবোর্ড এক্সেস লাইসেন্স কি তৈরি ও পরিচালনা করুন"
    >
      {/* Top Banner with Quick Generator Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Key className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>লাইসেন্স কি দিয়ে রেজিস্ট্রেশন ছাড়া ১-ক্লিক প্রবেশ</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                1-Click Instant Access
              </span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              অ্যাডমিন এখান থেকে কি জেনারেট করে ক্লায়েন্টকে দেবে; ক্লায়েন্ট কি দিয়ে সরাসরি ড্যাশবোর্ডে লগইন হতে পারবে।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLicenses}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
            title="তালিকা রিফ্রেশ করুন"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/activate"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-xs"
          >
            <ExternalLink className="w-4 h-4 text-indigo-600" />
            <span>ইউজার অ্যাক্টিভেশন পেজ</span>
          </Link>

          <button
            onClick={() => {
              setGeneratedBatch([]);
              setIsGenerateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ নতুন লাইসেন্স কি তৈরি করুন</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-purple-600 text-white border-purple-600 shadow-md'
              : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-xs'
          }`}
        >
          <span className={`text-xs block mb-1 font-medium ${statusFilter === 'ALL' ? 'text-purple-100' : 'text-slate-500'}`}>মোট লাইসেন্স কি</span>
          <span className={`text-2xl font-black ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-900'}`}>{counts.total}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'ACTIVE'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
              : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-xs'
          }`}
        >
          <span className={`text-xs block mb-1 font-medium ${statusFilter === 'ACTIVE' ? 'text-emerald-100' : 'text-emerald-700'}`}>সক্রিয় (ব্যবহারযোগ্য)</span>
          <span className={`text-2xl font-black ${statusFilter === 'ACTIVE' ? 'text-white' : 'text-emerald-600'}`}>{counts.active}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('USED')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'USED'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
              : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-xs'
          }`}
        >
          <span className={`text-xs block mb-1 font-medium ${statusFilter === 'USED' ? 'text-indigo-100' : 'text-indigo-700'}`}>ব্যবহৃত (Active User)</span>
          <span className={`text-2xl font-black ${statusFilter === 'USED' ? 'text-white' : 'text-indigo-600'}`}>{counts.used}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('EXPIRED')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'EXPIRED'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md'
              : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-xs'
          }`}
        >
          <span className={`text-xs block mb-1 font-medium ${statusFilter === 'EXPIRED' ? 'text-amber-100' : 'text-amber-700'}`}>মেয়াদোত্তীর্ণ</span>
          <span className={`text-2xl font-black ${statusFilter === 'EXPIRED' ? 'text-white' : 'text-amber-600'}`}>{counts.expired}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('REVOKED')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'REVOKED'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md'
              : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-xs'
          }`}
        >
          <span className={`text-xs block mb-1 font-medium ${statusFilter === 'REVOKED' ? 'text-rose-100' : 'text-rose-700'}`}>বাতিল (Revoked)</span>
          <span className={`text-2xl font-black ${statusFilter === 'REVOKED' ? 'text-white' : 'text-rose-600'}`}>{counts.revoked}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="লাইসেন্স কি, ক্লায়েন্টের নাম, নম্বর, বা নোট দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 shadow-xs"
          />
        </div>

        <span className="text-xs text-slate-500">
          প্রদর্শিত হচ্ছে: <strong className="text-purple-700 font-bold">{filteredLicenses.length}</strong> টি কি
        </span>
      </div>

      {/* Licenses Table */}
      {loading ? (
        <div className="py-24 text-center text-sm text-slate-500">লাইসেন্স কি তালিকা লোড হচ্ছে...</div>
      ) : filteredLicenses.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto my-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-3">
            <Key className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">কোনো লাইসেন্স কি পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 mb-4">
            নতুন লাইসেন্স কি তৈরি করে ক্লায়েন্টদের ১-ক্লিক ড্যাশবোর্ড এক্সেস দিন।
          </p>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-500/20"
          >
            + নতুন লাইসেন্স কি তৈরি করুন
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3.5 px-4">লাইসেন্স কি (License Key)</th>
                  <th className="py-3.5 px-4">প্ল্যান ও মেয়াদ</th>
                  <th className="py-3.5 px-4">লিমিট (মেসেজ/পেজ)</th>
                  <th className="py-3.5 px-4">অ্যাসাইন করা ক্লায়েন্ট / ইউজার</th>
                  <th className="py-3.5 px-4">স্ট্যাটাস</th>
                  <th className="py-3.5 px-4">তৈরি ও অ্যাক্টিভেশন</th>
                  <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLicenses.map((lic) => {
                  const isActive = lic.status === 'ACTIVE';
                  const isUsed = lic.status === 'USED';
                  const isRevoked = lic.status === 'REVOKED';
                  const isExpired = lic.status === 'EXPIRED';

                  return (
                    <tr key={lic.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Key Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-indigo-700 text-xs tracking-wider px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200/80">
                            {lic.key}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(lic.key, 'লাইসেন্স কি')}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                            title="কি কপি করুন"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyDirectLink(lic.key)}
                            className="p-1 text-slate-400 hover:text-purple-600"
                            title="১-ক্লিক ডাইরেক্ট লগইন লিংক কপি করুন"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {lic.clientNote && (
                          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] truncate" title={lic.clientNote}>
                            নোট: {lic.clientNote}
                          </p>
                        )}
                      </td>

                      {/* Plan & Duration */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[11px] block w-fit mb-1">
                          {lic.package?.name || lic.plan}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {lic.durationDays >= 999 ? 'লাইফটাইম' : `${lic.durationDays} দিন মেয়াদ`}
                        </span>
                      </td>

                      {/* Limits */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-mono font-bold">
                          {lic.messageLimit.toLocaleString()} মেসেজ
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {lic.pageLimit}টি পেজ • {lic.productLimit}টি পণ্য
                        </div>
                      </td>

                      {/* Client / User Info */}
                      <td className="py-3.5 px-4">
                        {lic.usedByUser ? (
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              <span>{lic.usedByUser.businessName || lic.usedByUser.fullName}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {lic.usedByUser.email} {lic.usedByUser.phone ? `• ${lic.usedByUser.phone}` : ''}
                            </div>
                          </div>
                        ) : lic.clientName ? (
                          <div>
                            <div className="font-semibold text-slate-900">{lic.clientName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{lic.clientPhone || 'অ্যাসাইন করা'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">উন্মুক্ত (যেকোনো ইউজার)</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider inline-flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isUsed
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : isExpired
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Zap className="w-3 h-3 text-emerald-600" />
                              <span>সক্রিয়</span>
                            </>
                          ) : isUsed ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                              <span>ব্যবহৃত</span>
                            </>
                          ) : isExpired ? (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>মেয়াদ শেষ</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>বাতিল</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-[10px] text-slate-500">
                        <div>তৈরি: {new Date(lic.createdAt).toLocaleDateString('bn-BD')}</div>
                        {lic.usedAt && (
                          <div className="text-indigo-600 font-medium">
                            ব্যবহার: {new Date(lic.usedAt).toLocaleDateString('bn-BD')}
                          </div>
                        )}
                        {lic.expiresAt && (
                          <div className="text-amber-600 font-medium">
                            মেয়াদ: {new Date(lic.expiresAt).toLocaleDateString('bn-BD')}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Copy Link */}
                          <button
                            onClick={() => handleCopyDirectLink(lic.key)}
                            className="p-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
                            title="১-ক্লিক ডাইরেক্ট অ্যাক্টিভেশন লিংক কপি করুন"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* View details */}
                          <button
                            onClick={() => setViewingLicense(lic)}
                            className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                            title="বিস্তারিত দেখুন"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(lic)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                            title="সম্পাদনা করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Revoke / Active */}
                          <button
                            onClick={() => handleToggleStatus(lic)}
                            className={`p-1.5 rounded-xl border transition-colors ${
                              isRevoked
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                            }`}
                            title={isRevoked ? 'সক্রিয় করুন' : 'বাতিল (Revoke) করুন'}
                          >
                            {isRevoked ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteLicense(lic)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
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

      {/* Generate License Key Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsGenerateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">নতুন লাইসেন্স কি তৈরি করুন</h3>
                <p className="text-xs text-slate-500">একক বা একাধিক (বাল্ক) লাইসেন্স কি জেনারেট করুন</p>
              </div>
            </div>

            {/* Generated Batch Success Box */}
            {generatedBatch.length > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{generatedBatch.length}টি লাইসেন্স কি সফলভাবে তৈরি হয়েছে!</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAllBatch}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>সব কপি করুন</span>
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {generatedBatch.map((k) => (
                    <div
                      key={k.id}
                      className="p-2 rounded-xl bg-white border border-emerald-200 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono font-bold text-indigo-700">{k.key}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{k.plan} ({k.durationDays}d)</span>
                        <button
                          onClick={() => handleCopy(k.key, 'লাইসেন্স কি')}
                          className="text-slate-400 hover:text-emerald-600 p-0.5"
                          title="কি কপি করুন"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Package Selector & Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    প্যাকেজ টেমপ্লেট
                  </label>
                  <select
                    value={formPackageId}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  >
                    <option value="">-- কাস্টম কনফিগারেশন --</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (৳{p.price}) - {p.durationDays} দিন
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    প্ল্যান টিয়ার (Plan Tier)
                  </label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  >
                    <option value="STARTER">STARTER (স্টার্টার)</option>
                    <option value="BUSINESS">BUSINESS (বিজনেস)</option>
                    <option value="PRO">PRO (প্রো)</option>
                  </select>
                </div>
              </div>

              {/* Count & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    কতগুলো কি জেনারেট করবেন? *
                  </label>
                  <select
                    value={formCount}
                    onChange={(e) => setFormCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  >
                    <option value="1">১টি কি (Single Key)</option>
                    <option value="5">৫টি কি (5 Keys Bulk)</option>
                    <option value="10">১০টি কি (10 Keys Bulk)</option>
                    <option value="20">২০টি কি (20 Keys Bulk)</option>
                    <option value="50">৫০টি কি (50 Keys Bulk)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    মেয়াদ (দিন) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formDurationDays}
                    onChange={(e) => setFormDurationDays(e.target.value)}
                    placeholder="30"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>
              </div>

              {/* Message Limit & Page Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    মেসেজ লিমিট *
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={formMessageLimit}
                    onChange={(e) => setFormMessageLimit(e.target.value)}
                    placeholder="3000"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    পেজ লিমিট *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPageLimit}
                    onChange={(e) => setFormPageLimit(e.target.value)}
                    placeholder="3"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    কাস্টম প্রিফিক্স
                  </label>
                  <input
                    type="text"
                    value={formCustomPrefix}
                    onChange={(e) => setFormCustomPrefix(e.target.value.toUpperCase())}
                    placeholder="RPLX"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono uppercase focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>
              </div>

              {/* Optional Client Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    নির্দিষ্ট ক্লায়েন্টের নাম (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    placeholder="যেমন: Tanvir Fashion"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    ক্লায়েন্ট ফোন নম্বর (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={formClientPhone}
                    onChange={(e) => setFormClientPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>
              </div>

              {/* Client Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  অ্যাডমিন নোট / নির্দেশনা
                </label>
                <textarea
                  rows={2}
                  value={formClientNote}
                  onChange={(e) => setFormClientNote(e.target.value)}
                  placeholder="যেমন: ৩ মাসের বিজনেস অফার কি।"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
                >
                  বন্ধ করুন
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all"
                >
                  {generating ? 'জেনারেট হচ্ছে...' : '⚡ লাইসেন্স কি তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit License Modal */}
      {isEditModalOpen && editingLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">লাইসেন্স কি সম্পাদনা</h3>
            <p className="text-xs text-indigo-700 font-mono mb-4">{editingLicense.key}</p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    স্ট্যাটাস *
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  >
                    <option value="ACTIVE">ACTIVE (সক্রিয়)</option>
                    <option value="USED">USED (ব্যবহৃত)</option>
                    <option value="EXPIRED">EXPIRED (মেয়াদ শেষ)</option>
                    <option value="REVOKED">REVOKED (বাতিল)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    মেয়াদ (দিন) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editDurationDays}
                    onChange={(e) => setEditDurationDays(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    মেসেজ লিমিট *
                  </label>
                  <input
                    type="number"
                    required
                    value={editMessageLimit}
                    onChange={(e) => setEditMessageLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    পেজ লিমিট *
                  </label>
                  <input
                    type="number"
                    required
                    value={editPageLimit}
                    onChange={(e) => setEditPageLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  ক্লায়েন্টের নাম
                </label>
                <input
                  type="text"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  নোট
                </label>
                <textarea
                  rows={2}
                  value={editClientNote}
                  onChange={(e) => setEditClientNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all"
                >
                  {updating ? 'আপডেট হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View License Modal */}
      {viewingLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setViewingLicense(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">লাইসেন্স বিস্তারিত</h3>
                <span className="text-xs text-slate-500">{viewingLicense.plan} প্ল্যান</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block mb-1">লাইসেন্স কি:</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-700 text-sm">{viewingLicense.key}</span>
                  <button
                    onClick={() => handleCopy(viewingLicense.key, 'লাইসেন্স কি')}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">মেয়াদ:</span>
                    <p className="font-bold text-slate-900">{viewingLicense.durationDays} দিন</p>
                  </div>
                  <div>
                    <span className="text-slate-500">মেসেজ লিমিট:</span>
                    <p className="font-mono font-bold text-emerald-600">{viewingLicense.messageLimit.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">পেজ লিমিট:</span>
                    <p className="font-bold text-slate-900">{viewingLicense.pageLimit} টি</p>
                  </div>
                  <div>
                    <span className="text-slate-500">স্ট্যাটাস:</span>
                    <p className="font-bold text-indigo-600">{viewingLicense.status}</p>
                  </div>
                </div>
              </div>

              {viewingLicense.usedByUser && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="text-emerald-800 font-bold block">ব্যবহারকারী তথ্য:</span>
                  <p className="text-slate-900 font-bold">{viewingLicense.usedByUser.businessName || viewingLicense.usedByUser.fullName}</p>
                  <p className="text-slate-600 font-mono">{viewingLicense.usedByUser.email}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleCopyDirectLink(viewingLicense.key)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>ডাইরেক্ট লিংক কপি করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
