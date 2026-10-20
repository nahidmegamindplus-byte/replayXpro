'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { ToastProvider } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

// In-memory module cache for instant sub-page navigation without blocking loading spinner
let cachedDashboardUser: any = null;
let cachedIsImpersonated: boolean = false;

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(cachedDashboardUser);
  const [isImpersonated, setIsImpersonated] = useState<boolean>(cachedIsImpersonated);
  const [loading, setLoading] = useState(!cachedDashboardUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [exitingImpersonation, setExitingImpersonation] = useState(false);

  // Restore sidebar minimize preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('replyx_sidebar_collapsed');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    } catch (_) {}
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('replyx_sidebar_collapsed', next ? 'true' : 'false');
      } catch (_) {}
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const data = await apiFetch<any>('/api/auth/me', { retries: 2, retryDelayMs: 400, timeoutMs: 8000 });
        if (!isMounted) return;

        if (data && data.success && data.user) {
          cachedDashboardUser = data.user;
          cachedIsImpersonated = Boolean(data.isImpersonated);
          setIsImpersonated(cachedIsImpersonated);

          // Gating: If normal user does not have an active package and not impersonated, redirect to /subscribe
          if (!data.isImpersonated && data.user.role !== 'ADMIN' && data.user.planStatus !== 'ACTIVE') {
            router.push('/subscribe');
            return;
          }
          setUser(data.user);
        } else {
          cachedDashboardUser = null;
          cachedIsImpersonated = false;
          router.push('/login');
        }
      } catch (err) {
        if (!cachedDashboardUser) {
          router.push('/login');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleExitImpersonation = async () => {
    try {
      setExitingImpersonation(true);
      const res = await fetch('/api/admin/impersonate/exit', { method: 'POST' });
      const data = await res.json();
      cachedDashboardUser = null;
      cachedIsImpersonated = false;
      if (data?.redirect) {
        window.location.href = data.redirect;
      } else {
        window.location.href = '/admin/users';
      }
    } catch (e) {
      window.location.href = '/admin/users';
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">ReplyX AI লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
        <Sidebar
          user={user}
          isOpenMobile={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        <div className={`flex-1 flex flex-col min-h-screen w-full min-w-0 max-w-full overflow-x-hidden transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
          {/* Sticky Admin Impersonation Top Banner */}
          {isImpersonated && (
            <div className="bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 text-white px-4 sm:px-6 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 z-40 sticky top-0 border-b border-purple-500/40">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold flex-1 min-w-0">
                <span className="p-1.5 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldAlert className="w-4 h-4" />
                </span>
                <div className="truncate">
                  <span className="font-extrabold text-amber-300 mr-1.5">[অ্যাডমিন মোড অ্যাক্টিভ]</span>
                  <span className="text-white/90">
                    আপনি বর্তমানে <strong className="underline decoration-amber-400 font-bold text-white">{user?.fullName || 'ইউজার'}</strong> (<code className="font-mono text-[11px] sm:text-xs text-purple-200 bg-purple-950/40 px-1.5 py-0.5 rounded">{user?.email}</code>)-এর একাউন্টে পূর্ণ অ্যাক্সেসে আছেন।
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExitImpersonation}
                disabled={exitingImpersonation}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ml-auto shrink-0"
                title="অ্যাডমিন প্যানেলে ফিরে যান"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{exitingImpersonation ? 'ফিরে যাওয়া হচ্ছে...' : 'অ্যাডমিন প্যানেলে ফিরে যান'}</span>
              </button>
            </div>
          )}

          <Header
            title={title}
            subtitle={subtitle}
            onOpenMobile={() => setMobileOpen(true)}
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />

          <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
