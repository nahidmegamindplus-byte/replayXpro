'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Package,
  Bot,
  MessageSquare,
  ShoppingCart,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Logo from '@/components/common/Logo';

interface SidebarProps {
  user?: {
    id: string;
    fullName: string;
    businessName: string;
    email: string;
    role: string;
  } | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  user,
  isOpenMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
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
    { href: '/dashboard', label: 'ওভারভিউ', icon: LayoutDashboard },
    { href: '/dashboard/pages', label: 'সোশ্যাল চ্যানেল', icon: Layers },
    { href: '/dashboard/products', label: 'প্রোডাক্ট ইনভেন্টরি', icon: Package },
    { href: '/dashboard/ai-rules', label: 'AI নিয়মাবলী', icon: Bot },
    { href: '/dashboard/follow-up', label: 'AI ফলো-আপ অটোমেশন', icon: Clock },
    { href: '/dashboard/conversations', label: 'কথোপকথন', icon: MessageSquare },
    { href: '/dashboard/orders', label: 'অর্ডারসমূহ', icon: ShoppingCart },
    { href: '/dashboard/reports', label: 'রিপোর্ট ও অ্যানালিটিক্স', icon: BarChart3 },
    { href: '/dashboard/settings', label: 'ব্যবসার সেটিংস', icon: Settings },
    { href: '/dashboard/support', label: 'সাপোর্ট গাইড', icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
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
        {/* Brand Header */}
        <div
          className={`flex items-center border-b border-slate-100 shrink-0 bg-white transition-all duration-300 ${
            isCollapsed ? 'px-3 py-3.5 justify-center' : 'px-4 py-3.5 justify-between'
          }`}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2 overflow-hidden"
            title="ReplyX AI Dashboard"
          >
            {isCollapsed ? (
              <Logo size="sm" variant="icon" />
            ) : (
              <Logo size="sm" showSubtitle={true} subtitle="সোশ্যাল অটোমেশন প্ল্যাটফর্ম" />
            )}
          </Link>

          {/* Desktop Minimize Toggle Button */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer ${
                isCollapsed ? 'mt-2' : ''
              }`}
              title={isCollapsed ? 'মেনু বড় করুন (Expand Menu)' : 'মেনু মিনিমাইজ করুন (Collapse Menu)'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-indigo-600" />
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
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links with custom scrollbar & sleek hover tooltips */}
        <nav className={`flex-1 overflow-y-auto space-y-1 min-h-0 scrollbar-thin bg-white transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              মেনু
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));

            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  onClick={() => onCloseMobile && onCloseMobile()}
                  className={`flex items-center rounded-xl transition-all ${
                    isCollapsed
                      ? 'justify-center p-3 w-full'
                      : 'gap-3 px-3.5 py-2.5 text-sm font-medium'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50/80 text-blue-700 border border-blue-200/80 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'
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
        </nav>

        {/* User Profile & Minimize/Logout Footer */}
        <div className={`border-t border-slate-100 bg-slate-50/90 shrink-0 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs cursor-default"
                title={`${user?.fullName || 'User'} (${user?.email || ''})`}
              >
                {user?.fullName?.charAt(0) || 'U'}
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
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {user?.fullName || 'ব্যবহারকারী'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {user?.businessName || user?.email || 'Business'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="লগআউট করুন"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 ml-1 cursor-pointer"
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
