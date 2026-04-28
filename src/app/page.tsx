"use client";

import { useUser, useAuth, SignIn, SignInButton, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";

type Entry = {
  _id: Id<"entries">;
  userId: Id<"users">;
  room: string;
  description: string;
  timestamp: number;
  shiftDate: string;
  shiftType: "day" | "night";
};

function Dashboard() {
  const { user } = useUser();
  const upsertUser = useMutation(api.entries.upsertUser);
  const addEntry = useMutation(api.entries.addEntry);
  const endShift = useMutation(api.entries.endShift);

  const [shiftType, setShiftType] = useState<"day" | "night">("day");
  const [entryInput, setEntryInput] = useState("");
  const [showEndShift, setShowEndShift] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState("");

  // Sync Clerk user to Convex
  useEffect(() => {
    if (user) {
      upsertUser({
        clerkId: user.id,
        name: user.fullName || user.primaryEmailAddress?.emailAddress || "Nurse",
        credentials: user.publicMetadata?.credentials as string | undefined,
      });
    }
  }, [user, upsertUser]);

  // Get today's date for shift
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });

  const currentUser = useQuery(
    api.entries.getCurrentUser,
    user ? { clerkId: user.id } : "skip"
  );
  const entries = useQuery(
    api.entries.getTodayEntries,
    currentUser ? { userId: currentUser._id, shiftDate: today } : "skip"
  );

  const handleAddEntry = async () => {
    if (!entryInput.trim() || !currentUser) return;

    // Parse room number from input: "Room 101, ..." or "101, ..." or "ROOM 101 ..."
    const roomMatch = entryInput.match(/(?:room\s*)?(\d+[a-z]?)\b/i);
    const room = roomMatch ? roomMatch[1].toUpperCase() : "UNKNOWN";
    const description = roomMatch
      ? entryInput.replace(/(?:room\s*)?\d+[a-z]?\b[,.\s]*/i, "").trim()
      : entryInput.trim();

    await addEntry({
      userId: currentUser._id,
      room,
      description,
      shiftType,
    });
    setEntryInput("");
  };

  const handleEndShift = async () => {
    if (!currentUser) return;
    const uniqueRooms = new Set(entries?.map((e) => e.room)).size;
    await endShift({
      userId: currentUser._id,
      shiftDate: today,
      shiftType,
      entryCount: entries?.length || 0,
      roomCount: uniqueRooms,
      handoverNotes: handoverNotes || undefined,
    });
    setShowEndShift(false);
    setHandoverNotes("");
  };

  // Group entries by room
  const groupedByRoom = entries?.reduce(
    (acc, entry) => {
      if (!acc[entry.room]) acc[entry.room] = [];
      acc[entry.room].push(entry);
      return acc;
    },
    {} as Record<string, Entry[]>
  ) || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Charted</h1>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Shift Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setShiftType("day")}
                className={`px-3 py-1 text-sm rounded-md transition ${
                  shiftType === "day"
                    ? "bg-white shadow text-slate-800"
                    : "text-slate-500"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setShiftType("night")}
                className={`px-3 py-1 text-sm rounded-md transition ${
                  shiftType === "night"
                    ? "bg-white shadow text-slate-800"
                    : "text-slate-500"
                }`}
              >
                Night
              </button>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-32">
        {/* Quick Entry */}
        <section className="py-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <label className="text-sm font-medium text-slate-600 mb-2 block">
              Quick Entry
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={entryInput}
                onChange={(e) => setEntryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddEntry();
                }}
                placeholder='e.g. "Room 101, inserted IV on left cephalic vein"'
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={handleAddEntry} disabled={!entryInput.trim()}>
                Add
              </Button>
            </div>
            {/* Quick presets */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {["IV inserted", "Med given", "Vitals taken", "Wound care"].map(
                (preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setEntryInput(preset);
                    }}
                    className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition"
                  >
                    {preset}
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        {/* Stats */}
        {entries && entries.length > 0 && (
          <section className="py-2">
            <div className="flex gap-4 text-sm text-slate-500">
              <span>{entries.length} entries</span>
              <span>
                {Object.keys(groupedByRoom).length} rooms
              </span>
            </div>
          </section>
        )}

        {/* Timeline grouped by room */}
        {entries && entries.length > 0 ? (
          <section className="space-y-4 py-2">
            {Object.entries(groupedByRoom).map(([room, roomEntries]) => (
              <div key={room} className="bg-white rounded-xl border shadow-sm">
                <div className="px-4 py-2 border-b bg-slate-50 rounded-t-xl">
                  <span className="text-sm font-semibold text-slate-700">
                    Room {room}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    ({roomEntries.length} entries)
                  </span>
                </div>
                <div className="divide-y">
                  {roomEntries
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((entry) => (
                      <div key={entry._id} className="px-4 py-3">
                        <p className="text-sm text-slate-800">
                          {entry.description}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(entry.timestamp).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="py-12 text-center text-slate-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="text-sm">No entries yet for this shift</p>
          </section>
        )}
      </main>

      {/* End Shift Button */}
      {entries && entries.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setShowEndShift(true)}
            >
              End Shift & Generate Summary
            </Button>
          </div>
        </div>
      )}

      {/* End Shift Modal */}
      {showEndShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">
              End Shift
            </h2>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                {entries?.length} entries across{" "}
                {Object.keys(groupedByRoom).length} rooms
              </p>
              <textarea
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="Handover notes (optional)..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEndShift(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleEndShift}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <div className="p-4 text-slate-400">Loading...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-4xl font-bold text-slate-800">Charted</div>
          <p className="text-slate-500">
            Quick nursing shift documentation. No patient details stored — just
            room numbers and actions.
          </p>
          <SignInButton mode="modal">
            <Button size="lg" className="w-full">
              Sign In with Clerk
            </Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}
