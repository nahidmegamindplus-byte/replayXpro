'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Building,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Save,
  CheckCircle2,
  Lock,
  Cpu,
  Eye,
  EyeOff,
  Key,
  Truck,
  Wallet,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Store,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export default function UserSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Business Profile Form
  const [profile, setProfile] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    plan: 'STARTER',
    status: 'ACTIVE',
  });

  // Courier Integration State (Steadfast & Pathao)
  const [courierTab, setCourierTab] = useState<'steadfast' | 'pathao'>('steadfast');
  const [defaultProvider, setDefaultProvider] = useState<'STEADFAST' | 'PATHAO'>('STEADFAST');
  const [settingDefaultProvider, setSettingDefaultProvider] = useState(false);

  // Steadfast State
  const [courierApiKey, setCourierApiKey] = useState('');
  const [courierSecretKey, setCourierSecretKey] = useState('');
  const [courierActive, setCourierActive] = useState(true);
  const [steadfastStatus, setSteadfastStatus] = useState<{
    hasApiKey: boolean;
    hasSecretKey: boolean;
    isActive: boolean;
    currentBalance: number | null;
    balanceError: string | null;
  }>({
    hasApiKey: false,
    hasSecretKey: false,
    isActive: false,
    currentBalance: null,
    balanceError: null,
  });
  const [showCourierApiKey, setShowCourierApiKey] = useState(false);
  const [showCourierSecretKey, setShowCourierSecretKey] = useState(false);
  const [savingSteadfast, setSavingSteadfast] = useState(false);
  const [loadingCourierBalance, setLoadingCourierBalance] = useState(false);

  // Pathao State
  const [pathaoClientId, setPathaoClientId] = useState('');
  const [pathaoClientSecret, setPathaoClientSecret] = useState('');
  const [pathaoUsername, setPathaoUsername] = useState('');
  const [pathaoPassword, setPathaoPassword] = useState('');
  const [pathaoStoreId, setPathaoStoreId] = useState('');
  const [pathaoActive, setPathaoActive] = useState(true);
  const [pathaoStatus, setPathaoStatus] = useState<{
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasUsername: boolean;
    hasPassword: boolean;
    storeId: string | null;
    isActive: boolean;
    stores: Array<{ store_id: number | string; store_name: string; store_address?: string }>;
    error: string | null;
  }>({
    hasClientId: false,
    hasClientSecret: false,
    hasUsername: false,
    hasPassword: false,
    storeId: null,
    isActive: false,
    stores: [],
    error: null,
  });
  const [showPathaoSecret, setShowPathaoSecret] = useState(false);
  const [showPathaoPassword, setShowPathaoPassword] = useState(false);
  const [savingPathao, setSavingPathao] = useState(false);

  // Password Change Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility Toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>('/api/auth/me', { retries: 2 });

      if (data?.success && data.user) {
        setProfile({
          fullName: data.user.fullName || '',
          businessName: data.user.businessName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          plan: data.user.plan || 'STARTER',
          status: data.user.status || 'ACTIVE',
        });
      }
    } catch (e) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  const fetchCourierSettings = async () => {
    try {
      setLoadingCourierBalance(true);
      const res = await fetch('/api/courier/settings');
      const data = await res.json();
      if (data?.success && data.settings) {
        if (data.settings.defaultProvider) {
          setDefaultProvider(data.settings.defaultProvider);
        }
        if (data.settings.steadfast) {
          setSteadfastStatus(data.settings.steadfast);
          setCourierActive(data.settings.steadfast.isActive);
        }
        if (data.settings.pathao) {
          setPathaoStatus(data.settings.pathao);
          setPathaoActive(data.settings.pathao.isActive);
          if (data.settings.pathao.storeId) {
            setPathaoStoreId(String(data.settings.pathao.storeId));
          }
        }
      }
    } catch (e) {
      // Ignored
    } finally {
      setLoadingCourierBalance(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchCourierSettings();
  }, []);

  const handleSetDefaultProvider = async (provider: 'STEADFAST' | 'PATHAO') => {
    try {
      setSettingDefaultProvider(true);
      const res = await fetch('/api/courier/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (data?.success) {
        setDefaultProvider(provider);
        toast.success(`ডিফল্ট কুরিয়ার হিসেবে ${provider === 'PATHAO' ? 'পাঠাও (Pathao)' : 'Steadfast'} নির্বাচন করা হয়েছে!`);
      } else {
        toast.error(data.error || 'ডিফল্ট কুরিয়ার পরিবর্তন ব্যর্থ হয়েছে।');
      }
    } catch {
      toast.error('সার্ভারে যোগাযোগ করা যায়নি।');
    } finally {
      setSettingDefaultProvider(false);
    }
  };

  const handleSaveSteadfastSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierApiKey && !steadfastStatus.hasApiKey) {
      toast.error('Steadfast API Key প্রদান করুন।');
      return;
    }
    if (!courierSecretKey && !steadfastStatus.hasSecretKey) {
      toast.error('Steadfast Secret Key প্রদান করুন।');
      return;
    }

    setSavingSteadfast(true);
    try {
      const res = await fetch('/api/courier/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: defaultProvider,
          steadfast: {
            apiKey: courierApiKey || undefined,
            secretKey: courierSecretKey || undefined,
            isActive: courierActive,
          },
        }),
      });

      const data = await res.json();
      if (data?.success) {
        toast.success(data.message || 'Steadfast কুরিয়ার সফলভাবে সংযুক্ত হয়েছে!');
        setCourierApiKey('');
        setCourierSecretKey('');
        fetchCourierSettings();
      } else {
        toast.error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভারে যোগাযোগ করা যায়নি।');
    } finally {
      setSavingSteadfast(false);
    }
  };

  const handleSavePathaoSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathaoClientId && !pathaoStatus.hasClientId) {
      toast.error('Pathao Client ID প্রদান করুন।');
      return;
    }
    if (!pathaoClientSecret && !pathaoStatus.hasClientSecret) {
      toast.error('Pathao Client Secret প্রদান করুন।');
      return;
    }
    if (!pathaoUsername && !pathaoStatus.hasUsername) {
      toast.error('Pathao Username/Email প্রদান করুন।');
      return;
    }
    if (!pathaoPassword && !pathaoStatus.hasPassword) {
      toast.error('Pathao Password প্রদান করুন।');
      return;
    }

    setSavingPathao(true);
    try {
      const res = await fetch('/api/courier/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: defaultProvider,
          pathao: {
            clientId: pathaoClientId || undefined,
            clientSecret: pathaoClientSecret || undefined,
            username: pathaoUsername || undefined,
            password: pathaoPassword || undefined,
            storeId: pathaoStoreId || undefined,
            isActive: pathaoActive,
          },
        }),
      });

      const data = await res.json();
      if (data?.success) {
        toast.success(data.message || 'পাঠাও (Pathao) কুরিয়ার সফলভাবে সংযুক্ত হয়েছে!');
        setPathaoClientId('');
        setPathaoClientSecret('');
        setPathaoUsername('');
        setPathaoPassword('');
        fetchCourierSettings();
      } else {
        toast.error(data.error || 'পাঠাও সংযোগ ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভারে যোগাযোগ করা যায়নি।');
    } finally {
      setSavingPathao(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: profile.fullName,
          businessName: profile.businessName,
          phone: profile.phone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'ব্যবসার তথ্য সফলভাবে সংরক্ষিত হয়েছে!');
        fetchProfile();
      } else {
        toast.error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('বর্তমান পাসওয়ার্ড প্রদান করুন।');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('নতুন পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মেলেনি।');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভারে সমস্যা হয়েছে।');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <DashboardLayout
      title="ব্যবসার সেটিংস"
      subtitle="আপনার ব্যবসা ও প্রোফাইল পরিচিতি"
    >
      <div className="max-w-3xl space-y-6">
        {/* Business Profile Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <span>ব্যবসা ও প্রোফাইল তথ্য</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                আপনার ব্যবসায়ের নাম এবং কন্টাক্ট ইনফরমেশন পরিচালনা করুন
              </p>
            </div>

            <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ভেরিফাইড প্রোফাইল</span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">লোড হচ্ছে...</div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    ব্যবসার নাম
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={profile.businessName}
                      onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    মালিক / প্রতিনিধির নাম
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    ইমেইল অ্যাড্রেস
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      disabled
                      value={profile.email}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono text-xs cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    মোবাইল নম্বর
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="01XXXXXXXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Plan & AI Status Banner */}
              <div className="pt-3">
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>ReplyX AI অটোমেশন ইঞ্জিন</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      </p>
                      <p className="text-[11px] text-slate-600">
                        সিস্টেমের সেন্ট্রাল AI প্রোভাইডার (DeepSeek / Gemini / OpenAI) দ্বারা সকল সোশ্যাল মিডিয়া অটোরিপ্লাই সক্রিয় আছে।
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">
                    Active
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'তথ্য সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Courier Service Integration Card (Steadfast & Pathao) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6 pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                <span>কুরিয়ার সার্ভিস ইন্টিগ্রেশন (Courier API)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                অর্ডার সরাসরি পাঠাও (Pathao) অথবা Steadfast কুরিয়ারে বুকিং করতে API তথ্য যুক্ত করুন
              </p>
            </div>

            {/* Default Courier Provider Picker */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 pl-2">ডিফল্ট কুরিয়ার:</span>
              <button
                type="button"
                onClick={() => handleSetDefaultProvider('STEADFAST')}
                disabled={settingDefaultProvider}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  defaultProvider === 'STEADFAST'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Steadfast
              </button>
              <button
                type="button"
                onClick={() => handleSetDefaultProvider('PATHAO')}
                disabled={settingDefaultProvider}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  defaultProvider === 'PATHAO'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                পাঠাও (Pathao)
              </button>
            </div>
          </div>

          {/* Courier Provider Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setCourierTab('pathao')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                courierTab === 'pathao'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>পাঠাও কুরিয়ার (Pathao Aladdin)</span>
              {pathaoStatus.hasClientId && pathaoStatus.hasUsername ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-semibold">সংযুক্ত</span>
              ) : (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">সংযুক্ত নেই</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCourierTab('steadfast')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                courierTab === 'steadfast'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Steadfast Courier</span>
              {steadfastStatus.hasApiKey && steadfastStatus.hasSecretKey ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-semibold">সংযুক্ত</span>
              ) : (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">সংযুক্ত নেই</span>
              )}
            </button>
          </div>

          {/* TAB 1: PATHAO COURIER */}
          {courierTab === 'pathao' && (
            <form onSubmit={handleSavePathaoSettings} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100">
                <div className="flex items-center gap-2">
                  {pathaoStatus.hasClientId && pathaoStatus.hasUsername ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> পাঠাও API সক্রিয় ও সংযুক্ত
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5" /> পাঠাও API সংযুক্ত নেই
                    </span>
                  )}
                  {pathaoStatus.stores && pathaoStatus.stores.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      <Store className="w-3.5 h-3.5" /> {pathaoStatus.stores.length} টি স্টোর পাওয়া গেছে
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchCourierSettings}
                    disabled={loadingCourierBalance}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-slate-700 border border-slate-200 text-xs font-medium hover:bg-slate-50 shadow-2xs"
                    title="পাঠাও সংযোগ ও স্টোর রিফ্রেশ করুন"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingCourierBalance ? 'animate-spin' : ''}`} />
                    <span>রিফ্রেশ</span>
                  </button>
                  <a
                    href="https://merchant.pathao.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>পাঠাও মার্চেন্ট পোর্টাল</span>
                  </a>
                </div>
              </div>

              {pathaoStatus.error && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>পাঠাও নোটিশ: {pathaoStatus.error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Pathao Client ID</span>
                    {pathaoStatus.hasClientId && (
                      <span className="text-[10px] text-emerald-600 font-medium lowercase">✓ সেভ করা আছে</span>
                    )}
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={pathaoClientId}
                      onChange={(e) => setPathaoClientId(e.target.value)}
                      placeholder={pathaoStatus.hasClientId ? '••••••••••••••••••••••••••••' : 'আপনার Pathao Client ID লিখুন'}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Client Secret */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Pathao Client Secret</span>
                    {pathaoStatus.hasClientSecret && (
                      <span className="text-[10px] text-emerald-600 font-medium lowercase">✓ সেভ করা আছে</span>
                    )}
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type={showPathaoSecret ? 'text' : 'password'}
                      value={pathaoClientSecret}
                      onChange={(e) => setPathaoClientSecret(e.target.value)}
                      placeholder={pathaoStatus.hasClientSecret ? '••••••••••••••••••••••••••••' : 'আপনার Pathao Client Secret লিখুন'}
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPathaoSecret(!showPathaoSecret)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    >
                      {showPathaoSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Username / Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Pathao Username (Email / Mobile)</span>
                    {pathaoStatus.hasUsername && (
                      <span className="text-[10px] text-emerald-600 font-medium lowercase">✓ সেভ করা আছে</span>
                    )}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={pathaoUsername}
                      onChange={(e) => setPathaoUsername(e.target.value)}
                      placeholder={pathaoStatus.hasUsername ? '••••••••••••••••••••••••••••' : 'মার্চেন্ট লগইন ইমেইল বা ফোন নম্বর'}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Pathao Password</span>
                    {pathaoStatus.hasPassword && (
                      <span className="text-[10px] text-emerald-600 font-medium lowercase">✓ সেভ করা আছে</span>
                    )}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type={showPathaoPassword ? 'text' : 'password'}
                      value={pathaoPassword}
                      onChange={(e) => setPathaoPassword(e.target.value)}
                      placeholder={pathaoStatus.hasPassword ? '••••••••••••••••••••••••••••' : 'মার্চেন্ট অ্যাকাউন্টের পাসওয়ার্ড'}
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPathaoPassword(!showPathaoPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    >
                      {showPathaoPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Store Selector (if stores available) */}
              {pathaoStatus.stores && pathaoStatus.stores.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    ডিফল্ট পিকআপ স্টোর / ওয়্যারহাউজ (Pickup Store)
                  </label>
                  <select
                    value={pathaoStoreId}
                    onChange={(e) => setPathaoStoreId(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-rose-600 font-medium"
                  >
                    <option value="">ডিফল্ট স্টোর নির্বাচন করুন (প্রথমটি স্বয়ংক্রিয়)</option>
                    {pathaoStatus.stores.map((s) => (
                      <option key={s.store_id} value={String(s.store_id)}>
                        {s.store_name} {s.store_address ? `(${s.store_address})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pathaoActive}
                    onChange={(e) => setPathaoActive(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-700 font-medium">পাঠাও (Pathao) কুরিয়ার ডেলিভারি সক্রিয় রাখুন</span>
                </label>

                <button
                  type="submit"
                  disabled={savingPathao}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingPathao ? 'যাচাই ও সংরক্ষণ হচ্ছে...' : 'পাঠাও সংযোগ ও সংরক্ষণ'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: STEADFAST COURIER */}
          {courierTab === 'steadfast' && (
            <form onSubmit={handleSaveSteadfastSettings} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <div className="flex items-center gap-2">
                  {steadfastStatus.hasApiKey && steadfastStatus.hasSecretKey ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Steadfast সংযুক্ত আছে
                      </span>
                      {steadfastStatus.currentBalance !== null && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Wallet className="w-3.5 h-3.5" /> ব্যালেন্স: {steadfastStatus.currentBalance} ৳
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5" /> Steadfast সংযুক্ত নেই
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchCourierSettings}
                    disabled={loadingCourierBalance}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-slate-700 border border-slate-200 text-xs font-medium hover:bg-slate-50 shadow-2xs"
                    title="ব্যালেন্স রিফ্রেশ করুন"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingCourierBalance ? 'animate-spin' : ''}`} />
                    <span>রিফ্রেশ</span>
                  </button>
                  <a
                    href="https://steadfast.com.bd"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Steadfast পোর্টাল</span>
                  </a>
                </div>
              </div>

              {steadfastStatus.balanceError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Steadfast নোটিশ: {steadfastStatus.balanceError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Steadfast API Key */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Steadfast API Key</span>
                    {steadfastStatus.hasApiKey && (
                      <span className="text-[10px] text-emerald-600 font-medium lowercase">✓ সেভ করা আছে</span>
                    )}
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type={showCourierApiKey ? 'text' : 'password'}
                      value={courierApiKey}
                      onChange={(e) => setCourierApiKey(e.target.value)}
                      placeholder={steadfastStatus.hasApiKey ? '••••••••••••••••••••••••••••' : 'আপনার Steadfast API Key লিখুন'}
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCourierApiKey(!showCourierApiKey)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    >
                      {showCourierApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Steadfast Secret Key */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Steadfast Secret Key</span>
                    {steadfastStatus.hasSecretKey && (
                      <span className="text-[10px] text-emerald-600 font-medium lowercase">✓ সেভ করা আছে</span>
                    )}
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type={showCourierSecretKey ? 'text' : 'password'}
                      value={courierSecretKey}
                      onChange={(e) => setCourierSecretKey(e.target.value)}
                      placeholder={steadfastStatus.hasSecretKey ? '••••••••••••••••••••••••••••' : 'আপনার Steadfast Secret Key লিখুন'}
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCourierSecretKey(!showCourierSecretKey)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    >
                      {showCourierSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={courierActive}
                    onChange={(e) => setCourierActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-700 font-medium">Steadfast কুরিয়ার অটোমেশন সক্রিয় রাখুন</span>
                </label>

                <button
                  type="submit"
                  disabled={savingSteadfast}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSteadfast ? 'যাচাই ও সংরক্ষণ হচ্ছে...' : 'Steadfast সংরক্ষণ ও সংযোগ পরীক্ষা'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security / Password Change Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              <span>পাসওয়ার্ড পরিবর্তন (Change Password)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              আপনার অ্যাকাউন্টের নিরাপত্তা নিশ্চিত করতে বর্তমান ও নতুন পাসওয়ার্ড প্রদান করুন
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                বর্তমান পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="বর্তমান পাসওয়ার্ড লিখুন"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                  title={showCurrentPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  নতুন পাসওয়ার্ড
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    title={showNewPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  নতুন পাসওয়ার্ড নিশ্চিত করুন
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    title={showConfirmPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all"
              >
                <Key className="w-4 h-4" />
                <span>{savingPassword ? 'পাসওয়ার্ড আপডেট হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
