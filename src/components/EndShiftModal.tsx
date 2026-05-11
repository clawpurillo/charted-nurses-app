"use client";

import { useState } from "react";
import { useAuthToken } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface Entry {
  _id: string;
  room: string;
  description: string;
  entryType: "text" | "voice";
  timestamp: number;
  shiftDate: string;
  shiftType: "day" | "night";
}

interface RoomFdar {
  room: string;
  fdar: string;
}

interface EndShiftModalProps {
  entries: Entry[];
  shiftDate: string;
  shiftType: "day" | "night";
  onClose: () => void;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 min-h-[36px] ${
        copied
          ? "bg-accent-new/10 text-accent-new"
          : "bg-slate-100 dark:bg-slate-700 text-text-secondary hover:bg-slate-200 dark:hover:bg-slate-600"
      }`}
    >
      {copied ? "\u2713 Copied" : label ?? "Copy"}
    </button>
  );
}

export default function EndShiftModal({
  entries,
  shiftDate,
  shiftType,
  onClose,
}: EndShiftModalProps) {
  const token = useAuthToken();
  const endShift = useMutation(api.entries.endShift);
  const [phase, setPhase] = useState<"confirm" | "compiling" | "done" | "error">(
    "confirm"
  );
  const [fdarRooms, setFdarRooms] = useState<RoomFdar[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [endingShift, setEndingShift] = useState(false);

  const rooms = Array.from(new Set(entries.map((e) => e.room))).sort();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const compileNotes = async () => {
    setPhase("compiling");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const res = await fetch("/api/compile-fdar", {
        method: "POST",
        headers,
        body: JSON.stringify({ shiftDate, shiftType }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Compilation failed");
      }

      const data = await res.json();
      setFdarRooms(data.rooms);
      setPhase("done");
    } catch (err: unknown) {
      setErrorMsg((err as Error).message ?? "Something went wrong");
      setPhase("error");
    }
  };

  const handleDone = async () => {
    setEndingShift(true);
    try {
      await endShift();
    } catch (err: unknown) {
      // Log but don't block the user from closing the modal
      console.error("Failed to end shift:", err);
    } finally {
      setEndingShift(false);
      onClose();
    }
  };

  // Build all-rooms copy text
  const allRoomsText = fdarRooms
    .map(
      ({ room, fdar }) =>
        `\u2550\u2550\u2550 Room ${room} \u2550\u2550\u2550\n${fdar}`
    )
    .join("\n\n");

  const headerText = `${formatDate(shiftDate)} \u2014 ${shiftType === "day" ? "Day" : "Night"} Shift\n${entries.length} entries across ${rooms.length} room${rooms.length !== 1 ? "s" : ""}\n\n`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe-top py-4 border-b border-slate-200/50">
        <div>
          <h2 className="text-lg font-extrabold text-text-primary tracking-tight">
            {phase === "confirm"
              ? "End Shift"
              : phase === "compiling"
              ? "Compiling Notes..."
              : phase === "done"
              ? "Shift Notes"
              : "Error"}
          </h2>
          {phase === "done" && (
            <p className="text-xs text-text-secondary mt-0.5">
              {formatDate(shiftDate)} &middot; {shiftType === "day" ? "Day" : "Night"} Shift
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 transition text-xl leading-none min-w-[48px] min-h-[48px]"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Confirm phase */}
        {phase === "confirm" && (
          <div className="px-5 py-8">
            <div className="bg-surface dark:bg-card rounded-2xl p-5 mb-6 border border-slate-200/50 dark:border-slate-700">
              <p className="text-sm font-semibold text-text-primary mb-3">
                Shift summary
              </p>
              <div className="flex gap-4 text-sm text-text-secondary">
                <span>{entries.length} entries</span>
                <span>&middot;</span>
                <span>{rooms.length} rooms</span>
                <span>&middot;</span>
                <span>
                  {entries.filter((e) => e.entryType === "voice").length} voice
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {rooms.map((r) => (
                  <span
                    key={r}
                    className="px-2.5 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs font-semibold text-text-primary border border-slate-200 dark:border-slate-600"
                  >
                    Room {r} ({entries.filter((e) => e.room === r).length})
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              AI will compile your diary entries into FDAR notes for each room.
              This takes about 5\u201310 seconds.
            </p>
            <button
              id="compile-fdar-btn"
              onClick={compileNotes}
              className="w-full py-4 bg-gradient-to-r from-brand to-sky-600 text-white rounded-2xl text-base font-semibold hover:shadow-lg hover:shadow-brand/30 transition active:scale-[0.98] min-h-[48px]"
            >
              Compile FDAR Notes
            </button>
          </div>
        )}

        {/* Compiling phase */}
        {phase === "compiling" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-brand animate-spin" />
            <p className="text-sm text-text-secondary">
              Compiling {rooms.length} room{rooms.length !== 1 ? "s" : ""}...
            </p>
          </div>
        )}

        {/* Error phase */}
        {phase === "error" && (
          <div className="px-5 py-8">
            <div className="bg-danger/5 rounded-2xl p-5 mb-6 border border-danger/20">
              <p className="text-sm font-semibold text-danger mb-1">
                Compilation failed
              </p>
              <p className="text-sm text-danger/80">{errorMsg}</p>
            </div>
            <button
              onClick={compileNotes}
              className="w-full py-4 bg-gradient-to-r from-brand to-sky-600 text-white rounded-2xl text-base font-semibold hover:shadow-lg hover:shadow-brand/30 transition active:scale-[0.98] min-h-[48px]"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Done phase \u2014 FDAR notes per room */}
        {phase === "done" && (
          <div className="px-5 py-5 space-y-4 pb-40">
            {fdarRooms.map(({ room, fdar }) => (
              <div
                key={room}
                className="bg-surface dark:bg-card rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand/10 to-sky-500/10 dark:from-brand/20 dark:to-sky-500/20">
                  <span className="text-sm font-bold text-brand">Room {room}</span>
                  <CopyButton text={`Room ${room}\n${fdar}`} />
                </div>
                <div className="px-4 py-4 space-y-3">
                  {fdar.split("\n").map((line, i) => {
                    const [label, ...rest] = line.split(": ");
                    const content = rest.join(": ");
                    const colors: Record<string, string> = {
                      Focus: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
                      Data: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                      Action: "text-accent-new bg-accent-new/5 border-accent-new/20",
                      Response: "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
                    };
                    const colorClass = colors[label] ?? "text-text-primary bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600";

                    if (!content) return null;
                    return (
                      <div
                        key={i}
                        className={`rounded-xl border p-3 ${colorClass}`}
                      >
                        <p className="text-xs font-bold mb-1 opacity-70 uppercase tracking-wide">
                          {label}
                        </p>
                        <p className="text-sm leading-relaxed">{content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom actions for done phase */}
      {phase === "done" && (
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-card border-t border-slate-200/50 px-5 py-4 pb-safe-bottom flex gap-3">
          <CopyButton
            text={headerText + allRoomsText}
            label="Copy All Rooms"
          />
          <button
            onClick={handleDone}
            disabled={endingShift}
            className="flex-1 py-3.5 bg-gradient-to-r from-brand to-sky-600 text-white rounded-2xl text-sm font-semibold hover:shadow-lg hover:shadow-brand/30 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] min-h-[48px]"
          >
            {endingShift ? "Ending..." : "Done"}
          </button>
        </div>
      )}
    </div>
  );
}
