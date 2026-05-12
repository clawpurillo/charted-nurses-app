"use client";

import { useMemo } from "react";
import StatusBadge from "./StatusBadge";
import type { StatusBadgeStatus } from "./StatusBadge";

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

// Map RoomGrid statuses to StatusBadge statuses
const ROOM_TO_BADGE_STATUS: Record<RoomStatus, StatusBadgeStatus> = {
  critical: "busy",
  warning: "idle",
  ok: "available",
  neutral: "unknown",
};

const STATUS_CONFIG: Record<RoomStatus, { label: string; color: string; border: string; dot: string }> = {
  critical: { label: "Needs attention", color: "text-red-700 dark:text-red-400", border: "border-l-red-500", dot: "bg-red-400" },
  warning: { label: "Check soon", color: "text-yellow-700 dark:text-yellow-400", border: "border-l-yellow-500", dot: "bg-yellow-400" },
  ok: { label: "All clear", color: "text-green-700 dark:text-green-400", border: "border-l-green-500", dot: "bg-green-400" },
  neutral: { label: "No entries", color: "text-slate-600 dark:text-slate-400", border: "border-l-slate-400", dot: "bg-slate-300" },
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
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-600" />
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
          <div key={`empty-${i}`} className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-600" />
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
        {rooms.map((room, index) => {
          const config = STATUS_CONFIG[room.status];
          const isActive = activeRoom === room.room;

          return (
            <button
              key={room.room}
              onClick={() => onSelectRoom(room.room)}
              className={`
                animate-in fade-in slide-in-from-bottom-4 duration-200 fill-mode-both
                relative overflow-hidden rounded-2xl bg-white dark:bg-card p-4
                text-left transition-all duration-200 ease-out
                border-0 border-l-4 ${config.border}
                shadow-sm shadow-slate-200/50 dark:shadow-none
                min-h-[120px] flex flex-col
                ${isActive ? "ring-2 ring-brand/30" : ""}
                active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
              `}
              role="listitem"
              aria-label={`Room ${room.room}, ${config.label}, ${room.entryCount} entries, last entry ${room.lastEntryLabel}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="text-3xl font-extrabold tracking-tight leading-none text-slate-900 dark:text-white">
                {room.room}
              </div>
              <div className="mt-2 flex items-center gap-2">
                {/* Status badge */}
                <StatusBadge status={ROOM_TO_BADGE_STATUS[room.status]} label={config.label} size="sm" />
              </div>

              {/* Sparkline */}
              <div className="mt-2">
                <Sparkline dots={room.sparkline} />
              </div>

              <div className="mt-auto pt-3 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {room.lastEntryLabel}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {room.entryCount} {room.entryCount === 1 ? "entry" : "entries"}
                </span>
              </div>
            </button>
          );
        })}

        {/* Add Room card */}
        <button
          onClick={handleAddRoom}
          className="animate-in fade-in slide-in-from-bottom-4 duration-200 fill-mode-both rounded-2xl border-2 border-dashed border-brand/30 dark:border-brand/20 p-4 text-center text-sm font-medium text-brand/60 dark:text-brand/50 transition-all duration-200 ease-out hover:border-brand hover:text-brand min-h-[120px] flex flex-col items-center justify-center gap-2 active:scale-[0.98]"
          aria-label="Add a room"
          style={{ animationDelay: `${rooms.length * 50}ms` }}
        >
          <svg className="w-6 h-6 transition-transform duration-200 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
          </svg>
          <span>Add Room</span>
        </button>
      </div>
    </div>
  );
}
