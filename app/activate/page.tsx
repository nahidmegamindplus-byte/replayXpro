'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Key,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Building,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lock,
  Flame,
} from 'lucide-react';
import { useToast, ToastProvider } from '@/components/ui/Toast';
import Logo from '@/components/common/Logo';

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const keyFromUrl = searchParams.get('key') || searchParams.get('license') || '';

  const [licenseKey, setLicenseKey] = useState(keyFromUrl);
  const [businessName, setBusinessName] = useState('');
  const [facebookPageUrl, setFacebookPageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    if (keyFromUrl) {
      setLicenseKey(keyFromUrl.toUpperCase().trim());
    }
  }, [keyFromUrl]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setErrorMsg('অনুগ্রহ করে আপনার লাইসেন্স কি (License Key) প্রদান করুন।');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: licenseKey.trim().toUpperCase(),
          businessName: businessName.trim() || undefined,
          facebookPageUrl: facebookPageUrl.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'লাইসেন্স কি সক্রিয় করতে সমস্যা হয়েছে। সঠিক কি প্রদান করুন।');
        setLoading(false);
        return;
      }

      setSuccessData(data);
      toast.success(data.message || 'লাইসেন্স সফলভাবে সক্রিয় হয়েছে!');

      // Redirect to dashboard after 1.2s
      setTimeout(() => {
        router.push(data.redirectUrl || '/dashboard');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setErrorMsg('সার্ভারের সাথে যোগাযোগ করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden py-12">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="inline-flex items-center mb-3">
            <Logo size="lg" />
          </Link>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            লাইসেন্স কি অ্যাক্টিভেশন
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            রেজিস্ট্রেশন বা পাসওয়ার্ডের দরকার নেই! ১ ক্লিকে ড্যাশবোর্ডে প্রবেশ করুন
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          {/* Badge */}
          <div className="mb-6 p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-900 block">ইনস্ট্যান্ট অ্যাক্সেস সিস্টেম</span>
              <span className="text-[11px] text-slate-600">অ্যাডমিনের দেওয়া লাইসেন্স কোড দিয়ে সরাসরি লগইন করুন</span>
            </div>
          </div>

          {/* Success Notification Box */}
          {successData && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>সক্রিয়করণ সফল হয়েছে!</span>
              </div>
              <p className="text-emerald-700">
                আপনার অ্যাকাউন্ট সক্রিয় করা হয়েছে। আপনাকে সরাসরি ড্যাশবোর্ডে রিডাইরেক্ট করা হচ্ছে...
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleActivate} className="space-y-4">
            {/* License Key Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>লাইসেন্স কি (License Key) *</span>
                <span className="text-[10px] text-indigo-600 font-medium">যেমন: RPLX-BIZ-XXXX</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="RPLX-XXXX-XXXX-XXXX"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm font-mono uppercase font-bold focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all tracking-wider"
                />
              </div>
            </div>

            {/* Business Name (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                ব্যবসা / পেজের নাম (ঐচ্ছিক)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="যেমন: Tanvir Fashion / TechBD"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                />
              </div>
            </div>

            {/* Facebook Page URL (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                ফেসবুক পেজ লিংক (ঐচ্ছিক)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={facebookPageUrl}
                  onChange={(e) => setFacebookPageUrl(e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>লাইসেন্স কি সক্রিয় করার সাথে সাথেই আপনার AI ড্যাশবোর্ড চালু হবে।</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || Boolean(successData)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>লাইসেন্স যাচাই হচ্ছে...</span>
                </>
              ) : successData ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>সক্রিয় হয়েছে! ড্যাশবোর্ডে প্রবেশ করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5 text-amber-300" />
                  <span>⚡ ড্যাশবোর্ডে প্রবেশ করুন</span>
                  <ArrowRight className="w-5 h-5 text-white" />
                </>
              )}
            </button>
          </form>

          {/* Footer Alternatives */}
          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
            <Link href="/login" className="text-blue-600 font-semibold hover:underline">
              ইমেইল পাসওয়ার্ড দিয়ে লগইন করুন
            </Link>
            <Link href="/pricing" className="text-slate-500 hover:text-slate-800 transition-colors">
              প্যাকেজ মূল্য দেখুন
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <ToastProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-900">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }
      >
        <ActivateContent />
      </Suspense>
    </ToastProvider>
  );
}
