'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  RotateCcw,
  LogIn,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  WifiOff,
} from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isOffline, setIsOffline] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.error('Client-side exception caught by error boundary:', error);



    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);

      // Auto-retry when connection restores
      const handleOnlineRetry = () => {
        setIsOffline(false);
        reset();
      };
      window.addEventListener('online', handleOnlineRetry);

      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
        window.removeEventListener('online', handleOnlineRetry);
      };
    }
  }, [error, reset]);

  const handleHardReload = useCallback(() => {
    setIsRetrying(true);
    try {
      // Clear transient session storage to resolve corrupted local states
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  }, []);

  const handleReset = useCallback(() => {
    setIsRetrying(true);
    reset();
    setTimeout(() => setIsRetrying(false), 800);
  }, [reset]);

  const handleCopyDetails = () => {
    const details = `ReplyX AI Error:\nMessage: ${error?.message || 'Unknown error'}\nDigest: ${error?.digest || 'N/A'}\nTime: ${new Date().toISOString()}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-indigo-500/20 selection:text-indigo-700">
      {/* Ambient background glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Offline notification badge */}
        {isOffline && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <WifiOff className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>আপনার ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে। সংযোগ ফিরলে স্বয়ংক্রিয় রিট্রাই হবে।</span>
          </div>
        )}

        {/* Icon Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto shadow-sm shadow-amber-500/10">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              পেজ লোড করতে সাময়িক সমস্যা হয়েছে
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">
              ব্রাউজার ক্যাশ, সেশন বা ট্রানজিশনের কারণে সমস্যা হতে পারে। নিচের অপশনগুলো ব্যবহার করে দ্রুত পেজ রিকভার করুন।
            </p>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="space-y-2.5 pt-2">
          {/* Primary Try Again */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleReset}
              disabled={isRetrying}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'চেষ্টা করা হচ্ছে...' : 'আবার চেষ্টা করুন'}</span>
            </button>

            <button
              onClick={handleHardReload}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border border-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <span>ক্যাশ ক্লিয়ার ও রিলোড</span>
            </button>
          </div>

          {/* Secondary Navigation */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <Link
              href="/"
              className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-600 font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200 shadow-2xs"
            >
              <Home className="w-4 h-4 text-slate-500" />
              <span>হোম পেজে ফিরুন</span>
            </Link>

            <Link
              href="/login"
              className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-600 font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200 shadow-2xs"
            >
              <LogIn className="w-4 h-4 text-slate-500" />
              <span>লগইন পেজে যান</span>
            </Link>
          </div>
        </div>

        {/* Collapsible Error Diagnostics */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-600 font-medium py-1 transition-colors"
          >
            <span>কারিগরি তথ্য ও কোড (Technical Details)</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDetails && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-slate-900 text-slate-200 text-left text-xs font-mono space-y-2 border border-slate-800">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px] text-slate-400">
                <span>ত্রুটির লগ:</span>
                <button
                  onClick={handleCopyDetails}
                  className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                </button>
              </div>

              <p className="text-rose-400 break-words font-semibold">
                {error?.message || 'An unexpected client exception was captured.'}
              </p>

              {error?.digest && (
                <p className="text-[11px] text-slate-400">
                  Digest ID: <span className="text-slate-300 select-all">{error.digest}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
