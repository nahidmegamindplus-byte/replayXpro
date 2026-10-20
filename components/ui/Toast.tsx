'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const recentMessagesRef = React.useRef<Map<string, number>>(new Map());

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      if (!message || typeof message !== 'string') return;
      
      const trimmed = message.trim();
      if (!trimmed) return;

      const now = Date.now();
      const lastShown = recentMessagesRef.current.get(trimmed) || 0;
      // Deduplicate identical toast messages shown within 2.5 seconds
      if (now - lastShown < 2500) {
        return;
      }
      recentMessagesRef.current.set(trimmed, now);

      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => {
        // Keep at most 3 active toasts at a time
        const next = [...prev, { id, type, message: trimmed }];
        if (next.length > 3) {
          return next.slice(next.length - 3);
        }
        return next;
      });

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div
        translate="no"
        suppressHydrationWarning
        className="notranslate fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${
              t.type === 'success'
                ? 'bg-[#062c1e]/90 border-emerald-500/40 text-emerald-100'
                : t.type === 'error'
                ? 'bg-[#3b1219]/90 border-red-500/40 text-red-100'
                : t.type === 'warning'
                ? 'bg-[#38260c]/90 border-amber-500/40 text-amber-100'
                : 'bg-[#121b2b]/90 border-cyan-500/40 text-cyan-100'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-cyan-400" />}
            </div>
            <div className="flex-1 text-sm font-medium leading-relaxed">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-white transition-colors shrink-0 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    const fallback = (msg: string) => console.log('[Toast Log]:', msg);
    return {
      showToast: fallback,
      success: fallback,
      error: fallback,
      info: fallback,
      warning: fallback,
    };
  }
  return ctx;
}
