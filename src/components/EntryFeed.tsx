"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  groupEntriesByShift,
  getRecentShifts,
  getShiftForDate,
  getEntryStatus,
  getStatusClasses,
} from "../utils/shiftGrouping";
import type { ShiftType, Entry as ShiftEntry } from "../utils/shiftGrouping";

interface EntryFeedProps {
  entries: ShiftEntry[];
  activeRoom: string | null;
  onDeleteEntry: (id: string) => Promise<void>;
}

export default function EntryFeed({
  entries,
  activeRoom,
  onDeleteEntry,
}: EntryFeedProps) {
  // Current shift selection for the scrubber
  const [activeShift, setActiveShift] = useState<{
    shiftDate: string;
    shiftType: ShiftType;
  } | null>(null);

  const scrubberRef = useRef<HTMLDivElement>(null);

  // Initialize activeShift to current shift on mount
  useEffect(() => {
    if (!activeShift) {
      const current = getShiftForDate(new Date());
      setActiveShift(current);
    }
  }, [activeShift]);

  // Auto-scroll scrubber to active shift
  useEffect(() => {
    if (!activeShift || !scrubberRef.current) return;
    const activeKey = `${activeShift.shiftDate}-${activeShift.shiftType}`;
    const activeButton = scrubberRef.current.querySelector(
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

  // Filter entries by active room if set
  const filteredEntries = activeRoom
    ? entries.filter((e) => e.room === activeRoom)
    : entries;

  // Ensure each entry has shiftDate/shiftType computed
  const entriesWithShifts = filteredEntries.map((e) => {
    if (e.shiftDate && e.shiftType) return e;
    const shift = getShiftForDate(new Date(e.timestamp));
    return { ...e, shiftDate: shift.shiftDate, shiftType: shift.shiftType };
  });

  // Group by shift
  const shiftGroups = groupEntriesByShift(entriesWithShifts);

  // Generate recent shifts for scrubber
  const shifts = getRecentShifts(new Date(), 14);

  // Filter shift groups to only show the selected shift
  const visibleGroups = activeShift
    ? shiftGroups.filter(
        (g) =>
          g.shiftDate === activeShift.shiftDate &&
          g.shiftType === activeShift.shiftType
      )
    : shiftGroups;

  const handleShiftChange = useCallback(
    (shift: { shiftDate: string; shiftType: ShiftType }) => {
      setActiveShift(shift);
    },
    []
  );

  // Build display label for the active shift
  const shiftDisplayLabel = activeShift
    ? (() => {
        const [year, month, day] = activeShift.shiftDate.split("-").map(Number);
        const d = new Date(year, month - 1, day);
        const dateStr = d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const typeLabel = activeShift.shiftType === "day" ? "Day" : "Night";
        return `${typeLabel} Shift \u2014 ${dateStr}`;
      })()
    : "";

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10">
        <p className="text-2xl mb-2">📋</p>
        <p className="text-sm">No entries yet</p>
        {activeRoom && (
          <p className="text-xs mt-1">for Room {activeRoom}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Horizontal scrubber */}
      <div className="shrink-0 bg-white border-b border-slate-100">
        <div
          ref={scrubberRef}
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
                onClick={() => handleShiftChange(shift)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[40px] ${
                  isActive
                    ? "bg-brand text-white shadow-sm"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span className="block leading-tight">
                  {shift.shiftType === "day" ? "\u2600" : "\u{1F319}"}{" "}
                  {shift.shiftType === "day" ? "D" : "N"}
                </span>
                <span className="block text-[10px] font-medium opacity-75 mt-0.5">
                  {shift.label.split("--")[1]?.trim()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active shift label */}
        {shiftDisplayLabel && (
          <div className="px-5 pb-2">
            <p className="text-xs text-slate-500 font-medium">
              {shiftDisplayLabel} \u00b7 {visibleGroups.reduce((sum, g) => sum + g.entries.length, 0)}{" "}
              {visibleGroups.reduce((sum, g) => sum + g.entries.length, 0) === 1 ? "entry" : "entries"}
            </p>
          </div>
        )}
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-32">
        {visibleGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-center">
              No entries for this shift{activeShift ? ` \u00b7 ${shiftDisplayLabel}` : ""}
            </p>
          </div>
        ) : (
          visibleGroups.map((group) => (
            <div key={`${group.shiftDate}-${group.shiftType}`} className="mb-6 last:mb-0">
              {/* Shift group header */}
              <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-2 mb-3 -mx-5 px-5 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-700">
                  {group.header}
                </h3>
              </div>

              {/* Timeline line */}
              <div className="relative">
                <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gradient-to-b from-brand/30 via-brand/20 to-brand/5" />

                <div className="space-y-4 relative">
                  {group.entries
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((entry) => {
                      const status = getEntryStatus(entry);
                      const classes = getStatusClasses(status);
                      return (
                        <div key={entry._id} className="relative flex gap-3 group">
                          {/* Timeline dot */}
                          <div className="relative z-10 w-6 flex justify-center shrink-0 pt-2">
                            <div className={`w-2 h-2 rounded-full ring-4 ring-slate-50 ${classes.dot}`} />
                          </div>

                          {/* Entry Card */}
                          <div className={`flex-1 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm relative group-hover:border-slate-200 transition-colors border-l-4 ${classes.border}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-xs font-bold">
                                  {entry.room}
                                </span>
                                {entry.fdarCategory && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                    entry.fdarCategory === "focus" ? "bg-blue-50 text-blue-700" :
                                    entry.fdarCategory === "data" ? "bg-green-50 text-green-700" :
                                    entry.fdarCategory === "action" ? "bg-yellow-50 text-yellow-700" :
                                    "bg-purple-50 text-purple-700"
                                  }`}>
                                    {entry.fdarCategory}
                                  </span>
                                )}
                                {entry.entryType === "voice" && (
                                  <span className="text-xs text-blue-500">🎤</span>
                                )}
                              </div>
                              <span className="text-xs font-medium text-slate-400">
                                {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed pr-6">
                              {entry.description}
                            </p>

                            {/* Delete button */}
                            <button
                              onClick={() => {
                                if (window.confirm("Delete this entry?")) {
                                  onDeleteEntry(entry._id);
                                }
                              }}
                              className="absolute right-2 bottom-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 md:opacity-0"
                              aria-label="Delete entry"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
