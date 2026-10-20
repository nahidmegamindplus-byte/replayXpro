'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  Layers,
  Settings,
  LogOut,
  Sparkles,
  ArrowLeft,
  X,
  Database,
  Cpu,
  Package as PackageIcon,
  CreditCard,
  FileCheck2,
  Key,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Logo from '@/components/common/Logo';

interface AdminSidebarProps {
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function AdminSidebar({
  user,
  isOpenMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('সফলভাবে লগআউট হয়েছে!');
      router.push('/login');
      router.refresh();
    } catch (e) {
      toast.error('লগআউট করতে ব্যর্থ হয়েছে।');
    }
  };

  const navItems = [
    { href: '/admin', label: 'অ্যাডমিন ড্যাশবোর্ড', icon: ShieldAlert },
    { href: '/admin/licenses', label: '🔑 লাইসেন্স কি জেনারেটর', icon: Key },
    { href: '/admin/package-orders', label: 'প্যাকেজ অর্ডার ভেরিফিকেশন', icon: FileCheck2 },
    { href: '/admin/packages', label: 'প্যাকেজসমূহ (Packages)', icon: PackageIcon },
    { href: '/admin/payment-methods', label: 'পেমেন্ট মেথডস (bKash/Nagad)', icon: CreditCard },
    { href: '/admin/ai-settings', label: 'AI ও API কী সেটিংস', icon: Cpu },
    { href: '/admin/follow-up', label: 'গ্লোবাল AI ফলো-আপ কন্ট্রোল', icon: Clock },
    { href: '/admin/subscriptions', label: 'সাবস্ক্রিপশন ও কোটা ট্র্যাকিং', icon: Sparkles },
    { href: '/admin/users', label: 'ব্যবহারকারী পরিচালনা ও আইপি', icon: Users },
    { href: '/admin/pages', label: 'গ্লোবাল পেজ সমূহ', icon: Layers },
    { href: '/admin/settings', label: 'সিস্টেম সেটিংস', icon: Database },
  ];

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 h-full bg-white border-r border-slate-200/80 shadow-xs flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-20 w-64' : 'w-64'}`}
      >
        <div>
          {/* Header */}
          <div
            className={`flex items-center border-b border-slate-100 transition-all duration-300 ${
              isCollapsed ? 'px-3 py-3.5 justify-center' : 'px-4 py-3.5 justify-between'
            }`}
          >
            <Link href="/admin" className="flex items-center gap-2 overflow-hidden" title="ReplyX AI Admin">
              {isCollapsed ? (
                <Logo size="sm" variant="icon" />
              ) : (
                <div className="flex items-center gap-2">
                  <Logo size="sm" />
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 font-extrabold text-[10px] tracking-wider uppercase border border-purple-200">
                    ADMIN
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Minimize Toggle */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-purple-700 hover:bg-purple-50 border border-transparent hover:border-purple-200 transition-colors cursor-pointer"
                title={isCollapsed ? 'মেনু বড় করুন' : 'মেনু মিনিমাইজ করুন'}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-purple-600" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Nav Items */}
          <nav className={`space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-thin transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>
            {!isCollapsed && (
              <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-purple-700 uppercase">
                অ্যাডমিন প্রশাসন
              </div>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => onCloseMobile && onCloseMobile()}
                    className={`flex items-center rounded-xl transition-all ${
                      isCollapsed
                        ? 'justify-center p-3 w-full'
                        : 'gap-3 px-3.5 py-2.5 text-xs font-semibold'
                    } ${
                      isActive
                        ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-purple-600' : 'text-slate-400 group-hover:text-purple-600'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>

                  {/* Floating Tooltip in Collapsed Mode */}
                  {isCollapsed && (
                    <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 border border-slate-700/50">
                      {item.label}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                    </div>
                  )}
                </div>
              );
            })}

            <div className={`border-t border-slate-100 ${isCollapsed ? 'pt-2 mt-2' : 'pt-4 mt-4'}`}>
              <div className="relative group">
                <Link
                  href="/dashboard"
                  onClick={() => onCloseMobile && onCloseMobile()}
                  className={`flex items-center rounded-xl text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200/80 transition-all ${
                    isCollapsed ? 'justify-center p-3 w-full' : 'gap-2.5 px-3.5 py-2.5'
                  }`}
                  title="ইউজার ড্যাশবোর্ডে ফিরুন"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>ইউজার ড্যাশবোর্ডে ফিরুন</span>}
                </Link>
                {isCollapsed && (
                  <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 border border-slate-700/50">
                    ইউজার ড্যাশবোর্ডে ফিরুন
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>

        {/* Footer */}
        <div className={`border-t border-slate-100 bg-slate-50/70 shrink-0 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs cursor-default"
                title={`${user?.fullName || 'Super Admin'} (ADMIN)`}
              >
                A
              </div>
              <button
                onClick={handleLogout}
                title="লগআউট করুন"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                  A
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {user?.fullName || 'Super Admin'}
                  </p>
                  <p className="text-[11px] text-purple-600 font-mono font-medium">ROLE: ADMIN</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="লগআউট করুন"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
