'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowLeft, Send, CheckCircle2, Lock, KeyRound, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Logo from '@/components/common/Logo';

function ForgotPasswordContent() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Request Reset States
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [loading, setLoading] = useState(false);

  // Set New Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // 1. Handle Request Reset Link
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'রিসেট রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।');
        setLoading(false);
        return;
      }

      setSubmitted(true);
      if (data.resetUrl) {
        setResetLink(data.resetUrl);
      }
      toast.success('পাসওয়ার্ড রিসেট লিংক তৈরি হয়েছে!');
    } catch (err: any) {
      toast.error('সার্ভারের সাথে যোগাযোগ করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Set New Password (When token is in URL)
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('দুটো পাসওয়ার্ড মিলছে না।');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।');
        setResettingPassword(false);
        return;
      }

      setPasswordResetSuccess(true);
      toast.success(data.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      toast.error('সার্ভারে সমস্যা হয়েছে।');
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="inline-flex items-center mb-3">
            <Logo size="lg" />
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {token ? 'নতুন পাসওয়ার্ড সেট করুন' : 'পাসওয়ার্ড রিসেট'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {token
              ? 'আপনার নতুন পাসওয়ার্ডটি প্রদান করে কনফার্ম করুন'
              : 'আপনার রেজিস্টার্ড ইমেইল অ্যাড্রেসটি প্রদান করুন'}
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50">
          {token ? (
            passwordResetSuccess ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">পাসওয়ার্ড পরিবর্তিত হয়েছে!</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  লগইন পেজে রিডাইরেক্ট করা হচ্ছে...
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
                >
                  এখনই লগইন করুন
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    পাসওয়ার্ড নিশ্চিত করুন
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{resettingPassword ? 'পরিবর্তন করা হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}</span>
                </button>
              </form>
            )
          ) : submitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">রিসেট লিংক তৈরি হয়েছে</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                আপনার অ্যাকাউন্টের জন্য পাসওয়ার্ড রিসেট লিংক তৈরি করা হয়েছে।
              </p>

              {resetLink && (
                <div className="mb-6 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-left">
                  <p className="text-xs font-semibold text-blue-900 mb-1">সরাসরি রিসেট লিংক:</p>
                  <a
                    href={resetLink}
                    className="text-xs font-mono text-blue-600 hover:underline break-all flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    পাসওয়ার্ড রিসেট পেজে যেতে এখানে ক্লিক করুন
                  </a>
                </div>
              )}

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> লগইন পেজে ফিরে যান
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  ইমেইল অ্যাড্রেস
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="আপনার অ্যাকাউন্টের ইমেইল দিন"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>প্রসেস করা হচ্ছে...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>রিসেট লিংক তৈরি করুন</span>
                  </>
                )}
              </button>

              <div className="pt-4 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> লগইন পেজে ফিরে যান
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">লোড হচ্ছে...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
