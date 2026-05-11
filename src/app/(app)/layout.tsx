"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery, useConvexConnectionState } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

import LandingPage from "../LandingPage";
import ShiftSetup from "../../components/ShiftSetup";
import EndShiftModal from "../../components/EndShiftModal";
import BottomNav, { type TabId } from "../../components/BottomNav";
import CarryForwardPrompt from "../../components/CarryForwardPrompt";
import QuickEntrySheet from "../../components/QuickEntrySheet";
import TemplateSearchPopup from "../../components/TemplateSearchPopup";
import RoomTimelineSheet from "../../components/RoomTimelineSheet";
import { AppProvider } from "../../contexts/AppContext";

const TABS: TabId[] = ["rooms", "history", "entry", "summary", "settings"];

function isValidTab(path: string): path is `/${TabId}` {
  return TABS.some((t) => `/${t}` === path);
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const connState = useConvexConnectionState();
  const user = useQuery(api.entries.me);
  const userSettings = useQuery(api.entries.getUserSettings);
  const entries = useQuery(api.entries.getTodayEntries);
  const canUseVoice = useQuery(api.entries.canUseVoiceEntry);
  const roomsOverview = useQuery(api.entries.getRoomsOverview);

  const addEntry = useMutation(api.entries.addEntry);
  const deleteEntry = useMutation(api.entries.deleteEntry);
  const initializeSettings = useMutation(api.entries.initializeUserSettings);
  const seedTemplates = useMutation(api.templates.seedDefaultTemplates);
  const startShift = useMutation(api.entries.startShift);
  const updateRooms = useMutation(api.entries.updateAssignedRooms);

  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [showEndShift, setShowEndShift] = useState(false);
  const [showCarryForward, setShowCarryForward] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Template search popup state
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateInsertion, setTemplateInsertion] = useState<string | null>(null);

  // Room timeline sheet state
  const [timelineRoom, setTimelineRoom] = useState<string | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Quick entry sheet state
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);

  // Derived activeTab from pathname
  const activeTab: TabId = isValidTab(pathname) ? (pathname.slice(1) as TabId) : "rooms";

  // Navigation handler
  const handleNavigate = useCallback(
    (tab: TabId) => {
      router.push(`/${tab}`);
    },
    [router],
  );

  // Clear error after 5 seconds
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  // Initialize settings if empty, then seed default templates
  useEffect(() => {
    if (user && userSettings === null) {
      initializeSettings().then(() => {
        seedTemplates();
      });
    }
  }, [user, userSettings, initializeSettings, seedTemplates]);

  // Sync active room when settings load or change
  useEffect(() => {
    if (userSettings?.assignedRooms?.length && !activeRoom) {
      setActiveRoom(userSettings.assignedRooms[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSettings?.assignedRooms]);

  // Redirect to /rooms if on unknown path
  useEffect(() => {
    if (pathname !== "/" && !isValidTab(pathname)) {
      router.replace("/rooms");
    }
  }, [pathname, router]);

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

  // Loading / connection state
  if (userSettings === undefined) {
    if (!connState.isWebSocketConnected && connState.connectionRetries > 3) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Connection issue</h2>
            <p className="text-sm text-slate-600 mb-4">
              Unable to reach the server. Please check your internet connection.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="flex items-center gap-3">
          <svg className="animate-spin w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          </svg>
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (userSettings === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="flex items-center gap-3">
          <svg className="animate-spin w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          </svg>
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  const handleStartShift = async (rooms: string[]) => {
    await startShift({ rooms, shiftDate, shiftType });
    setShowCarryForward(true);
  };

  if (needsSetup) {
    return (
      <ShiftSetup
        userName={user?.name || ""}
        shiftLabel={shiftLabel}
        shiftDate={shiftDate}
        onStart={handleStartShift}
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

  const handleRoomCardTap = (room: string) => {
    setTimelineRoom(room);
    setIsTimelineOpen(true);
  };

  const handleAddTextEntry = async (text: string) => {
    if (!text.trim() || !activeRoom) return;
    try {
      await addEntry({
        room: activeRoom,
        description: text.trim(),
        entryType: "text",
      });
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to add entry");
    }
  };

  const handleTranscribed = async (text: string) => {
    if (!activeRoom) {
      setErrorMessage("Please select a room first");
      return;
    }
    try {
      await addEntry({
        room: activeRoom,
        description: text,
        entryType: "voice",
      });
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to add voice entry");
    }
  };

  const handleCarryForward = async (entryList: Array<{ room: string; description: string }>) => {
    for (const entry of entryList) {
      await addEntry({
        room: entry.room,
        description: entry.description,
        entryType: "text",
        isCarriedForward: true,
      });
    }
    setShowCarryForward(false);
  };

  const handleSkipCarryForward = () => {
    setShowCarryForward(false);
  };

  const handleTemplateInsert = (content: string, _templateId: string) => {
    setTemplateInsertion(content);
    setShowTemplatePopup(false);
  };

  // Only show rooms-specific UI (FAB, header, room grid) on the rooms page
  const isRoomsPage = activeTab === "rooms";

  const contextValue = {
    activeRoom,
    setActiveRoom,
    onOpenRoomTimeline: handleRoomCardTap,
    onAddRoom: handleAddRoom,
    onAddTextEntry: handleAddTextEntry,
    onTranscribed: handleTranscribed,
    canUseVoice: canUseVoice ?? false,
    assignedRooms,
    errorMessage,
    setErrorMessage,
  };

  return (
    <AppProvider value={contextValue}>
      <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
        {/* Header — only on rooms tab */}
        {isRoomsPage && (
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
        )}

        {/* Page content */}
        <div className={`flex-1 overflow-y-auto ${isRoomsPage ? "" : "pb-16"}`}>
          {children}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="fixed top-16 left-4 right-4 z-50 bg-red-50 border border-red-200 rounded-xl px-4 py-3 shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 flex-1">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-600 shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* FAB: Quick Entry (only on Rooms tab) */}
        {isRoomsPage && (
          <button
            onClick={() => setIsQuickEntryOpen(true)}
            className="absolute bottom-20 right-5 w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/30 hover:bg-slate-800 active:scale-95 transition z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            aria-label="Quick voice entry"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        )}

        {/* Quick Entry Bottom Sheet */}
        <QuickEntrySheet
          isOpen={isQuickEntryOpen}
          onClose={() => setIsQuickEntryOpen(false)}
          assignedRooms={assignedRooms}
          activeRoom={activeRoom}
          onSetActiveRoom={setActiveRoom}
          onAddRoom={handleAddRoom}
          onEntryAdded={() => {}}
          canUseVoice={canUseVoice}
          onAddTextEntry={handleAddTextEntry}
          onTranscribed={handleTranscribed}
          onTemplateTrigger={(query) => {
            setTemplateQuery(query);
            setShowTemplatePopup(true);
          }}
          onTemplateClose={() => {
            setShowTemplatePopup(false);
          }}
          templateInsertion={templateInsertion ?? undefined}
          onTemplateInsertDone={() => {
            setTemplateInsertion(null);
          }}
        />

        {/* Template Search Popup */}
        {showTemplatePopup && (
          <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setShowTemplatePopup(false)}>
            <div className="absolute inset-0 bg-black/30 animate-in fade-in" />
            <div
              className="relative w-full bg-white rounded-t-2xl shadow-xl animate-in slide-in-from-bottom max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Template search"
            >
              <TemplateSearchPopup
                onInsert={handleTemplateInsert}
                onClose={() => setShowTemplatePopup(false)}
                initialQuery={templateQuery}
              />
            </div>
          </div>
        )}

        {/* Room Timeline Bottom Sheet */}
        {timelineRoom && (
          <RoomTimelineSheet
            room={timelineRoom}
            isOpen={isTimelineOpen}
            onClose={() => setIsTimelineOpen(false)}
            onDeleteEntry={async (id) => {
              try {
                await deleteEntry({ entryId: id as import("../../../convex/_generated/dataModel").Id<"entries"> });
              } catch (err: unknown) {
                setErrorMessage((err as Error).message || "Failed to delete entry");
              }
            }}
          />
        )}

        {/* Modals */}
        {showEndShift && entries && (
          <EndShiftModal
            entries={entries}
            shiftDate={shiftDate}
            shiftType={shiftType}
            onClose={() => setShowEndShift(false)}
          />
        )}

        {/* Carry Forward Prompt */}
        {showCarryForward && (
          <CarryForwardPrompt
            rooms={assignedRooms}
            onCarryForward={handleCarryForward}
            onSkip={handleSkipCarryForward}
          />
        )}

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 z-50">
          <BottomNav activeTab={activeTab} onTabChange={handleNavigate} />
        </div>
      </div>
    </AppProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.entries.me);

  if (user === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="flex items-center gap-3">
          <svg className="animate-spin w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          </svg>
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <AppLayoutInner>{children}</AppLayoutInner>;
}
