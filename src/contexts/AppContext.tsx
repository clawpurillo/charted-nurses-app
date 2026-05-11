"use client";

import { createContext, useContext, useCallback } from "react";

interface AppContextType {
  activeRoom: string | null;
  setActiveRoom: (room: string) => void;
  onOpenRoomTimeline: (room: string) => void;
  onAddRoom: (room: string) => Promise<void>;
  onAddTextEntry: (text: string) => Promise<void>;
  onTranscribed: (text: string) => Promise<void>;
  canUseVoice: boolean | undefined;
  assignedRooms: string[];
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children, value }: { children: React.ReactNode; value: AppContextType }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return ctx;
}
