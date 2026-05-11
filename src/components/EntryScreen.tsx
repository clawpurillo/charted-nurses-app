"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import HoldToTalk from "./HoldToTalk";
import RoomPicker from "./RoomPicker";
import TemplateSearchPopup from "./TemplateSearchPopup";

export default function EntryScreen() {
  const userSettings = useQuery(api.entries.getUserSettings);
  const canUseVoice = useQuery(api.entries.canUseVoiceEntry);
  const addEntry = useMutation(api.entries.addEntry);
  const updateAssignedRooms = useMutation(api.entries.updateAssignedRooms);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateInsertion, setTemplateInsertion] = useState<string | null>(null);

  const textInputRef = useRef<HTMLInputElement>(null);

  // Set initial active room when settings load
  useEffect(() => {
    if (userSettings?.assignedRooms?.length && !activeRoom) {
      setActiveRoom(userSettings.assignedRooms[0]);
    }
  }, [userSettings?.assignedRooms, activeRoom]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (!errorMessage && !successMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
      setSuccessMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [errorMessage, successMessage]);

  // Handle template insertion
  useEffect(() => {
    if (templateInsertion) {
      const input = textInputRef.current;
      if (!input) return;

      const cursorPos = input.selectionStart ?? textInput.length;
      const beforeCursor = textInput.slice(0, cursorPos);
      const afterCursor = textInput.slice(cursorPos);

      const lastDot = beforeCursor.lastIndexOf(".");
      const triggerStart = lastDot >= 0 ? lastDot : cursorPos;

      const newText = textInput.slice(0, triggerStart) + templateInsertion + afterCursor;
      setTextInput(newText);
      setShowTemplatePopup(false);

      setTimeout(() => {
        input.focus();
        const newCursorPos = triggerStart + templateInsertion.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);

      setTemplateInsertion(null);
    }
  }, [templateInsertion, textInput]);

  const assignedRooms = userSettings?.assignedRooms || [];
  const workingRoom = activeRoom || (assignedRooms.length > 0 ? assignedRooms[0] : null);

  const handleSubmitText = async () => {
    if (!textInput.trim() || !workingRoom) return;
    try {
      await addEntry({
        room: workingRoom,
        description: textInput.trim(),
        entryType: "text",
      });
      setTextInput("");
      setErrorMessage(null);
      setSuccessMessage("Entry added");
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to add entry");
    }
  };

  const handleTranscribed = async (text: string) => {
    if (!workingRoom) {
      setErrorMessage("Please select a room first");
      return;
    }
    try {
      await addEntry({
        room: workingRoom,
        description: text,
        entryType: "voice",
      });
      setErrorMessage(null);
      setSuccessMessage("Voice entry added");
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to add voice entry");
    }
  };

  const handleTemplateTrigger = useCallback((query: string) => {
    setTemplateQuery(query);
    setShowTemplatePopup(true);
  }, []);

  const handleTemplateInsert = (content: string, _templateId: string) => {
    setTemplateInsertion(content);
    setShowTemplatePopup(false);
  };

  if (userSettings === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
        <p className="text-sm text-slate-400 mt-3">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 pt-safe-top shrink-0">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none mb-1">
              Quick Entry
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Voice or text nursing notes
            </p>
          </div>
          {canUseVoice === false && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-amber-100 text-amber-700">
              Voice limit reached
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {/* Error / Success Banner */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3 animate-in fade-in">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 flex-1">{errorMessage}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3 animate-in fade-in">
            <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-700 flex-1">{successMessage}</p>
          </div>
        )}

        {/* Room Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Room
            </span>
            <span className="text-xs text-slate-400">
              Next entry goes here
            </span>
          </div>
          <RoomPicker
            rooms={assignedRooms}
            activeRoom={workingRoom}
            onSelectRoom={setActiveRoom}
            onAddRoom={async (room: string) => {
              if (!assignedRooms.includes(room)) {
                const newRooms = [...assignedRooms, room];
                await updateAssignedRooms({ rooms: newRooms });
              }
            }}
          />
        </div>

        {/* Voice & Text Input */}
        <div className="flex gap-4 items-start">
          <div className="shrink-0">
            <HoldToTalk
              onTranscribed={handleTranscribed}
              disabled={!workingRoom || canUseVoice === false}
              limitReached={canUseVoice === false}
            />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <input
              ref={textInputRef}
              type="text"
              value={textInput}
              onChange={(e) => {
                const newValue = e.target.value;
                setTextInput(newValue);

                // Detect "." trigger for template popup
                if (!showTemplatePopup) {
                  const cursorPos = e.target.selectionStart ?? newValue.length;
                  if (cursorPos > 0) {
                    const charBefore = newValue[cursorPos - 1];
                    const charBeforeThat = cursorPos > 1 ? newValue[cursorPos - 2] : " ";
                    if (charBefore === "." && (charBeforeThat === " " || charBeforeThat === "\n" || cursorPos === 1)) {
                      const query = newValue.slice(cursorPos).trim();
                      handleTemplateTrigger(query);
                    }
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitText();
              }}
              disabled={!workingRoom}
              placeholder={workingRoom ? "Type nursing note..." : "Pick a room first"}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition disabled:opacity-50"
              aria-label="Entry text"
            />
            <button
              onClick={handleSubmitText}
              disabled={!textInput.trim() || !workingRoom}
              className="w-full py-3 bg-slate-900 text-white font-semibold text-sm rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[48px]"
              aria-label="Add entry"
            >
              Add Entry
            </button>
          </div>
        </div>

        {/* Quick help text */}
        <div className="text-xs text-slate-400 text-center pt-2">
          <p>Hold the mic to record voice, or type a note above.</p>
          <p className="mt-1">Type <span className="font-mono bg-slate-100 px-1 rounded">.</span> followed by a space to search templates.</p>
        </div>
      </div>

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
    </div>
  );
}
