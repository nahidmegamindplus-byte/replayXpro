import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 text-center max-w-md w-full shadow-xl space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center mx-auto shadow-xs">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">৪০৪ - পেজটি পাওয়া যায়নি</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          আপনি যে পেজটি খুঁজছেন তা হয়তো সরানো হয়েছে বা লিংকটি সঠিক নয়।
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all"
        >
          <Home className="w-4 h-4" />
          <span>মূল পাতায় ফিরে যান</span>
        </Link>
      </div>
    </div>
  );
}
