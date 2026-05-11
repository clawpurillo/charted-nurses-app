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

  const toggleRoom = (room: string) => {
    setRooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
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

  // Simple step indicator state
  const currentStep = rooms.length > 0 ? 2 : 1;
  const totalSteps = 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/5 via-white to-sky-50 flex flex-col items-center justify-start px-4 py-8 sm:px-6 sm:py-12 pb-safe">
      <div className="w-full max-w-md">
        {/* Greeting */}
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold text-text-primary mb-1">
            {greeting}, {firstName}{" "}
            <svg
              className="w-6 h-6 inline text-brand animate-pulse"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 8c.5-1.5 1.5-3 3-3 2 0 3 2 3 4s-1 4-3 4c-1 0-2-1-3-3-.5 2-1.5 3-3 3-2 0-3-2-3-4s1-4 3-4c1.5 0 2.5 1.5 3 3" />
              <path d="M1 12c.5-1 1.5-2 2.5-2s2 1 2.5 2c.5 1 1.5 2 2.5 2s2-1 2.5-2c.5-1 1.5-2 2.5-2s2 1 2.5 2" />
            </svg>
          </p>
          <p className="text-text-secondary text-sm">
            {displayDate} \u00b7 {shiftLabel}
          </p>
        </div>

        {/* Step indicator with brand progress bar */}
        <div className="mb-6" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps} aria-label={`Step ${currentStep} of ${totalSteps}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${currentStep >= 1 ? "text-brand" : "text-text-muted"}`}>
              {currentStep > 1 ? (
                <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
              ) : (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold mr-1">1</span>
              )}
              Add rooms
            </span>
            <span className={`text-xs font-medium ${currentStep >= 2 ? "text-brand" : "text-text-muted"}`}>
              {currentStep >= 2 ? (
                <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
              ) : (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-text-muted text-white text-[10px] font-bold mr-1">2</span>
              )}
              Start shift
            </span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Card: Room Selection */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 mb-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">
            Your rooms today
          </h2>

          {/* Room checkboxes */}
          {rooms.length > 0 && (
            <div className="space-y-2 mb-4">
              {rooms.map((room) => (
                <label
                  key={room}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface/50 hover:bg-brand-soft/30 dark:hover:bg-brand-soft/10 transition cursor-pointer min-h-[48px]"
                >
                  <input
                    type="checkbox"
                    checked
                    onChange={() => toggleRoom(room)}
                    className="sr-only peer"
                    aria-label={`Room ${room}, selected`}
                  />
                  <span className="w-5 h-5 shrink-0 rounded-md border-2 border-brand bg-brand text-white flex items-center justify-center peer-checked:ring-2 peer-checked:ring-brand/30 transition">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  </span>
                  <span className="flex-1 text-sm font-medium text-text-primary">{room}</span>
                  <button
                    onClick={() => removeRoom(room)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950 transition min-w-[48px] min-h-[48px]"
                    aria-label={`Remove room ${room}`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </label>
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
              className="flex-1 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm text-text-primary bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition min-h-[48px] placeholder:text-text-muted"
              autoComplete="off"
              inputMode="text"
            />
            <button
              onClick={addRoom}
              disabled={!input.trim()}
              className="px-4 py-3 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand/90 transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] min-w-[48px]"
              aria-label="Add room"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Tap Add or press Enter after each room number
          </p>
        </div>

        {/* Actions */}
        <button
          id="start-shift-btn"
          onClick={handleStart}
          disabled={loading}
          className="w-full py-4 bg-brand text-white rounded-2xl text-base font-semibold hover:shadow-lg hover:shadow-brand/30 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed mb-3 min-h-[48px]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Starting shift...
            </span>
          ) : (
            "Start Shift"
          )}
        </button>

        {rooms.length === 0 && (
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-3 text-text-muted text-sm hover:text-text-secondary transition min-h-[48px]"
          >
            Skip \u2014 add rooms as I go
          </button>
        )}
      </div>
    </div>
  );
}
