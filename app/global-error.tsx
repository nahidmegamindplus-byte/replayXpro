'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch {}
      window.location.reload();
    }
  };

  return (
    <html lang="bn">
      <body className="bg-[#f8fafc] text-slate-900 min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">অ্যাপ্লিকেশনে সাময়িক ত্রুটি ঘটেছে</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              সিস্টেম ট্রানজিশন বা মেমোরি ক্যাশের কারণে এই সমস্যাটি হতে পারে। পৃষ্ঠাটি রিফ্রেশ করুন।
            </p>
          </div>

          {error?.message && (
            <div className="p-3 rounded-xl bg-slate-100 text-rose-600 text-[11px] font-mono break-words border border-slate-200 text-left">
              {error.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={() => reset()}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              পুনরায় চেষ্টা করুন
            </button>

            <button
              onClick={handleReload}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
            >
              পেজ রিলোড করুন
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
