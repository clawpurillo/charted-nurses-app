"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface CarryForwardDraft {
  room: string;
  latestEntry: {
    _id: Id<"entries">;
    description: string;
    timestamp: number;
    entryType: "text" | "voice";
    fdarCategory?: "focus" | "data" | "action" | "response";
  };
  previousEntry: {
    _id: Id<"entries">;
    description: string;
    timestamp: number;
  } | null;
  diff: {
    added: string;
    removed: string;
    unchanged: string;
  };
}

interface CarryForwardPromptProps {
  rooms: string[];
  onCarryForward: (entries: Array<{ room: string; description: string }>) => void;
  onSkip: () => void;
}

/**
 * Renders a diff line with appropriate color coding.
 * Added lines: green, Removed lines: red/strikethrough, Unchanged: normal.
 * Changed fields (added or removed) are highlighted with yellow background.
 */
function DiffLine({
  text,
  type,
}: {
  text: string;
  type: "added" | "removed" | "unchanged";
}) {
  if (!text) return null;

  const lines = text.split("\n").filter(Boolean);
  if (lines.length === 0) return null;

  if (type === "added") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
        <span className="text-xs font-semibold text-green-700 mr-2">+ Added</span>
        {lines.map((line, i) => (
          <p key={i} className="text-sm text-green-800 mt-1 leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    );
  }

  if (type === "removed") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
        <span className="text-xs font-semibold text-red-700 mr-2">- Removed</span>
        {lines.map((line, i) => (
          <p key={i} className="text-sm text-red-800 mt-1 leading-relaxed line-through opacity-70">
            {line}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
      <span className="text-xs font-semibold text-slate-500 mr-2">Unchanged</span>
      {lines.map((line, i) => (
        <p key={i} className="text-sm text-slate-700 mt-1 leading-relaxed">
          {line}
        </p>
      ))}
    </div>
  );
}

/**
 * Single room card showing previous entry and diff.
 */
function RoomDraftCard({
  draft,
  selected,
  onToggle,
}: {
  draft: CarryForwardDraft;
  selected: boolean;
  onToggle: () => void;
}) {
  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins}m ago`;
  };

  return (
    <div
      className={`rounded-2xl border-2 transition-all duration-150 ${
        selected
          ? "border-slate-900 bg-white shadow-md"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      {/* Header: room + checkbox */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
              selected
                ? "bg-slate-900 border-slate-900 text-white"
                : "border-slate-300 bg-white"
            }`}
            aria-label={`Select room ${draft.room} for carry-forward`}
            aria-checked={selected}
            role="checkbox"
          >
            {selected && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <span className="text-base font-bold text-slate-900">
            Room {draft.room}
          </span>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {timeAgo(draft.latestEntry.timestamp)}
        </span>
      </div>

      {/* Entry content + diff */}
      {selected && (
        <div className="px-4 pb-4 space-y-3">
          {/* Entry type badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                draft.latestEntry.entryType === "voice"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {draft.latestEntry.entryType === "voice" ? "Voice" : "Text"}
            </span>
            {draft.latestEntry.fdarCategory && (
              <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                {draft.latestEntry.fdarCategory.toUpperCase()}
              </span>
            )}
          </div>

          {/* Previous entry text */}
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Previous entry
            </p>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {draft.latestEntry.description}
            </p>
          </div>

          {/* Diff section (only when there is a previous entry to compare) */}
          {draft.previousEntry && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                Changes since last time
              </p>
              <div className="space-y-2">
                {draft.diff.unchanged && (
                  <DiffLine text={draft.diff.unchanged} type="unchanged" />
                )}
                {draft.diff.added && (
                  <DiffLine text={draft.diff.added} type="added" />
                )}
                {draft.diff.removed && (
                  <DiffLine text={draft.diff.removed} type="removed" />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CarryForwardPrompt({
  rooms,
  onCarryForward,
  onSkip,
}: CarryForwardPromptProps) {
  const drafts = useQuery(api.entries.getCarryForwardDrafts, { rooms });
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Pre-select all rooms when drafts load
  useEffect(() => {
    if (drafts && drafts.length > 0 && selectedRooms.size === 0) {
      setSelectedRooms(new Set(drafts.map((d) => d.room)));
    }
  }, [drafts]);

  const toggleRoom = useCallback((room: string) => {
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(room)) {
        next.delete(room);
      } else {
        next.add(room);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!drafts) return;
    setSelectedRooms(new Set(drafts.map((d) => d.room)));
  }, [drafts]);

  const deselectAll = useCallback(() => {
    setSelectedRooms(new Set());
  }, []);

  const handleAccept = async () => {
    if (selectedRooms.size === 0 || !drafts) return;
    setLoading(true);
    try {
      const entries = drafts
        .filter((d) => selectedRooms.has(d.room))
        .map((d) => ({
          room: d.room,
          description: d.latestEntry.description,
        }));
      await onCarryForward(entries);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onSkip();
  };

  if (dismissed) return null;

  // Loading state
  if (drafts === undefined) {
    return null;
  }

  // No drafts available
  if (!drafts || drafts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Carry forward previous shift entries"
    >
      <div className="absolute inset-x-0 bottom-0 max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Drag handle */}
        <div className="flex items-center justify-center py-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Carry Forward
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {drafts.length} previous {drafts.length === 1 ? "entry" : "entries"} found
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Dismiss carry-forward prompt"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {drafts.map((draft) => (
            <RoomDraftCard
              key={draft.room}
              draft={draft}
              selected={selectedRooms.has(draft.room)}
              onToggle={() => toggleRoom(draft.room)}
            />
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0 space-y-3 pb-safe">
          {/* Select / Deselect all */}
          <div className="flex items-center justify-between">
            <button
              onClick={selectAll}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Select all
            </button>
            <button
              onClick={deselectAll}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Deselect all
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition min-h-[48px]"
            >
              Skip for now
            </button>
            <button
              onClick={handleAccept}
              disabled={selectedRooms.size === 0 || loading}
              className="flex-1 py-3.5 bg-slate-900 text-white font-semibold text-sm rounded-xl hover:bg-slate-800 disabled:opacity-50 transition min-h-[48px]"
            >
              {loading ? "Carrying forward..." : `Carry ${selectedRooms.size} forward`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
