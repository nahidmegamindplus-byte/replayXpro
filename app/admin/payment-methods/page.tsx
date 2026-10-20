'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Phone,
  ShieldCheck,
  X,
  FileText,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export default function AdminPaymentMethodsPage() {
  const toast = useToast();
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Add & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('Personal');
  const [instructions, setInstructions] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>('/api/admin/payment-methods', { retries: 2 });
      if (data?.success) {
        setMethods(Array.isArray(data.paymentMethods) ? data.paymentMethods : []);
      }
    } catch (e) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleOpenAdd = () => {
    setEditingMethod(null);
    setName('');
    setDisplayName('');
    setAccountNumber('');
    setAccountType('Personal');
    setInstructions('Send Money করে Transaction ID দিন।');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pm: any) => {
    setEditingMethod(pm);
    setName(pm.name || '');
    setDisplayName(pm.displayName || '');
    setAccountNumber(pm.accountNumber || '');
    setAccountType(pm.accountType || 'Personal');
    setInstructions(pm.instructions || '');
    setIsActive(Boolean(pm.isActive));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) {
      toast.error('একাউন্ট নম্বর আবশ্যক।');
      return;
    }

    setSaving(true);
    try {
      const url = '/api/admin/payment-methods';
      const method = editingMethod ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingMethod && { id: editingMethod.id }),
          name: name.trim().toUpperCase(),
          displayName: displayName.trim(),
          accountNumber: accountNumber.trim(),
          accountType,
          instructions: instructions.trim(),
          isActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'পেমেন্ট মেথড সংরক্ষিত হয়েছে!');
        setIsModalOpen(false);
        fetchMethods();
      } else {
        toast.error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nameStr: string) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে "${nameStr}" পেমেন্ট মেথডটি মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/admin/payment-methods?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'পেমেন্ট মেthড মুছে ফেলা হয়েছে!');
        fetchMethods();
      } else {
        toast.error(data.error || 'মুছতে ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    }
  };

  return (
    <AdminLayout
      title="💳 পেমেন্ট মাধ্যম পরিচালনা (Payment Methods Management)"
      subtitle="bKash, Nagad, Rocket, Upay বা অন্য যেকোনো রিসিভার নম্বর যুক্ত, সংশোধন ও ডিলিট করুন"
    >
      <div className="max-w-5xl space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 text-xs text-slate-700">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              গ্রাহকরা চেকআউট পেজে এই নম্বরগুলোতে <strong>Send Money</strong> করবে এবং TrxID প্রদান করবে।
            </span>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xs transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন মেথড যুক্ত করুন</span>
          </button>
        </div>

        {/* Methods Grid */}
        {loading ? (
          <div className="py-24 text-center text-sm text-slate-500">পেমেন্ট মেথড লোড হচ্ছে...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {methods.map((pm) => {
              const colorMap: any = {
                BKASH: 'from-pink-50 to-rose-50 border-pink-200 text-pink-700',
                NAGAD: 'from-orange-50 to-amber-50 border-orange-200 text-orange-700',
                ROCKET: 'from-purple-50 to-indigo-50 border-purple-200 text-purple-700',
                UPAY: 'from-blue-50 to-cyan-50 border-blue-200 text-blue-700',
              };

              const style = colorMap[pm.name] || 'from-purple-50 to-indigo-50 border-purple-200 text-purple-700';

              return (
                <div
                  key={pm.id}
                  className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded-xl bg-gradient-to-r ${style} border text-xs font-bold`}>
                        {pm.displayName}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          pm.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {pm.isActive ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">একাউন্ট টাইপ:</span>
                        <span className="font-semibold text-slate-900">{pm.accountType}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">রিসিভার নম্বর:</span>
                        <span className="font-mono text-purple-700 font-extrabold text-sm">{pm.accountNumber}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {pm.instructions || 'Send Money করে TrxID দিন।'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {pm._count?.orders || 0} টি পেমেন্ট অর্ডার
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(pm)}
                        className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs transition-colors shadow-2xs"
                        title="সম্পাদনা করুন"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pm.id, pm.displayName)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 text-xs transition-colors shadow-2xs"
                        title="মুছে ফেলুন"
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
      </div>

      {/* Add / Edit Payment Method Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingMethod ? `${editingMethod.displayName} কনফিগারেশন` : 'নতুন পেমেন্ট মেথড তৈরি'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">রিসিভার মোবাইল নম্বর এবং গ্রাহক নির্দেশনা লিখুন</p>

            <form onSubmit={handleSave} className="space-y-4">
              {!editingMethod && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    মেথডের কীওয়ার্ড/কোড (e.g. CELLFIN, TAP) *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: CELLFIN"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono uppercase focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  ডিসপ্লে নাম (Display Name) *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="যেমন: সেলফিন / বিকাশ"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  টাকা গ্রহণের মোবাইল নম্বর *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  একাউন্ট টাইপ
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-600"
                >
                  <option value="Personal">Personal (ব্যক্তিগত)</option>
                  <option value="Merchant">Merchant (মার্চেন্ট)</option>
                  <option value="Agent">Agent (এজেন্ট)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  গ্রাহকদের জন্য নির্দেশনা (Instructions)
                </label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="যেমন: বিকাশ অ্যাপ থেকে Send Money করুন এবং Transaction ID দিন।"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs leading-relaxed focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="accent-purple-600 rounded"
                  />
                  <span>এই পেমেন্ট মাধ্যমটি সক্রিয় রাখুন (Active)</span>
                </label>
              </div>

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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all"
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
