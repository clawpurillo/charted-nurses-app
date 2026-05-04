"use client";

import { useState } from "react";

interface ShiftSetupProps {
  userName: string;
  shiftLabel: string;
  shiftDate: string;
  onStart: (rooms: string[]) => void;
}

export default function ShiftSetup({
  userName,
  shiftLabel,
  shiftDate,
  onStart,
}: ShiftSetupProps) {
  const [rooms, setRooms] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const addRoom = () => {
    const trimmed = input.trim().toUpperCase();
    if (trimmed && !rooms.includes(trimmed)) {
      setRooms((prev) => [...prev, trimmed]);
    }
    setInput("");
  };

  const removeRoom = (room: string) => {
    setRooms((prev) => prev.filter((r) => r !== room));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRoom();
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStart(rooms);
    } finally {
      setLoading(false);
    }
  };

  // Format display date
  const displayDate = new Date(shiftDate + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric" }
  );

  const firstName = userName?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-safe">
      <div className="w-full max-w-sm">
        {/* Greeting */}
        <div className="mb-8">
          <p className="text-2xl font-bold text-slate-900 mb-1">
            {greeting}, {firstName} 👋
          </p>
          <p className="text-slate-500 text-sm">
            {displayDate} · {shiftLabel}
          </p>
        </div>

        {/* Room Setup */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Your rooms today
          </label>

          {/* Room pills */}
          {rooms.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {rooms.map((room) => (
                <span
                  key={room}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-full"
                >
                  {room}
                  <button
                    onClick={() => removeRoom(room)}
                    className="text-slate-400 hover:text-white transition text-lg leading-none"
                    aria-label={`Remove room ${room}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Room input */}
          <div className="flex gap-2">
            <input
              id="room-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Room number (e.g. 101)"
              className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900 transition"
              autoComplete="off"
              inputMode="text"
            />
            <button
              onClick={addRoom}
              disabled={!input.trim()}
              className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Tap Add or press Enter after each room number
          </p>
        </div>

        {/* Actions */}
        <button
          id="start-shift-btn"
          onClick={handleStart}
          disabled={loading}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl text-base font-semibold hover:bg-slate-800 transition disabled:opacity-60 mb-3"
        >
          {loading ? "Starting shift..." : "Start Shift"}
        </button>

        {rooms.length === 0 && (
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-3 text-slate-400 text-sm hover:text-slate-600 transition"
          >
            Skip — add rooms as I go
          </button>
        )}
      </div>
    </div>
  );
}
