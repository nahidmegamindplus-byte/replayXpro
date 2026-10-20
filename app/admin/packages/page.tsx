'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Package as PackageIcon,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Zap,
  Layers,
  MessageSquare,
  DollarSign,
  X,
  Check,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export default function AdminPackagesPage() {
  const toast = useToast();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('990');
  const [durationDays, setDurationDays] = useState('30');
  const [messageLimit, setMessageLimit] = useState('1000');
  const [pageLimit, setPageLimit] = useState('1');
  const [productLimit, setProductLimit] = useState('50');
  const [featureInputs, setFeatureInputs] = useState<string[]>(['']);
  const [isPopular, setIsPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>('/api/admin/packages', { retries: 2 });
      if (data?.success) {
        setPackages(Array.isArray(data.packages) ? data.packages : []);
      }
    } catch (e) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleOpenAdd = () => {
    setEditingPkg(null);
    setName('');
    setSlug('');
    setDescription('');
    setPrice('990');
    setDurationDays('30');
    setMessageLimit('1000');
    setPageLimit('1');
    setProductLimit('50');
    setFeatureInputs([
      '১টি ফেসবুক পেজ কানেকশন',
      '১,০০০ AI অটো রিপ্লাই / মাস',
      '৫০টি প্রোডাক্ট ইনভেন্টরি',
      'বাংলা ও ব্যাংলিশ সাপোর্ট',
    ]);
    setIsPopular(false);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg: any) => {
    setEditingPkg(pkg);
    setName(pkg.name);
    setSlug(pkg.slug);
    setDescription(pkg.description || '');
    setPrice((pkg.price ?? 0).toString());
    setDurationDays((pkg.durationDays ?? 30).toString());
    setMessageLimit((pkg.messageLimit ?? 1000).toString());
    setPageLimit((pkg.pageLimit ?? 1).toString());
    setProductLimit((pkg.productLimit ?? 50).toString());
    setFeatureInputs(
      Array.isArray(pkg.features) && pkg.features.length > 0 ? pkg.features : ['']
    );
    setIsPopular(Boolean(pkg.isPopular));
    setIsActive(Boolean(pkg.isActive));
    setIsModalOpen(true);
  };

  const handleAddFeatureField = () => {
    setFeatureInputs((prev) => [...prev, '']);
  };

  const handleRemoveFeatureField = (index: number) => {
    setFeatureInputs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleFeatureChange = (index: number, val: string) => {
    const updated = [...featureInputs];
    updated[index] = val;
    setFeatureInputs(updated);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('প্যাকেজের নাম লিখুন।');
      return;
    }

    setSaving(true);
    const validFeatures = featureInputs.map((f) => f.trim()).filter(Boolean);

    try {
      const url = editingPkg ? `/api/admin/packages/${editingPkg.id}` : '/api/admin/packages';
      const method = editingPkg ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim(),
          price: parseFloat(price),
          durationDays: parseInt(durationDays, 10),
          messageLimit: parseInt(messageLimit, 10),
          pageLimit: parseInt(pageLimit, 10),
          productLimit: parseInt(productLimit, 10),
          features: validFeatures,
          isPopular,
          isActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'প্যাকেজ সংরক্ষিত হয়েছে!');
        setIsModalOpen(false);
        fetchPackages();
      } else {
        toast.error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = async (id: string, pkgName: string) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে "${pkgName}" প্যাকেজটি মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/admin/packages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'প্যাকেজ ডিলিট করা হয়েছে!');
        fetchPackages();
      } else {
        toast.error(data.error || 'ডিলিট ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    }
  };

  return (
    <AdminLayout
      title="📦 সাবস্ক্রিপশন প্যাকেজ ম্যানেজমেন্ট"
      subtitle="ব্যবহারকারীদের জন্য নতুন প্যাকেজ তৈরি করুন, মূল্য ও লিমিট নির্ধারণ এবং পরিচালনা করুন"
    >
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-4 mb-8 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 p-5 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">সর্বমোট {packages.length} টি প্যাকেজ</h3>
          <p className="text-xs text-slate-600">গ্রাহকরা চেকআউট পেজে এই প্যাকেজগুলো দেখতে পাবেন</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন প্যাকেজ তৈরি করুন</span>
        </button>
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div className="py-24 text-center text-sm text-slate-500">প্যাকেজ তালিকা লোড হচ্ছে...</div>
      ) : packages.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto my-8 shadow-xs">
          <PackageIcon className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">কোনো প্যাকেজ তৈরি করা নেই</h3>
          <p className="text-xs text-slate-500 mb-6">উপরের বাটনে ক্লিক করে আপনার প্রথম সাবস্ক্রিপশন প্যাকেজ যোগ করুন।</p>
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xs"
          >
            + প্যাকেজ যোগ করুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const features = Array.isArray(pkg.features) ? pkg.features : [];
            const subscribersCount = pkg._count?.users || 0;
            const ordersCount = pkg._count?.orders || 0;

            return (
              <div
                key={pkg.id}
                className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
              >
                {pkg.isPopular && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                      Popular
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-bold text-slate-900">{pkg.name}</h4>
                    {!pkg.isActive && (
                      <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                        নিষ্ক্রিয়
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{pkg.description}</p>

                  <div className="mb-4 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-900">৳ {pkg.price}</span>
                    <span className="text-xs text-slate-500">/ {pkg.durationDays} দিন</span>
                  </div>

                  {/* Limits Badge Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">মেসেজ লিমিট</span>
                      <strong className="text-purple-700 font-mono">{pkg.messageLimit}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">পেজ লিমিট</span>
                      <strong className="text-indigo-700 font-mono">{pkg.pageLimit}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">প্রোডাক্ট</span>
                      <strong className="text-emerald-700 font-mono">{pkg.productLimit}</strong>
                    </div>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-2 text-xs text-slate-700 border-t border-slate-100 pt-4">
                    {features.map((feat: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Actions & Stats */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {subscribersCount} জন গ্রাহক • {ordersCount} টি অর্ডার
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(pkg)}
                      className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs transition-colors shadow-2xs"
                      title="এডিট করুন"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 text-xs transition-colors shadow-2xs"
                      title="ডিলিট করুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Package Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 text-slate-900">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingPkg ? 'প্যাকেজ সম্পাদনা (Edit Package)' : 'নতুন সাবস্ক্রিপশন প্যাকেজ তৈরি'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              প্যাকেজের মূল্য, মেয়াদ, AI মেসেজ লিমিট এবং ফিচার বুলেট নির্ধারণ করুন
            </p>

            <form onSubmit={handleSavePackage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    প্যাকেজের নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: বিজনেস প্রো"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    মূল্য (BDT ৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="990"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  সংক্ষিপ্ত বিবরণ
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="যেমন: দ্রুত বর্ধনশীল মাঝারি বিজনেসের জন্য আদর্শ"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 transition-all"
                />
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    মেয়াদ (দিন)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    AI মেসেজ লিমিট
                  </label>
                  <input
                    type="number"
                    required
                    min="50"
                    value={messageLimit}
                    onChange={(e) => setMessageLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    পেজ সংখ্যা
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={pageLimit}
                    onChange={(e) => setPageLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    প্রোডাক্ট লিমিট
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={productLimit}
                    onChange={(e) => setProductLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Dynamic Feature Bullets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    প্যাকেজ ফিচার তালিকা (Bullet Points)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddFeatureField}
                    className="text-xs text-purple-600 hover:text-purple-700 font-bold"
                  >
                    + আরও ফিচার যোগ করুন
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {featureInputs.map((feat, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => handleFeatureChange(idx, e.target.value)}
                        placeholder={`ফিচার পয়েন্ট ${idx + 1}`}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600"
                      />
                      {featureInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFeatureField(idx)}
                          className="px-2.5 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="accent-purple-600 rounded"
                  />
                  <span>জনপ্রিয় / রিকমেন্ডেড ব্যাজ দিন (Most Popular)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="accent-purple-600 rounded"
                  />
                  <span>সক্রিয় রাখুন (Active)</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all"
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : 'প্যাকেজ সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
