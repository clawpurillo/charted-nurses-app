"use client";

import { useMemo } from "react";

export type RoomStatus = "ok" | "warning" | "critical" | "neutral";

export interface SparklineDot {
  timestamp: number;
  status: RoomStatus;
}

export interface RoomOverview {
  room: string;
  entryCount: number;
  lastEntryTime: number | null;
  status: RoomStatus;
  lastEntryLabel: string;
  sparkline: SparklineDot[];
}

// Keep old interface for backward compat (deprecated — use RoomOverview)
export interface RoomCardData {
  room: string;
  entryCount: number;
  lastEntryTime: number | null;
  status: RoomStatus;
  lastEntryLabel: string;
}

const STATUS_CONFIG: Record<RoomStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: "Needs attention", color: "text-red-700", bg: "bg-red-50", border: "border-l-red-500", dot: "bg-red-400" },
  warning: { label: "Check soon", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-l-yellow-500", dot: "bg-yellow-400" },
  ok: { label: "All clear", color: "text-green-700", bg: "bg-green-50", border: "border-l-green-500", dot: "bg-green-400" },
  neutral: { label: "No entries", color: "text-slate-600", bg: "bg-slate-100", border: "border-l-slate-400", dot: "bg-slate-300" },
};

interface RoomGridProps {
  rooms: RoomOverview[];
  activeRoom: string | null;
  onSelectRoom: (room: string) => void;
  onAddRoom: (room: string) => void;
}

function Sparkline({ dots }: { dots: SparklineDot[] }) {
  if (dots.length === 0) {
    return (
      <div className="flex items-center gap-[3px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-[3px]" aria-label="Recent entries timeline">
      {dots.map((dot, i) => {
        const config = STATUS_CONFIG[dot.status];
        return (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
            title={config.label}
          />
        );
      })}
      {/* Pad to 8 dots if fewer entries */}
      {dots.length < 8 &&
        Array.from({ length: 8 - dots.length }).map((_, i) => (
          <div key={`empty-${i}`} className="w-1.5 h-1.5 rounded-full bg-slate-200" />
        ))}
    </div>
  );
}

export default function RoomGrid({ rooms, activeRoom, onSelectRoom, onAddRoom }: RoomGridProps) {
  const handleAddRoom = () => {
    const room = window.prompt("Enter room number:");
    if (room) {
      const trimmed = room.trim().toUpperCase();
      if (trimmed) onAddRoom(trimmed);
    }
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {rooms.map((room) => {
          const config = STATUS_CONFIG[room.status];
          const isActive = activeRoom === room.room;

          return (
            <button
              key={room.room}
              onClick={() => onSelectRoom(room.room)}
              className={`
                relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4
                text-left transition-all duration-150
                border-l-4 ${config.border}
                min-h-[120px] flex flex-col
                ${isActive ? "ring-2 ring-slate-900 shadow-md" : "shadow-sm"}
                active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2
              `}
              role="listitem"
              aria-label={`Room ${room.room}, ${config.label}, ${room.entryCount} entries, last entry ${room.lastEntryLabel}`}
            >
              <div className="text-2xl font-extrabold tracking-tight leading-none text-slate-900">
                {room.room}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
              </div>

              {/* Sparkline */}
              <div className="mt-2">
                <Sparkline dots={room.sparkline} />
              </div>

              <div className="mt-auto pt-3 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">
                  {room.lastEntryLabel}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {room.entryCount} {room.entryCount === 1 ? "entry" : "entries"}
                </span>
              </div>
            </button>
          );
        })}

        {/* Add Room card */}
        <button
          onClick={handleAddRoom}
          className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center text-sm font-medium text-slate-400 transition hover:border-slate-400 hover:text-slate-600 min-h-[120px] flex flex-col items-center justify-center gap-2 active:scale-[0.98]"
          aria-label="Add a room"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
          </svg>
          <span>Add Room</span>
        </button>
      </div>
    </div>
  );
}
