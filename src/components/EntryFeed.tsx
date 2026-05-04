"use client";

interface Entry {
  _id: string;
  room: string;
  description: string;
  entryType: "text" | "voice";
  timestamp: number;
}

interface EntryFeedProps {
  entries: Entry[];
  activeRoom: string | null;
  onDeleteEntry: (id: string) => Promise<void>;
}

export default function EntryFeed({
  entries,
  activeRoom,
  onDeleteEntry,
}: EntryFeedProps) {
  // Sort oldest to newest
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  // Filter if active room is selected
  const filtered = activeRoom
    ? sorted.filter((e) => e.room === activeRoom)
    : sorted;

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10">
        <p className="text-2xl mb-2">📋</p>
        <p className="text-sm">No entries yet</p>
        {activeRoom && (
          <p className="text-xs mt-1">for Room {activeRoom}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-32">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-4 bottom-4 w-px bg-slate-200" />

        <div className="space-y-4 relative">
          {filtered.map((entry) => (
            <div key={entry._id} className="relative flex gap-3 group">
              {/* Timeline dot */}
              <div className="relative z-10 w-6 flex justify-center shrink-0 pt-2">
                <div className="w-2 h-2 rounded-full bg-slate-400 ring-4 ring-slate-50" />
              </div>

              {/* Entry Card */}
              <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm relative group-hover:border-slate-200 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-xs font-bold">
                      {entry.room}
                    </span>
                    {entry.entryType === "voice" && (
                      <span className="text-xs text-blue-500">🎤</span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-400">
                    {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed pr-6">
                  {entry.description}
                </p>

                {/* Delete button (shows on hover for desktop, or right side for mobile) */}
                <button
                  onClick={() => {
                    if (window.confirm("Delete this entry?")) {
                      onDeleteEntry(entry._id);
                    }
                  }}
                  className="absolute right-2 bottom-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 md:opacity-0"
                  aria-label="Delete entry"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
