"use client";

import { useState } from "react";
import { useAuthToken } from "@convex-dev/auth/react";

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
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
        copied
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {copied ? "✓ Copied" : label ?? "Copy"}
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
  const [phase, setPhase] = useState<"confirm" | "compiling" | "done" | "error">(
    "confirm"
  );
  const [fdarRooms, setFdarRooms] = useState<RoomFdar[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

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

  // Build all-rooms copy text
  const allRoomsText = fdarRooms
    .map(
      ({ room, fdar }) =>
        `═══ Room ${room} ═══\n${fdar}`
    )
    .join("\n\n");

  const headerText = `${formatDate(shiftDate)} — ${shiftType === "day" ? "Day" : "Night"} Shift\n${entries.length} entries across ${rooms.length} room${rooms.length !== 1 ? "s" : ""}\n\n`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe-top py-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {phase === "confirm"
              ? "End Shift"
              : phase === "compiling"
              ? "Compiling Notes..."
              : phase === "done"
              ? "Shift Notes"
              : "Error"}
          </h2>
          {phase === "done" && (
            <p className="text-xs text-slate-500">
              {formatDate(shiftDate)} · {shiftType === "day" ? "Day" : "Night"} Shift
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Confirm phase */}
        {phase === "confirm" && (
          <div className="px-5 py-8">
            <div className="bg-slate-50 rounded-2xl p-5 mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-3">
                Shift summary
              </p>
              <div className="flex gap-4 text-sm text-slate-600">
                <span>{entries.length} entries</span>
                <span>·</span>
                <span>{rooms.length} rooms</span>
                <span>·</span>
                <span>
                  {entries.filter((e) => e.entryType === "voice").length} voice
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {rooms.map((r) => (
                  <span
                    key={r}
                    className="px-2.5 py-1 bg-white rounded-lg text-xs font-semibold text-slate-700 border border-slate-200"
                  >
                    Room {r} ({entries.filter((e) => e.room === r).length})
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              AI will compile your diary entries into FDAR notes for each room.
              This takes about 5–10 seconds.
            </p>
            <button
              id="compile-fdar-btn"
              onClick={compileNotes}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-base font-semibold hover:bg-slate-800 transition"
            >
              Compile FDAR Notes
            </button>
          </div>
        )}

        {/* Compiling phase */}
        {phase === "compiling" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
            <p className="text-sm text-slate-500">
              Compiling {rooms.length} room{rooms.length !== 1 ? "s" : ""}...
            </p>
          </div>
        )}

        {/* Error phase */}
        {phase === "error" && (
          <div className="px-5 py-8">
            <div className="bg-red-50 rounded-2xl p-5 mb-6">
              <p className="text-sm font-semibold text-red-700 mb-1">
                Compilation failed
              </p>
              <p className="text-sm text-red-600">{errorMsg}</p>
            </div>
            <button
              onClick={compileNotes}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-base font-semibold hover:bg-slate-800 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Done phase — FDAR notes per room */}
        {phase === "done" && (
          <div className="px-5 py-5 space-y-4 pb-40">
            {fdarRooms.map(({ room, fdar }) => (
              <div
                key={room}
                className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
                  <span className="text-sm font-bold text-white">Room {room}</span>
                  <CopyButton text={`Room ${room}\n${fdar}`} />
                </div>
                <div className="px-4 py-4 space-y-3">
                  {fdar.split("\n").map((line, i) => {
                    const [label, ...rest] = line.split(": ");
                    const content = rest.join(": ");
                    const colors: Record<string, string> = {
                      Focus: "text-amber-700 bg-amber-50 border-amber-200",
                      Data: "text-blue-700 bg-blue-50 border-blue-200",
                      Action: "text-green-700 bg-green-50 border-green-200",
                      Response: "text-purple-700 bg-purple-50 border-purple-200",
                    };
                    const colorClass = colors[label] ?? "text-slate-700 bg-white border-slate-200";

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
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 pb-safe-bottom flex gap-3">
          <CopyButton
            text={headerText + allRoomsText}
            label="Copy All Rooms"
          />
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
