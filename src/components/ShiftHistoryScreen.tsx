"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback, useRef, useEffect } from "react";

// Types
interface PastShift {
  shiftDate: string;
  shiftType: "day" | "night";
  count: number;
  lastEntry: number;
}

interface ShiftEntry {
  _id: string;
  room: string;
  description: string;
  entryType: "text" | "voice";
  timestamp: number;
  fdarCategory?: string;
  status?: string;
}

/**
 * ShiftTimelineSheet - bottom sheet showing entries for a selected past shift.
 * Fetches entries via getTimelineEntries (supports shiftDate + shiftType filtering).
 */
function ShiftTimelineSheet({
  shiftDate,
  shiftType,
  onClose,
}: {
  shiftDate: string;
  shiftType: "day" | "night";
  onClose: () => void;
}) {
  const shiftEntries = useQuery(api.entries.getPastEntries, { shiftDate });

  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-drag-handle]")) return;
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

  // Filter to this specific shift type
  const allEntries: ShiftEntry[] = (shiftEntries || [])
    .filter((e) => e.shiftType === shiftType)
    .map((e) => ({
      _id: e._id,
      room: e.room,
      description: e.description,
      entryType: e.entryType,
      timestamp: e.timestamp,
      fdarCategory: e.fdarCategory,
      status: e.status,
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  // Group by room
  const byRoom = new Map<string, ShiftEntry[]>();
  for (const entry of allEntries) {
    const list = byRoom.get(entry.room) || [];
    list.push(entry);
    byRoom.set(entry.room, list);
  }
  const roomEntries = Array.from(byRoom.entries()).sort(
    (a, b) => a[0].localeCompare(b[0])
  );

  const dateDisplay = new Date(shiftDate + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "short", month: "short", day: "numeric" }
  );

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${dateDisplay} ${shiftType} shift timeline`}
    >
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl transition-transform duration-200 ease-out will-change-transform"
        style={{ maxHeight: "80vh" }}
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
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {dateDisplay}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {shiftType === "day" ? "\u2600\uFE0F" : "\uD83C\uDF19"}{" "}
                {shiftType === "day" ? "Day" : "Night"} Shift ·{" "}
                {allEntries.length}{" "}
                {allEntries.length === 1 ? "entry" : "entries"} ·{" "}
                {byRoom.size} {byRoom.size === 1 ? "room" : "rooms"}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Close timeline"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto px-5 py-4"
          style={{ maxHeight: "calc(80vh - 100px)" }}
        >
          {allEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm">No entries for this shift</p>
            </div>
          ) : (
            <div className="space-y-5">
              {roomEntries.map(([room, entries]) => (
                <div key={room}>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">
                    Room {room}
                  </h3>
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200" />
                    <div className="space-y-3 relative">
                      {entries.map((entry) => (
                        <div key={entry._id} className="relative flex gap-3">
                          <div className="relative z-10 w-6 flex justify-center shrink-0 pt-2">
                            <div
                              className={`w-2 h-2 rounded-full ring-4 ring-white ${
                                entry.entryType === "voice"
                                  ? "bg-blue-400"
                                  : "bg-slate-400"
                              }`}
                            />
                          </div>
                          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {entry.entryType === "voice" && (
                                  <span className="text-xs">
                                    🎙️
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                  {entry.entryType}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-slate-400">
                                {new Date(
                                  entry.timestamp
                                ).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {entry.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShiftHistoryScreen({
  onBack,
}: {
  onBack?: () => void;
}) {
  const pastShifts = useQuery(api.entries.getPastShifts);

  const [selectedShift, setSelectedShift] = useState<{
    shiftDate: string;
    shiftType: "day" | "night";
  } | null>(null);

  // Loading state
  if (pastShifts === undefined) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
        <header className="bg-white border-b border-slate-100 pt-safe-top shrink-0">
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-slate-100 rounded w-32 animate-pulse" />
              <div className="h-3 bg-slate-100 rounded w-48 animate-pulse" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const shifts = pastShifts as PastShift[];

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 pt-safe-top shrink-0">
        <div className="flex items-center gap-4 px-5 py-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition min-h-[48px] min-w-[48px]"
            aria-label="Back to dashboard"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none mb-0.5">
              Shift History
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {shifts.length} {shifts.length === 1 ? "shift" : "shifts"} recorded
            </p>
          </div>
        </div>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {shifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl mb-4">📅</p>
            <h2 className="text-lg font-bold text-slate-700 mb-1">
              No past shifts
            </h2>
            <p className="text-sm text-slate-400 max-w-xs">
              Your shift history will appear here once you complete your first
              shift.
            </p>
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="Past shifts">
            {shifts.map((shift) => {
              const key = `${shift.shiftDate}-${shift.shiftType}`;
              const dateDisplay = new Date(
                shift.shiftDate + "T12:00:00"
              ).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });

              return (
                <button
                  key={key}
                  onClick={() =>
                    setSelectedShift({
                      shiftDate: shift.shiftDate,
                      shiftType: shift.shiftType,
                    })
                  }
                  className="w-full bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-slate-200 hover:shadow-md transition-all text-left min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-inset active:scale-[0.98]"
                  role="listitem"
                  aria-label={`${dateDisplay} ${shift.shiftType} shift, ${shift.count} entries`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            shift.shiftType === "day"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {shift.shiftType === "day"
                            ? "\u2600\uFE0F Day"
                            : "\uD83C\uDF19 Night"}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {dateDisplay}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {shift.count}{" "}
                        {shift.count === 1 ? "entry" : "entries"}
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-slate-300 shrink-0 mt-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Timeline sheet */}
      {selectedShift && (
        <ShiftTimelineSheet
          shiftDate={selectedShift.shiftDate}
          shiftType={selectedShift.shiftType}
          onClose={() => setSelectedShift(null)}
        />
      )}
    </div>
  );
}
