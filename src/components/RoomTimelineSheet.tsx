"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import DateScrubber from "./DateScrubber";
import {
  getRecentShifts,
  getShiftForDate,
  getEntryStatus,
  getStatusClasses,
} from "../utils/shiftGrouping";
import type { ShiftType } from "../utils/shiftGrouping";

interface RoomTimelineSheetProps {
  room: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleteEntry: (id: string) => Promise<void>;
}

export default function RoomTimelineSheet({
  room,
  isOpen,
  onClose,
  onDeleteEntry,
}: RoomTimelineSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Current shift selection
  const [activeShift, setActiveShift] = useState<{
    shiftDate: string;
    shiftType: ShiftType;
  } | null>(null);

  // Initialize activeShift to current shift when sheet opens
  useEffect(() => {
    if (isOpen && !activeShift) {
      const current = getShiftForDate(new Date());
      setActiveShift(current);
    }
    if (!isOpen) {
      setActiveShift(null);
    }
  }, [isOpen]);

  // Generate recent shifts for the scrubber
  const shifts = getRecentShifts(new Date(), 14);

  // Fetch entries for the selected shift via Convex
  const timelineEntries = useQuery(
    api.entries.getTimelineEntries,
    activeShift
      ? { room, shiftDate: activeShift.shiftDate, shiftType: activeShift.shiftType }
      : "skip"
  );

  // Sort entries oldest first for timeline display
  const roomEntries = (timelineEntries || [])
    .sort((a, b) => a.timestamp - b.timestamp);

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
        return `${typeLabel} · ${dateStr}`;
      })()
    : "";

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Touch drag to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const isHandle = target.closest("[data-drag-handle]");
    if (!isHandle) return;

    isDraggingRef.current = true;
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 100 && sheetRef.current) {
      handleClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "translateY(0)";
    }
  }, [handleClose]);

  const handleShiftChange = useCallback(
    (shift: { shiftDate: string; shiftType: ShiftType }) => {
      setActiveShift(shift);
    },
    []
  );

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Room ${room} timeline`}
    >
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl transition-transform duration-200 ease-out will-change-transform flex flex-col"
        style={{ maxHeight: "85vh" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div
          data-drag-handle
          className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing shrink-0"
        >
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Room {room}
              </h2>
              {shiftDisplayLabel && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {shiftDisplayLabel} · {roomEntries.length} {roomEntries.length === 1 ? "entry" : "entries"}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Close timeline"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* DateScrubber */}
        <DateScrubber
          shifts={shifts}
          activeShift={activeShift}
          onShiftChange={handleShiftChange}
        />

        {/* Timeline content */}
        <div className="overflow-y-auto px-5 py-4 flex-1" style={{ minHeight: 0 }}>
          {roomEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm text-center">
                No entries for this shift{activeShift ? ` · ${shiftDisplayLabel}` : ""}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-4 bottom-4 w-px bg-slate-200" />

              <div className="space-y-4 relative">
                {roomEntries.map((entry) => {
                  const status = getEntryStatus(entry);
                  const classes = getStatusClasses(status);
                  return (
                    <div key={entry._id} className="relative flex gap-3 group">
                      {/* Timeline dot */}
                      <div className="relative z-10 w-6 flex justify-center shrink-0 pt-2">
                        <div className={`w-2 h-2 rounded-full ring-4 ring-white ${classes.dot}`} />
                      </div>

                      {/* Entry Card */}
                      <div className={`flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 shadow-sm relative group-hover:border-slate-200 transition-colors border-l-4 ${classes.border}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-brand/10 text-brand rounded-md text-xs font-bold">
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
                          onClick={async () => {
                            if (window.confirm("Delete this entry?")) {
                              await onDeleteEntry(entry._id);
                            }
                          }}
                          className="absolute right-2 bottom-2 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                          aria-label="Delete entry"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
