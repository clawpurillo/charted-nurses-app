"use client";

export type StatusBadgeStatus = "available" | "busy" | "idle" | "unknown";

interface StatusBadgeProps {
  status: StatusBadgeStatus;
  label?: string;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<StatusBadgeStatus, { label: string; color: string; border: string; dot: string }> = {
  available: {
    label: "Available",
    color: "text-green-700 dark:text-green-400",
    border: "border-l-green-500",
    dot: "bg-green-400",
  },
  busy: {
    label: "Busy",
    color: "text-red-700 dark:text-red-400",
    border: "border-l-red-500",
    dot: "bg-red-400",
  },
  idle: {
    label: "Idle",
    color: "text-amber-700 dark:text-amber-400",
    border: "border-l-amber-500",
    dot: "bg-amber-400",
  },
  unknown: {
    label: "Unknown",
    color: "text-slate-600 dark:text-slate-400",
    border: "border-l-slate-400",
    dot: "bg-slate-300 dark:bg-slate-500",
  },
};

const SIZE_CLASSES = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-[11px] px-2 py-1",
};

export default function StatusBadge({ status, label, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const displayLabel = label ?? config.label;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50 border-l-2 ${config.border} ${config.color} ${SIZE_CLASSES[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {displayLabel}
    </span>
  );
}
