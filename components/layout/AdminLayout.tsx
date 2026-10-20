'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import Header from './Header';
import { ToastProvider } from '@/components/ui/Toast';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

// In-memory module cache for instant sub-page navigation in Admin panel
let cachedAdminUser: any = null;

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(cachedAdminUser);
  const [loading, setLoading] = useState(!cachedAdminUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Restore sidebar minimize preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('replyx_admin_sidebar_collapsed');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    } catch (_) {}
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('replyx_admin_sidebar_collapsed', next ? 'true' : 'false');
      } catch (_) {}
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAuth() {
      try {
        const data = await apiFetch<any>('/api/auth/me', { retries: 2, retryDelayMs: 400, timeoutMs: 8000 });
        if (!isMounted) return;

        if (data && data.success && data.user) {
          if (data.user.role !== 'ADMIN') {
            cachedAdminUser = null;
            setIsUnauthorized(true);
          } else {
            cachedAdminUser = data.user;
            setUser(data.user);
          }
        } else {
          cachedAdminUser = null;
          router.push('/login');
        }
      } catch (err) {
        if (!cachedAdminUser) {
          router.push('/login');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAdminAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading && !user && !isUnauthorized) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-purple-700 font-medium">অ্যাডমিন অধিকার যাচাই করা হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white border border-rose-200 rounded-3xl p-8 sm:p-12 text-center max-w-md w-full shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">অ্যাক্সেস ডিনাইড (Access Denied)</h3>
          <p className="text-xs text-rose-600 mb-6 leading-relaxed">
            এই পেজটি শুধুমাত্র সিস্টেম অ্যাডমিনিস্ট্রেটরদের জন্য সংরক্ষিত। আপনার অ্যাকাউন্টে অ্যাডমিন পারমিশন নেই।
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ইউজার ড্যাশবোর্ডে ফিরে যান</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        <AdminSidebar
          user={user}
          isOpenMobile={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        <div className={`flex-1 flex flex-col min-h-screen min-w-0 max-w-full transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
          <Header
            title={title}
            subtitle={subtitle}
            onOpenMobile={() => setMobileOpen(true)}
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
