"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect, useRef, useCallback } from "react";
import LandingPage from "./LandingPage";

// ─── Dashboard ─────────────────────────────────────────────

type DashboardView = "current" | "history" | "history-shift" | "history-room" | "settings";

function Dashboard() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.entries.me);
  const entries = useQuery(api.entries.getTodayEntries);
  const stats = useQuery(api.entries.getTodayStats);
  const userSettings = useQuery(api.entries.getUserSettings);
  const canUseVoice = useQuery(api.entries.canUseVoiceEntry);
  const pastShifts = useQuery(api.entries.getPastShifts);
  const addEntry = useMutation(api.entries.addEntry);
  const deleteEntry = useMutation(api.entries.deleteEntry);
  const initializeSettings = useMutation(api.entries.initializeSettings);
  const endShift = useMutation(api.entries.endShift);

  // Navigation state
  const [view, setView] = useState<DashboardView>("current");
  const [selectedHistoryShift, setSelectedHistoryShift] = useState<{ shiftDate: string; shiftType: "day" | "night" } | null>(null);
  const [selectedHistoryRoom, setSelectedHistoryRoom] = useState<string | null>(null);
  const [showEndShift, setShowEndShift] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shiftSummaryData, setShiftSummaryData] = useState<any>(null);

  // Entry state
  const [entryInput, setEntryInput] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFdarCategory, setSelectedFdarCategory] = useState<"focus" | "data" | "action" | "response" | undefined>(undefined);

  // Voice recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const [transcript, setTranscript] = useState("");

  // History queries
  const historyShiftEntries = useQuery(
    api.entries.getPastEntries,
    selectedHistoryShift ? { shiftDate: selectedHistoryShift.shiftDate } : { shiftDate: "" }
  );

  const historyRoomEntries = useQuery(
    api.entries.getEntriesByRoom,
    selectedHistoryRoom ? { room: selectedHistoryRoom } : { room: "" }
  );

  // Current entries based on view
  const currentEntries = view === "history-shift" && selectedHistoryShift ? historyShiftEntries : view === "history-room" ? historyRoomEntries : entries;

  // Initialize user settings on first load
  useEffect(() => {
    if (user && userSettings === null) {
      initializeSettings();
    }
  }, [user, userSettings, initializeSettings]);

  // Voice recording handlers
  const startRecording = useCallback(async () => {
    try {
      // Check for SpeechRecognition support
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. Try Chrome or Safari.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalTranscript = "";

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }
        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          alert("Microphone access denied. Please check permissions.");
        }
      };

      recognition.onend = () => {
        // Auto-restart if still recording
        if (isRecording) {
          try {
            recognition.start();
          } catch (e) {
            // Ignore restart errors
          }
        }
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setTranscript("");
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setIsRecording(false);
    
    // Use the transcript as the entry
    if (transcript.trim()) {
      handleAddEntry("voice", transcript.trim());
      setTranscript("");
    }
  }, [transcript]);

  const handleAddEntry = async (entryType: "text" | "voice" = "text", descriptionOverride?: string) => {
    const desc = descriptionOverride || entryInput;
    if (!desc.trim()) return;
    
    if (entryType === "voice" && !canUseVoice) {
      alert("Voice entry limit reached for today");
      return;
    }

    const roomMatch = desc.match(/(?:room\s*)?(\d+[a-z]?)\b/i);
    const room = roomMatch ? roomMatch[1].toUpperCase() : "UNKNOWN";
    const description = roomMatch
      ? desc.replace(/(?:room\s*)?\d+[a-z]?\b[.,\s]*/i, "").trim() || desc.trim()
      : desc.trim();

    try {
      await addEntry({ room, description, entryType, fdarCategory: selectedFdarCategory });
      setEntryInput("");
      setIsVoiceMode(false);
      setSelectedFdarCategory(undefined);
    } catch (err: any) {
      alert(err.message || "Failed to add entry");
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await deleteEntry({ entryId: entryId as any });
    } catch (err: any) {
      alert(err.message || "Failed to delete entry");
    }
  };

  const groupedByRoom = currentEntries?.reduce((acc, entry) => {
    if (!acc[entry.room]) acc[entry.room] = [];
    acc[entry.room].push(entry);
    return acc;
  }, {} as Record<string, typeof currentEntries>) || {};

  // View mode toggle
  const [activeRoomTab, setActiveRoomTab] = useState<string>("all");

  // Timeline entries (chronological)
  const sortedEntries = currentEntries
    ? [...currentEntries].sort((a, b) => a.timestamp - b.timestamp)
    : [];

  // Get rooms from entries
  const rooms = currentEntries
    ? Array.from(new Set(currentEntries.map((e) => e.room))).sort()
    : [];

  // Filter entries by active room tab
  const filteredEntries = activeRoomTab === "all"
    ? sortedEntries
    : sortedEntries.filter((e) => e.room === activeRoomTab);

  // Get time labels for timeline (group by hour)
  const getTimeLabel = (timestamp: number, prevTimestamp?: number): string | null => {
    const time = new Date(timestamp);
    if (!prevTimestamp) {
      return time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    const prevHour = new Date(prevTimestamp).getHours();
    const currHour = time.getHours();
    if (currHour !== prevHour) {
      return time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return null;
  };

  const fdarColors: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
    focus: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", dot: "bg-amber-500" },
    data: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200", dot: "bg-blue-500" },
    action: { bg: "bg-green-50", text: "text-green-700", ring: "ring-green-200", dot: "bg-green-500" },
    response: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200", dot: "bg-purple-500" },
  };

  const fdarLabels: Record<string, string> = {
    focus: "F",
    data: "D",
    action: "A",
    response: "R",
  };

  const getRoomColor = (room: string): string => {
    const colors = [
      "bg-slate-100 text-slate-700 ring-slate-200",
      "bg-blue-50 text-blue-700 ring-blue-200",
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
      "bg-violet-50 text-violet-700 ring-violet-200",
      "bg-rose-50 text-rose-700 ring-rose-200",
      "bg-amber-50 text-amber-700 ring-amber-200",
      "bg-cyan-50 text-cyan-700 ring-cyan-200",
      "bg-orange-50 text-orange-700 ring-orange-200",
    ];
    let hash = 0;
    for (let i = 0; i < room.length; i++) {
      hash = room.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const now = new Date();
  const currentShiftLabel = now.getHours() >= 7 && now.getHours() < 19 ? "Day Shift" : "Night Shift";
  const currentShiftDate = now.toLocaleDateString("en-CA");

  const voiceUsed = userSettings?.voiceEntriesUsedToday || 0;
  const voiceLimit = userSettings?.plan === "pro" ? "∞" : userSettings?.plan === "basic" ? 15 : 5;

  // Format shift date for display
  const formatShiftDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  // Navigation helpers
  const openHistoryShift = (shift: { shiftDate: string; shiftType: "day" | "night" }) => {
    setSelectedHistoryShift(shift);
    setSelectedHistoryRoom(null);
    setView("history-shift");
  };

  const openHistoryRoom = (room: string) => {
    setSelectedHistoryRoom(room);
    setView("history-room");
  };

  const goBack = () => {
    if (view === "history-room") {
      setView("history-shift");
      setSelectedHistoryRoom(null);
    } else if (view === "history-shift") {
      setView("history");
      setSelectedHistoryShift(null);
    } else if (view === "settings") {
      setView("current");
    }
  };

  // Generate shift summary text
  const generateShiftSummary = (shiftEntries: typeof entries, shiftDate?: string, shiftType?: string) => {
    if (!shiftEntries || shiftEntries.length === 0) return "";
    
    const fdarLabels: Record<string, string> = {
      focus: "F",
      data: "D",
      action: "A",
      response: "R",
    };
    
    const lines = shiftEntries
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((entry) => {
        const time = new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const type = entry.entryType === "voice" ? "🎤" : "";
        const fdar = entry.fdarCategory ? `[${fdarLabels[entry.fdarCategory]}] ` : "";
        return `${time} [Room ${entry.room}] ${fdar}${type} ${entry.description}`;
      });

    const dateStr = shiftDate 
      ? formatShiftDate(shiftDate)
      : now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const typeStr = shiftType || currentShiftLabel;
    const rooms = new Set(shiftEntries.map((e) => e.room)).size;
    const voiceCount = shiftEntries.filter((e) => e.entryType === "voice").length;

    return `Shift Summary
${dateStr} — ${typeStr}
${"=".repeat(40)}

Rooms: ${rooms} | Entries: ${shiftEntries.length} | Voice: ${voiceCount}

${lines.join("\n")}`;
  };

  // Get summary text for current shift
  const currentShiftSummary = generateShiftSummary(entries);

  // Get summary text for history shift
  const historyShiftSummary = selectedHistoryShift && historyShiftEntries 
    ? generateShiftSummary(historyShiftEntries, selectedHistoryShift.shiftDate, selectedHistoryShift.shiftType)
    : "";

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-40 bg-white border-r border-slate-200 transition-transform duration-200 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 w-56`}>
        <div className="p-4">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Charted</h1>
          <p className="text-xs text-slate-500 mt-1">{user?.name}</p>
        </div>
        
        <nav className="px-2 space-y-1">
          <button
            onClick={() => { setView("current"); setSelectedHistoryShift(null); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
              view === "current" 
                ? "bg-slate-900 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📋 Current Shift
          </button>
          <button
            onClick={() => { setView("history"); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
              view.startsWith("history") 
                ? "bg-slate-900 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📜 History
          </button>
          <button
            onClick={() => { setView("settings"); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
              view === "settings" 
                ? "bg-slate-900 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ⚙️ Settings
          </button>
        </nav>

        <div className="absolute bottom-4 left-2 right-2">
          <button
            onClick={() => signOut()}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`md:ml-56`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Hamburger Menu */}
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden text-slate-600 hover:text-slate-900 transition p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {(view === "history-shift" || view === "history-room" || view === "settings") && (
                <button onClick={goBack} className="text-slate-500 hover:text-slate-900 transition">
                  ←
                </button>
              )}
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {view === "current" && "Current Shift"}
                  {view === "history" && "History"}
                  {view === "history-shift" && selectedHistoryShift && `${formatShiftDate(selectedHistoryShift.shiftDate)} — ${selectedHistoryShift.shiftType} Shift`}
                  {view === "history-room" && `Room ${selectedHistoryRoom}`}
                  {view === "settings" && "Settings"}
                </h2>
                {view === "current" && (
                  <p className="text-xs text-slate-500">
                    {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {currentShiftLabel}
                  </p>
                )}
              </div>
            </div>
            {view === "current" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Voice: {voiceUsed}/{voiceLimit}</span>
              </div>
            )}
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
          {/* Current Shift View */}
          {view === "current" && (
            <>
              {/* Quick Entry */}
              <section className="mb-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-600">Quick Entry</label>
                    <button
                      onClick={() => setIsVoiceMode(!isVoiceMode)}
                      className={`px-2 py-1 text-xs rounded transition ${
                        isVoiceMode 
                          ? "bg-blue-100 text-blue-700" 
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      🎤 Voice
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={isRecording ? transcript : entryInput}
                      onChange={(e) => isRecording ? setTranscript(e.target.value) : setEntryInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddEntry(isVoiceMode ? "voice" : "text")}
                      placeholder={isVoiceMode ? "Tap 🎤 to start speaking..." : isRecording ? "Listening..." : '"Room 101, IV inserted"'}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      onClick={() => {
                        if (isVoiceMode && isRecording) {
                          stopRecording();
                        } else if (isVoiceMode) {
                          startRecording();
                        } else {
                          handleAddEntry("text");
                        }
                      }}
                      disabled={!entryInput.trim() && !isVoiceMode}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                        isRecording
                          ? "bg-red-600 text-white animate-pulse"
                          : isVoiceMode
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                      } disabled:opacity-40`}
                    >
                      {isRecording ? "⏹" : isVoiceMode ? "🎤" : "Add"}
                    </button>
                  </div>
                  
                  {/* FDAR Category Selection */}
                  <div className="flex gap-1.5 mt-2">
                    <span className="text-xs text-slate-500 py-1">FDAR:</span>
                    {(["focus", "data", "action", "response"] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedFdarCategory(selectedFdarCategory === cat ? undefined : cat)}
                        className={`px-2 py-1 text-xs rounded transition font-medium ${
                          selectedFdarCategory === cat
                            ? cat === "focus"
                              ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                              : cat === "data"
                                ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                                : cat === "action"
                                  ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                                  : "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {cat.charAt(0).toUpperCase()}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    {["IV inserted", "Med given", "Vitals taken", "Wound care"].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setEntryInput(preset)}
                        className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Room Tabs */}
              {entries && entries.length > 0 && (
                <div className="flex gap-1 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
                  <button
                    onClick={() => setActiveRoomTab("all")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition shrink-0 ${
                      activeRoomTab === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    All ({entries.length})
                  </button>
                  {rooms.map((room) => {
                    const roomEntries = groupedByRoom[room] || [];
                    const roomColor = getRoomColor(room);
                    return (
                      <button
                        key={room}
                        onClick={() => setActiveRoomTab(room)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition shrink-0 ${
                          activeRoomTab === room
                            ? "bg-slate-900 text-white"
                            : `bg-white ${roomColor} border ring-1`
                        }`}
                      >
                        {room} ({roomEntries.length})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Stats */}
              {stats && stats.total > 0 && (
                <div className="flex gap-4 text-xs text-slate-500 mb-3">
                  <span>{stats.total} entries</span>
                  <span>{stats.rooms} rooms</span>
                  {stats.voice > 0 && <span className="text-blue-600">{stats.voice} voice</span>}
                  {stats.text > 0 && <span className="text-slate-600">{stats.text} text</span>}
                </div>
              )}

              {/* Timeline */}
              {filteredEntries.length > 0 ? (
                <section className="mb-4">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-slate-300 via-slate-200 to-slate-100" />

                    {/* Shift start marker */}
                    <div className="relative flex items-start gap-3 mb-4 pl-0">
                      <div className="relative z-10 w-10 flex justify-center">
                        <div className="w-3 h-3 rounded-full bg-slate-900 ring-4 ring-slate-50" />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-xs font-medium text-slate-500">Shift started</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(sortedEntries[0].timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    {/* Entries */}
                    {filteredEntries.map((entry, idx) => {
                      const prevEntry = idx > 0 ? filteredEntries[idx - 1] : null;
                      const timeLabel = getTimeLabel(entry.timestamp, prevEntry?.timestamp);
                      const fdar = entry.fdarCategory ? fdarColors[entry.fdarCategory] : null;
                      const roomColor = getRoomColor(entry.room);

                      return (
                        <div key={entry._id} className="relative flex items-start gap-3 mb-3 group">
                          {/* Time label */}
                          {timeLabel && (
                            <div className="absolute -left-16 top-1 hidden md:block">
                              <span className="text-[10px] font-medium text-slate-400 tabular-nums">{timeLabel}</span>
                            </div>
                          )}

                          {/* Timeline dot */}
                          <div className="relative z-10 w-10 flex justify-center shrink-0">
                            <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-slate-50 transition-all duration-200 ${
                              fdar ? fdar.dot : "bg-slate-400"
                            } group-hover:w-3 group-hover:h-3`} />
                          </div>

                          {/* Entry card */}
                          <div className={`flex-1 rounded-xl border p-3 transition-all duration-200 hover:shadow-md hover:scale-[1.01] cursor-default ${
                            fdar ? `${fdar.bg} ${fdar.ring} ring-1` : "bg-white border-slate-200"
                          }`}>
                            <div className="flex items-start gap-2">
                              {/* Room badge */}
                              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ring-1 shrink-0 ${roomColor}`}>
                                {entry.room}
                              </span>

                              {/* FDAR badge */}
                              {entry.fdarCategory && (
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                  fdar?.text || "text-slate-600"
                                }`}>
                                  {fdarLabels[entry.fdarCategory]}
                                </span>
                              )}

                              {/* Voice icon */}
                              {entry.entryType === "voice" && (
                                <span className="text-xs">🎤</span>
                              )}

                              {/* Mobile time */}
                              <span className="text-[10px] text-slate-400 md:hidden ml-auto shrink-0">
                                {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </div>

                            <p className={`text-sm mt-2 leading-relaxed ${fdar ? fdar.text : "text-slate-700"}`}>
                              {entry.description}
                            </p>

                            {/* Delete button */}
                            <button
                              onClick={() => handleDeleteEntry(entry._id)}
                              className="mt-2 text-[10px] text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Shift end marker */}
                    <div className="relative flex items-start gap-3 mt-4 pl-0">
                      <div className="relative z-10 w-10 flex justify-center">
                        <div className="w-3 h-3 rounded-full bg-slate-300 ring-4 ring-slate-50" />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-xs font-medium text-slate-400">Shift ended</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(sortedEntries[sortedEntries.length - 1].timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="py-8 text-center text-slate-400 mb-4">
                  <p className="text-2xl mb-1">📋</p>
                  <p className="text-sm">No entries yet</p>
                  <p className="text-xs mt-1">Start charting above</p>
                </section>
              )}

              {/* End Shift */}
              {entries && entries.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      const data = await endShift();
                      setShiftSummaryData(data);
                      setShowEndShift(true);
                    } catch (err: any) {
                      alert(err.message || "Failed to end shift");
                    }
                  }}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
                >
                  End Shift
                </button>
              )}
            </>
          )}

          {/* History View */}
          {view === "history" && (
            <section className="space-y-2">
              {pastShifts && pastShifts.length > 0 ? (
                pastShifts.map((shift) => (
                  <button
                    key={`${shift.shiftDate}-${shift.shiftType}`}
                    onClick={() => openHistoryShift(shift)}
                    className="w-full text-left bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{formatShiftDate(shift.shiftDate)}</p>
                        <p className="text-xs text-slate-500">{shift.shiftType} Shift</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-800">{shift.count} entries</p>
                        <span className="text-xs text-slate-400">→</span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <section className="py-8 text-center text-slate-400">
                  <p className="text-2xl mb-1">📜</p>
                  <p className="text-sm">No past shifts</p>
                </section>
              )}
            </section>
          )}

          {/* History Shift View */}
          {view === "history-shift" && selectedHistoryShift && (
            <>
              {/* Timeline View */}
              {historyShiftEntries && historyShiftEntries.length > 0 && (
                <section className="mb-4">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-slate-300 via-slate-200 to-slate-100" />

                    {/* Shift start marker */}
                    <div className="relative flex items-start gap-3 mb-4 pl-0">
                      <div className="relative z-10 w-10 flex justify-center">
                        <div className="w-3 h-3 rounded-full bg-slate-900 ring-4 ring-slate-50" />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-xs font-medium text-slate-500">Shift started</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(historyShiftEntries[0].timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    {/* Entries */}
                    {[...historyShiftEntries].sort((a, b) => a.timestamp - b.timestamp).map((entry, idx) => {
                      const prevEntry = idx > 0 ? [...historyShiftEntries].sort((a, b) => a.timestamp - b.timestamp)[idx - 1] : null;
                      const timeLabel = getTimeLabel(entry.timestamp, prevEntry?.timestamp);
                      const fdar = entry.fdarCategory ? fdarColors[entry.fdarCategory] : null;
                      const roomColor = getRoomColor(entry.room);

                      return (
                        <div key={entry._id} className="relative flex items-start gap-3 mb-3">
                          {timeLabel && (
                            <div className="absolute -left-16 top-1 hidden md:block">
                              <span className="text-[10px] font-medium text-slate-400 tabular-nums">{timeLabel}</span>
                            </div>
                          )}
                          <div className="relative z-10 w-10 flex justify-center shrink-0">
                            <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-slate-50 ${fdar ? fdar.dot : "bg-slate-400"}`} />
                          </div>
                          <div className={`flex-1 rounded-xl border p-3 ${fdar ? `${fdar.bg} ${fdar.ring} ring-1` : "bg-white border-slate-200"}`}>
                            <div className="flex items-start gap-2">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ring-1 shrink-0 ${roomColor}`}>
                                {entry.room}
                              </span>
                              {entry.fdarCategory && (
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${fdar?.text || "text-slate-600"}`}>
                                  {fdarLabels[entry.fdarCategory]}
                                </span>
                              )}
                              {entry.entryType === "voice" && <span className="text-xs">🎤</span>}
                              <span className="text-[10px] text-slate-400 md:hidden ml-auto shrink-0">
                                {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className={`text-sm mt-2 leading-relaxed ${fdar ? fdar.text : "text-slate-700"}`}>
                              {entry.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Shift end marker */}
                    <div className="relative flex items-start gap-3 mt-4 pl-0">
                      <div className="relative z-10 w-10 flex justify-center">
                        <div className="w-3 h-3 rounded-full bg-slate-300 ring-4 ring-slate-50" />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-xs font-medium text-slate-400">Shift ended</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(historyShiftEntries[historyShiftEntries.length - 1].timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Rooms */}
              {historyShiftEntries && historyShiftEntries.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-600">Rooms</h3>
                  {Object.entries(historyShiftEntries.reduce((acc, entry) => {
                    if (!acc[entry.room]) acc[entry.room] = [];
                    acc[entry.room].push(entry);
                    return acc;
                  }, {} as Record<string, typeof historyShiftEntries>)).map(([room, roomEntries]) => (
                    <button
                      key={room}
                      onClick={() => openHistoryRoom(room)}
                      className="w-full text-left bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800">Room {room}</span>
                        <span className="text-xs text-slate-400">{roomEntries.length} entries →</span>
                      </div>
                    </button>
                  ))}
                </section>
              )}
            </>
          )}

          {/* History Room View */}
          {view === "history-room" && selectedHistoryRoom && historyRoomEntries && (
            <section className="space-y-2">
              {historyRoomEntries.sort((a, b) => a.timestamp - b.timestamp).map((entry) => (
                <div key={entry._id} className="bg-white rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start gap-2">
                    {entry.entryType === "voice" && (
                      <span className="text-xs text-blue-600">🎤</span>
                    )}
                    {entry.fdarCategory && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                        entry.fdarCategory === "focus"
                          ? "bg-amber-100 text-amber-700"
                          : entry.fdarCategory === "data"
                            ? "bg-blue-100 text-blue-700"
                            : entry.fdarCategory === "action"
                              ? "bg-green-100 text-green-700"
                              : "bg-purple-100 text-purple-700"
                      }`}>
                        {entry.fdarCategory.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{entry.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        {" · "}
                        {new Date(entry.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Settings View */}
          {view === "settings" && (
            <section className="space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-medium text-slate-600 mb-2">Profile</h3>
                <p className="text-sm text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-medium text-slate-600 mb-2">Plan</h3>
                <p className="text-sm text-slate-800 capitalize">{userSettings?.plan || "Free"}</p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-medium text-slate-600 mb-2">Voice Usage Today</h3>
                <p className="text-sm text-slate-800">{voiceUsed} / {voiceLimit} entries</p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-medium text-slate-600 mb-2">Past Shifts</h3>
                <p className="text-sm text-slate-800">{pastShifts?.length || 0} shifts recorded</p>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* End Shift Modal */}
      {showEndShift && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">Shift Summary</h2>
              <button
                onClick={() => { setShowEndShift(false); setShiftSummaryData(null); }}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {shiftSummaryData ? (
                <div className="space-y-4">
                  {/* Shift Info */}
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-800">
                      {formatShiftDate(shiftSummaryData.shiftDate)} — {shiftSummaryData.shiftType === "day" ? "Day Shift" : "Night Shift"}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs text-slate-500">
                      <span>{shiftSummaryData.roomCount} room{shiftSummaryData.roomCount !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{shiftSummaryData.totalEntries} entries</span>
                      <span>·</span>
                      <span>{shiftSummaryData.voiceCount} voice</span>
                    </div>
                  </div>

                  {/* Rooms */}
                  {shiftSummaryData.rooms.map((room: string) => {
                    const roomEntries = shiftSummaryData.entries.filter((e: any) => e.room === room);
                    return (
                      <div key={room} className="bg-white rounded-lg border border-slate-200">
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                          <span className="text-sm font-medium text-slate-800">Room {room}</span>
                          <span className="text-xs text-slate-400 ml-2">({roomEntries.length})</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {roomEntries.sort((a: any, b: any) => a.timestamp - b.timestamp).map((entry: any) => {
                            const fdarLabels: Record<string, string> = {
                              focus: "F",
                              data: "D",
                              action: "A",
                              response: "R",
                            };
                            return (
                              <div key={entry._id} className="px-3 py-2 flex items-start gap-2">
                                {entry.entryType === "voice" && (
                                  <span className="text-xs text-blue-600">🎤</span>
                                )}
                                {entry.fdarCategory && (
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                    entry.fdarCategory === "focus"
                                      ? "bg-amber-100 text-amber-700"
                                      : entry.fdarCategory === "data"
                                        ? "bg-blue-100 text-blue-700"
                                        : entry.fdarCategory === "action"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-purple-100 text-purple-700"
                                  }`}>
                                    {fdarLabels[entry.fdarCategory]}
                                  </span>
                                )}
                                <div className="flex-1">
                                  <p className="text-sm text-slate-700">{entry.description}</p>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">Loading shift summary...</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-2 shrink-0">
              <button
                onClick={() => { setShowEndShift(false); setShiftSummaryData(null); }}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowEndShift(false);
                  setShiftSummaryData(null);
                }}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function Home() {
  const user = useQuery(api.entries.me);

  if (user) {
    return <Dashboard />;
  }

  return <LandingPage />;
}