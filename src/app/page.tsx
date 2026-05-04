"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";

import Image from "next/image";

import LandingPage from "./LandingPage";
import ShiftSetup from "../components/ShiftSetup";
import RoomPicker from "../components/RoomPicker";
import HoldToTalk from "../components/HoldToTalk";
import EntryFeed from "../components/EntryFeed";
import EndShiftModal from "../components/EndShiftModal";

function Dashboard() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.entries.me);
  const userSettings = useQuery(api.entries.getUserSettings);
  const entries = useQuery(api.entries.getTodayEntries);
  
  const addEntry = useMutation(api.entries.addEntry);
  const deleteEntry = useMutation(api.entries.deleteEntry);
  const initializeSettings = useMutation(api.entries.initializeUserSettings);
  const startShift = useMutation(api.entries.startShift);
  const updateRooms = useMutation(api.entries.updateAssignedRooms);

  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [showEndShift, setShowEndShift] = useState(false);

  // Initialize settings if empty
  useEffect(() => {
    if (user && userSettings === null) {
      initializeSettings();
    }
  }, [user, userSettings, initializeSettings]);

  // Sync active room when settings load or change
  useEffect(() => {
    if (userSettings?.assignedRooms?.length && !activeRoom) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveRoom(userSettings.assignedRooms[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSettings?.assignedRooms]);

  // Derived shift state
  const now = new Date();
  const currentHour = now.getHours();
  const shiftType = currentHour >= 7 && currentHour < 19 ? "day" : "night";
  const shiftDate =
    shiftType === "night" && currentHour < 7
      ? new Date(now.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA")
      : now.toLocaleDateString("en-CA");
  const shiftLabel = shiftType === "day" ? "Day Shift" : "Night Shift";

  // Needs setup?
  const needsSetup =
    userSettings !== undefined &&
    userSettings !== null &&
    (userSettings.currentShiftDate !== shiftDate ||
      userSettings.currentShiftType !== shiftType);

  if (userSettings === undefined || userSettings === null) return null; // loading or initializing

  if (needsSetup) {
    return (
      <ShiftSetup
        userName={user?.name || ""}
        shiftLabel={shiftLabel}
        shiftDate={shiftDate}
        onStart={async (rooms) => {
          await startShift({ rooms, shiftDate, shiftType });
        }}
      />
    );
  }

  const assignedRooms = userSettings.assignedRooms || [];

  const handleAddRoom = async (room: string) => {
    if (!assignedRooms.includes(room)) {
      const newRooms = [...assignedRooms, room];
      await updateRooms({ rooms: newRooms });
    }
    setActiveRoom(room);
  };

  const handleAddTextEntry = async () => {
    if (!textInput.trim() || !activeRoom) return;
    try {
      await addEntry({
        room: activeRoom,
        description: textInput.trim(),
        entryType: "text",
      });
      setTextInput("");
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to add entry");
    }
  };

  const handleTranscribed = async (text: string) => {
    if (!activeRoom) {
      alert("Please select a room first");
      return;
    }
    try {
      await addEntry({
        room: activeRoom,
        description: text,
        entryType: "voice",
      });
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to add voice entry");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 pt-safe-top shrink-0">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Charted Logo" width={32} height={32} className="rounded-md shadow-sm" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none mb-1">
                Charted
              </h1>
              <p className="text-xs font-medium text-slate-500 leading-none">
              {new Date(shiftDate + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              · {shiftLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {entries && entries.length > 0 && (
              <button
                onClick={() => setShowEndShift(true)}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition"
              >
                End Shift
              </button>
            )}
            <button
              onClick={() => signOut()}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Feed */}
      <EntryFeed
        entries={entries || []}
        activeRoom={null} // We show all entries in the feed for now, not filtered by active room
        onDeleteEntry={async (id) => {
          try {
            await deleteEntry({ entryId: id as import("../../convex/_generated/dataModel").Id<"entries"> });
          } catch (err: unknown) {
            alert((err as Error).message || "Failed to delete entry");
          }
        }}
      />

      {/* Bottom Action Area (Sticky) */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 pb-safe-bottom shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-40">
        <div className="px-5 py-4 space-y-4">
          
          {/* Room Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Select Room
              </span>
              <span className="text-xs text-slate-400">
                Next entry goes here
              </span>
            </div>
            <RoomPicker
              rooms={assignedRooms}
              activeRoom={activeRoom}
              onSelectRoom={setActiveRoom}
              onAddRoom={handleAddRoom}
            />
          </div>

          {/* Voice & Text Input */}
          <div className="flex gap-4 items-center">
            {/* Hold to talk */}
            <div className="shrink-0">
              <HoldToTalk
                onTranscribed={handleTranscribed}
                disabled={!activeRoom}
              />
            </div>

            {/* Text fallback */}
            <div className="flex-1 flex flex-col gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTextEntry();
                }}
                disabled={!activeRoom}
                placeholder={activeRoom ? "Or type action..." : "Pick room first"}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition disabled:opacity-50"
              />
              <button
                onClick={handleAddTextEntry}
                disabled={!textInput.trim() || !activeRoom}
                className="w-full py-2.5 bg-slate-100 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-200 disabled:opacity-50 transition"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEndShift && entries && (
        <EndShiftModal
          entries={entries}
          shiftDate={shiftDate}
          shiftType={shiftType}
          onClose={() => setShowEndShift(false)}
        />
      )}
    </div>
  );
}

export default function Home() {
  const user = useQuery(api.entries.me);

  if (user) {
    return <Dashboard />;
  }

  return <LandingPage />;
}