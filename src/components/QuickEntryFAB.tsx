"use client";

interface QuickEntryFABProps {
  onClick: () => void;
  /** When true, the FAB is visually raised above the bottom nav area. */
  hasBottomNav?: boolean;
  ariaLabel?: string;
}

export default function QuickEntryFAB({
  onClick,
  hasBottomNav = false,
  ariaLabel = "Quick voice entry",
}: QuickEntryFABProps) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed right-5 z-40
        w-14 h-14 rounded-2xl
        bg-slate-900 text-white
        flex items-center justify-center
        shadow-lg shadow-slate-900/30
        transition-transform duration-100
        active:scale-90
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2
        ${hasBottomNav ? "bottom-20" : "bottom-6"}
      `}
      aria-label={ariaLabel}
    >
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  );
}
