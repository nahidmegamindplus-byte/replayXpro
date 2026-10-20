'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  Zap,
  Phone,
  Hash,
  Copy,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Globe,
  Award,
  Users,
  Check,
  Lock,
  Flame,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';
import Logo from '@/components/common/Logo';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const packageIdParam = searchParams.get('packageId') || searchParams.get('pkg');

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Selected checkout options
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Urgency Timer State (10 Minutes = 600s)
  const [timeLeft, setTimeLeft] = useState(599);

  // Social Proof Ticker
  const [recentPurchases] = useState([
    { name: 'তানভীর হাসান (ঢাকা)', time: '২ মিনিট আগে', pkg: 'বিজনেস প্যাকেজ' },
    { name: 'আরিফ আহমেদ (চট্টগ্রাম)', time: '৫ মিনিট আগে', pkg: 'প্রো প্যাকেজ' },
    { name: 'সাবরিনা সুলতানা (সিলেট)', time: '৮ মিনিট আগে', pkg: 'স্টার্টার প্যাকেজ' },
    { name: 'মোঃ রনি (বগুড়া)', time: '১১ মিনিট আগে', pkg: 'বিজনেস প্যাকেজ' },
  ]);
  const [currentTickerIdx, setCurrentTickerIdx] = useState(0);

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Ticker Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTickerIdx((prev) => (prev + 1) % recentPurchases.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [recentPurchases.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadCheckoutData = async () => {
    try {
      setLoading(true);

      const [userData, subData, pkgData, pmData] = await Promise.all([
        apiFetch<any>('/api/auth/me', { retries: 2 }),
        apiFetch<any>('/api/packages/my-subscription', { retries: 2 }),
        apiFetch<any>('/api/packages', { retries: 2 }),
        apiFetch<any>('/api/payment-methods', { retries: 2 }),
      ]);

      if (!userData?.success || !userData?.user) {
        toast.error('অর্ডার সম্পন্ন করতে অনুগ্রহ করে প্রথমে লগইন বা রেজিস্ট্রেশন করুন।');
        router.push(`/login?redirect=/checkout${packageIdParam ? `?packageId=${packageIdParam}` : ''}`);
        return;
      }
      setCurrentUser(userData.user);

      if (subData?.success) {
        setSubscription(subData.subscription);
      }

      let targetPkg = null;
      if (pkgData?.success && pkgData.packages?.length > 0) {
        setPackages(pkgData.packages);

        if (packageIdParam) {
          targetPkg = pkgData.packages.find((p: any) => p.id === packageIdParam || p.slug === packageIdParam);
        }
        if (!targetPkg) {
          targetPkg = pkgData.packages.find((p: any) => p.isPopular) || pkgData.packages[0];
        }
        setSelectedPackage(targetPkg);
      }

      if (pmData?.success && pmData.paymentMethods?.length > 0) {
        setPaymentMethods(pmData.paymentMethods);
        setSelectedMethod(pmData.paymentMethods[0]);
      }
    } catch (e) {
      toast.error('চেকআউট তথ্য লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheckoutData();
  }, [packageIdParam]);

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    toast.success('নম্বর কপি করা হয়েছে!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error('অনুগ্রহ করে লগইন করুন।');
      router.push('/login?redirect=/checkout');
      return;
    }

    if (!selectedPackage || !selectedMethod) {
      toast.error('প্যাকেজ ও পেমেন্ট মাধ্যম সিলেক্ট করুন।');
      return;
    }

    if (!senderNumber.trim() || !transactionId.trim()) {
      toast.error('প্রেরকের নম্বর এবং Transaction ID আবশ্যক।');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/packages/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          paymentMethodId: selectedMethod.id,
          paymentMethodName: selectedMethod.displayName || selectedMethod.name,
          senderNumber: senderNumber.trim(),
          transactionId: transactionId.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'অর্ডার সফলভাবে জমা হয়েছে!');
        router.push('/subscribe');
      } else {
        toast.error(data.error || 'অর্ডার জমা ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভার ত্রুটি। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-purple-700">চেকআউট পেজ লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  const originalPrice = selectedPackage ? Math.round(selectedPackage.price * 2) : 0;
  const currentTicker = recentPurchases[currentTickerIdx];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      {/* Emergency Sticky Timer Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white py-2.5 px-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold tracking-wide">
            <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>জরুরি অফার! ৫০% ছাড় ও ফ্রি AI ইনস্টলেশন সুবিধাটি শেষ হচ্ছে:</span>
          </div>

          <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/20 text-amber-300 font-mono font-bold text-xs sm:text-sm backdrop-blur-xs">
            <Clock className="w-4 h-4 animate-spin text-amber-300" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-[41px] z-40 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" showSubtitle={true} subtitle="নিরাপদ ইনস্ট্যান্ট চেকআউট" />
          </Link>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline font-medium">256-Bit Encrypted Payment</span>
          </div>
        </div>
      </header>

      {/* Main Checkout Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">

        {/* Personalized Facebook Setup Confirmation Badge */}
        {currentUser && (
          <div className="mb-6 p-4 rounded-2xl bg-white border border-purple-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  গ্রাহক: <span className="text-purple-700 font-extrabold">{currentUser.fullName}</span> ({currentUser.businessName || 'Business'})
                </h4>
                {currentUser.facebookPageUrl ? (
                  <p className="text-xs text-slate-600 font-mono mt-0.5 flex items-center justify-center sm:justify-start gap-1">
                    <span>পেজ লিঙ্ক:</span>
                    <span className="text-indigo-600 font-semibold underline">{currentUser.facebookPageUrl}</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5">ফেসবুক পেজ AI অটোমেশন সেটআপ রেডি!</p>
                )}
              </div>
            </div>

            <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1.5 shrink-0 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Agent Integration Ready</span>
            </div>
          </div>
        )}

        {/* Severe Loss Aversion Warning Box */}
        <div className="mb-8 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-rose-50 via-amber-50/60 to-purple-50 border-2 border-rose-200/90 shadow-xs relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 border border-rose-300/80 text-rose-800 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                <span>সতর্কতা: ফেসবুক পেজে AI না থাকায় বিপুল ক্ষতি!</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                আপনি কি জানেন? প্রতিদিন AI অটোমেশন না থাকলে আপনার ২০-৩০ জন কাস্টমার হাতছাড়া হচ্ছে!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                কাস্টমার ইনবক্সে মেসেজ দেওয়ার ৩-৫ মিনিটের মধ্যে রিপ্লাই না পেলে <strong className="text-rose-700 underline">৮২% কাস্টমার প্রতিযোগী পেজ থেকে পণ্য কিনে নেয়</strong>। 
                ম্যানুয়ালি রিপ্লাই দেওয়া অসম্ভব — যার কারণে আপনার দৈনিক <strong className="text-amber-800 font-bold">৳১,৫০০ থেকে ৳৫,০০০+ টাকা অপচয়</strong> হচ্ছে!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-rose-200/90 text-center min-w-[210px] w-full md:w-auto shrink-0 space-y-1 shadow-xs">
              <div className="flex items-center justify-center gap-1 text-rose-600 text-xs font-bold uppercase">
                <TrendingDown className="w-4 h-4" />
                <span>আনুমানিক দৈনিক সেলস ক্ষতি</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
                - ৳ ১,৫০০-৫,০০০+
              </div>
              <p className="text-[10px] text-slate-500">এখনই AI চালু করে প্রতি মাসের লাখ টাকা বাঁচান</p>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid: Left Package Summary & Right Payment Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column (5 Cols): Selected Package & Value Highlights */}
          <div className="lg:col-span-5 space-y-6">
            {/* Package Summary Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[11px] text-purple-700 font-bold uppercase tracking-wider block">অর্ডার সমারি</span>
                  <h3 className="text-xl font-bold text-slate-900">{selectedPackage?.name}</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                  {selectedPackage?.durationDays} দিন মেয়াদ
                </span>
              </div>

              {/* Package Selector Dropdown if multiple packages available */}
              {packages.length > 1 && (
                <div className="mb-5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    অন্য প্যাকেজ নির্বাচন করতে চান?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {packages.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackage(pkg)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                          selectedPackage?.id === pkg.id
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-1 ring-purple-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {pkg.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5 text-xs mb-6">
                <div className="flex justify-between text-slate-500">
                  <span>নিয়মিত মূল্য:</span>
                  <span className="line-through text-rose-500 font-mono">৳ {originalPrice}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>৫০% ইনস্ট্যান্ট ছাড়:</span>
                  <span>- ৳ {originalPrice - (selectedPackage?.price || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>ফেসবুক AI ইনস্টলেশন চার্জ:</span>
                  <span className="text-emerald-700 font-bold">ফ্রি (৳১,৫০০ মান)</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-extrabold text-slate-900 text-sm">সর্বমোট প্রদেয় টাকা:</span>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-purple-700 font-mono">
                      ৳ {selectedPackage?.price}
                    </span>
                    <span className="block text-[10px] text-slate-500">এককালীন মূল্য ({selectedPackage?.durationDays} দিন)</span>
                  </div>
                </div>
              </div>

              {/* Bonus Included List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span>অর্ডারের সাথে যে বোনাসগুলো পাবেন:</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>২৪/৭ মেসেঞ্জার অটো-রিপ্লাই ও কাস্টমার চ্যাট AI</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>বাংলা, ইংলিশ ও বাংলিশ তিন ভাষাতেই স্মার্ট চ্যাট</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>প্রোডাক্ট ছবি দেখে ছবিসহ কাস্টমারকে সঠিক উত্তর দেওয়া</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>মেসেঞ্জারে অটোমেটিক অর্ডার নেওয়া ও নোটিফিকেশন</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust & Guarantee Box */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-2 shadow-2xs">
              <div className="flex justify-center items-center gap-2 text-emerald-800 font-bold text-xs">
                <Award className="w-5 h-5 text-emerald-600" />
                <span>৭ দিনের মানি ব্যাক গ্যারান্টি</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                প্যাকেজ কিনে সার্ভিস পছন্দ না হলে কোনো প্রশ্ন ছাড়াই ৭ দিনের মধ্যে সম্পূর্ণ টাকা ফেরত দেওয়া হবে।
              </p>
            </div>
          </div>

          {/* Right Column (7 Cols): Payment Selector & Transaction Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs relative">
            <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-sm font-black flex items-center justify-center shadow-xs">
                1
              </span>
              <span>পেমেন্ট করুন ও অর্ডার জমা দিন</span>
            </h3>

            {/* Payment Method Selector Tabs */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                পেমেন্ট মাধ্যম বেছে নিন:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {paymentMethods.map((pm) => {
                  const isSelected = selectedMethod?.id === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setSelectedMethod(pm)}
                      className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-purple-50 border-purple-600 text-purple-900 font-bold shadow-xs ring-2 ring-purple-600/20 scale-[1.02]'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm font-black">{pm.displayName}</span>
                      <span className="text-[10px] text-purple-700 font-semibold">{pm.accountType}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Method Details Card */}
            {selectedMethod && (
              <div className="mb-6 p-5 rounded-2xl bg-gradient-to-b from-purple-50/60 to-indigo-50/40 border border-purple-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-100">
                  <div>
                    <span className="text-[11px] text-slate-600 block font-semibold">
                      {selectedMethod.displayName} টাকা পাঠানোর নম্বর:
                    </span>
                    <span className="text-xl font-mono font-black text-purple-700 tracking-wider">
                      {selectedMethod.accountNumber}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyNumber(selectedMethod.accountNumber)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copied ? 'কপি হয়েছে!' : 'নম্বর কপি করুন'}</span>
                  </button>
                </div>

                <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed bg-white p-4 rounded-xl border border-purple-100 shadow-2xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <span>নির্দেশনা (কিভাবে টাকা পাঠাবেন):</span>
                  </p>
                  <p className="text-slate-600">
                    ১. {selectedMethod.displayName} অ্যাপ বা কোড ডায়াল করে <strong className="text-purple-700 font-mono">{selectedMethod.accountNumber}</strong> নম্বরে <strong className="text-slate-900">Send Money</strong> করুন।
                  </p>
                  <p className="text-slate-600">
                    ২. টাকার পরিমাণ: <strong className="text-purple-700 font-mono text-sm">৳ {selectedPackage?.price}</strong>
                  </p>
                  <p className="text-slate-600">
                    ৩. পেমেন্ট শেষে মেসেজ বা অ্যাপ থেকে পাওয়া <strong className="text-indigo-700 font-semibold">Transaction ID (TrxID)</strong> নিচে বসিয়ে অর্ডার সম্পন্ন করুন।
                  </p>
                </div>
              </div>
            )}

            {/* Order Form */}
            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  যে নম্বর থেকে টাকা পাঠিয়েছেন (Sender Mobile Number) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    placeholder="যেমন: 017XXXXXXXX"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Transaction ID (TrxID) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="যেমন: BLA8934JKA"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs font-mono uppercase focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>অর্ডার করার কিছুক্ষণের মধ্যেই ট্রানজেকশন যাচাই করে আপনার ড্যাশবোর্ড একটিভ করে দেওয়া হবে।</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>অর্ডার সাবমিট হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-5 h-5 text-amber-300" />
                    <span>🔥 এখনই ৳ {selectedPackage?.price} দিয়ে অর্ডার সম্পন্ন করুন</span>
                    <ArrowRight className="w-5 h-5 text-white" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Floating Social Proof Ticker */}
      <div className="fixed bottom-4 left-4 z-40 max-w-sm hidden sm:block animate-fade-in">
        <div className="p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-purple-200 text-xs text-slate-800 shadow-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{currentTicker.name}</p>
            <p className="text-[10px] text-slate-500">
              <span className="text-purple-600 font-semibold">{currentTicker.time}</span> • {currentTicker.pkg} অর্ডার করেছেন
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-purple-700">চেকআউট পেজ লোড হচ্ছে...</span>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
