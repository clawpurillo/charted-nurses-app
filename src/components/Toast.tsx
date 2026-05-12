"use client";

import { useEffect, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss?: () => void;
  autoDismiss?: number; // milliseconds, default 3000
}

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; text: string; icon: string; role: "status" | "alert" }> = {
  success: {
    bg: "bg-green-50 dark:bg-green-900/30",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-800 dark:text-green-200",
    icon: "text-green-500 dark:text-green-400",
    role: "status",
  },
  error: {
    bg: "bg-red-50 dark:bg-red-900/30",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-200",
    icon: "text-red-500 dark:text-red-400",
    role: "alert",
  },
  info: {
    bg: "bg-brand/5 dark:bg-brand/10",
    border: "border-brand/20 dark:border-brand/30",
    text: "text-brand dark:text-brand/90",
    icon: "text-brand",
    role: "status",
  },
};

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function Toast({ message, type, onDismiss, autoDismiss = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true);
  const style = TOAST_STYLES[type];

  const dismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (autoDismiss <= 0) return;
    const timer = setTimeout(dismiss, autoDismiss);
    return () => clearTimeout(timer);
  }, [autoDismiss, dismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-200"
      role={style.role}
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${style.bg} ${style.border} max-w-sm`}>
        <span className={`shrink-0 ${style.icon}`} aria-hidden="true">
          {TOAST_ICONS[type]}
        </span>
        <p className={`text-sm font-medium flex-1 ${style.text}`}>{message}</p>
        <button
          onClick={dismiss}
          className={`shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition ${style.icon} min-w-[32px] min-h-[32px] flex items-center justify-center`}
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
