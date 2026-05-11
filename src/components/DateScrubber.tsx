"use client";

import { useEffect, useRef } from "react";
import { getRecentShifts } from "../utils/shiftGrouping";
import type { ShiftType } from "../utils/shiftGrouping";

interface DateScrubberProps {
  shifts: { shiftDate: string; shiftType: ShiftType; label: string }[];
  activeShift: { shiftDate: string; shiftType: ShiftType } | null;
  onShiftChange: (shift: { shiftDate: string; shiftType: ShiftType }) => void;
}

export default function DateScrubber({
  shifts,
  activeShift,
  onShiftChange,
}: DateScrubberProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active shift on mount and when activeShift changes
  useEffect(() => {
    if (!activeShift || !scrollRef.current) return;
    const activeKey = `${activeShift.shiftDate}-${activeShift.shiftType}`;
    const activeButton = scrollRef.current.querySelector(
      `[data-shift-key="${activeKey}"]`
    ) as HTMLElement;
    if (activeButton) {
      activeButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeShift]);
  return (
    <div className="shrink-0 bg-white dark:bg-card border-b border-slate-200/50">
      {/* Shift selector */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-5 py-3 scrollbar-hide"
        role="tablist"
        aria-label="Shift navigation"
      >
        {shifts.map((shift) => {
          const shiftKey = `${shift.shiftDate}-${shift.shiftType}`;
          const isActive =
            activeShift?.shiftDate === shift.shiftDate &&
            activeShift?.shiftType === shift.shiftType;
          return (
            <button
              key={shiftKey}
              data-shift-key={shiftKey}
              role="tab"
              aria-selected={isActive}
              onClick={() => onShiftChange(shift)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[48px] ${
                isActive
                  ? "bg-brand text-white shadow-sm shadow-brand/30 active:scale-90"
                  : "bg-surface text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600"
              }`}
            >
              <span className="block leading-tight">
                {shift.shiftType === "day" ? "\u2600" : "\u{1F319}"} {shift.shiftType === "day" ? "D" : "N"}
              </span>
              <span className="block text-[10px] font-medium opacity-75 mt-0.5">
                {shift.label.split("--")[1]?.trim()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time axis indicator */}
      <div className="px-5 pb-2">
        <div className="relative h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-brand rounded-full transition-all duration-300"
            style={{
              width: activeShift
                ? `${getProgressPercent(activeShift.shiftDate, activeShift.shiftType)}%`
                : "0%",
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-text-muted font-medium">
          <span>07:00</span>
          <span>11:00</span>
          <span>15:00</span>
          <span>19:00</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate progress percentage within a shift for the time axis.
 */
function getProgressPercent(shiftDate: string, shiftType: ShiftType): number {
  const now = new Date();
  const [year, month, day] = shiftDate.split("-").map(Number);
  const shiftStart = new Date(year, month - 1, day, shiftType === "day" ? 7 : 19, 0, 0);
  const shiftEnd = new Date(shiftStart.getTime() + 12 * 60 * 60 * 1000);

  if (now < shiftStart) return 0;
  if (now > shiftEnd) return 100;
  return ((now.getTime() - shiftStart.getTime()) / (shiftEnd.getTime() - shiftStart.getTime())) * 100;
}
