"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import HoldToTalk from "./HoldToTalk";
import RoomPicker from "./RoomPicker";

interface QuickEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  assignedRooms: string[];
  activeRoom: string | null;
  onSetActiveRoom: (room: string) => void;
  onAddRoom: (room: string) => void;
  onEntryAdded: () => void;
  canUseVoice: boolean | undefined;
  /** Called when user submits text entry. */
  onAddTextEntry: (text: string) => void;
  /** Called when voice transcription completes. */
  onTranscribed: (text: string) => void;
  /** Called when user types "." trigger in text input. */
  onTemplateTrigger?: (query: string) => void;
  /** Whether the template popup is currently open (prevents re-triggering). */
  isTemplatePopupOpen?: boolean;
  /** Called when template popup is closed (Escape or backdrop click). */
  onTemplateClose?: () => void;
  /** Template content to insert into the text input (from parent's TemplateSearchPopup). */
  templateInsertion?: string;
  /** Called after template insertion is processed (resets the insertion state). */
  onTemplateInsertDone?: () => void;
}

export default function QuickEntrySheet({
  isOpen,
  onClose,
  assignedRooms,
  activeRoom,
  onSetActiveRoom,
  onAddRoom,
  onEntryAdded,
  canUseVoice,
  onAddTextEntry,
  onTranscribed,
  onTemplateTrigger,
  isTemplatePopupOpen = false,
  onTemplateClose,
  templateInsertion,
  onTemplateInsertDone,
}: QuickEntrySheetProps) {
  const [textInput, setTextInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Clear error after 5 seconds
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  // Reset text input when sheet opens
  useEffect(() => {
    if (isOpen) {
      setTextInput("");
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Handle template insertion from parent
  useEffect(() => {
    if (templateInsertion) {
      const input = textInputRef.current;
      if (!input) return;

      const cursorPos = input.selectionStart ?? textInput.length;
      const beforeCursor = textInput.slice(0, cursorPos);
      const afterCursor = textInput.slice(cursorPos);

      // Find the start of the trigger (last "." before cursor)
      const lastDot = beforeCursor.lastIndexOf(".");
      const triggerStart = lastDot >= 0 ? lastDot : cursorPos;

      const newText = textInput.slice(0, triggerStart) + templateInsertion + afterCursor;
      setTextInput(newText);
      onTemplateClose?.();

      // Restore focus and cursor position
      setTimeout(() => {
        input.focus();
        const newCursorPos = triggerStart + templateInsertion.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);

      onTemplateInsertDone?.();
    }
  }, [templateInsertion, onTemplateClose, onTemplateInsertDone, textInput]);

  const workingRoom = activeRoom || (assignedRooms.length > 0 ? assignedRooms[0] : null);

  const handleSubmitText = async () => {
    if (!textInput.trim() || !workingRoom) return;
    await onAddTextEntry(textInput);
    setTextInput("");
    setErrorMessage(null);
    onEntryAdded();
  };

  const handleTranscribedLocal = async (text: string) => {
    await onTranscribed(text);
    setErrorMessage(null);
    onEntryAdded();
  };

  // Swipe down to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-swipe]")) return;
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = startYRef.current;
    isDraggingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 120) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "translateY(0)";
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Quick entry"
    >
      <div
        ref={sheetRef}
        className="w-full max-w-lg bg-white dark:bg-surface rounded-t-3xl shadow-2xl transition-transform duration-200 ease-out will-change-transform"
        style={{ maxHeight: "85vh" }}
      >
        {/* Sheet header / drag handle */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-700">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto" />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition min-w-[48px] min-h-[48px]"
            aria-label="Close quick entry"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto" data-no-swipe>
          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-300 flex-1">{errorMessage}</p>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 shrink-0 min-w-[48px] min-h-[48px] flex items-center justify-center">
                ✕
              </button>
            </div>
          )}

          {/* Room Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Room
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Next entry goes here
              </span>
            </div>
            <RoomPicker
              rooms={assignedRooms}
              activeRoom={workingRoom}
              onSelectRoom={onSetActiveRoom}
              onAddRoom={onAddRoom}
            />
          </div>

          {/* Voice & Text Input */}
          <div className="flex gap-4 items-center">
            <div className="shrink-0">
              <HoldToTalk
                onTranscribed={handleTranscribedLocal}
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

                  // Detect "." trigger: open template popup when user types "."
                  if (!isTemplatePopupOpen && onTemplateTrigger) {
                    const cursorPos = e.target.selectionStart ?? newValue.length;
                    if (cursorPos > 0) {
                      const charBefore = newValue[cursorPos - 1];
                      const charBeforeThat = cursorPos > 1 ? newValue[cursorPos - 2] : " ";
                      if (charBefore === "." && (charBeforeThat === " " || charBeforeThat === "\n" || cursorPos === 1)) {
                        const query = newValue.slice(cursorPos).trim();
                        onTemplateTrigger(query);
                      }
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitText();
                }}
                disabled={!workingRoom}
                placeholder={workingRoom ? "Or type action..." : "Pick room first"}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-text-primary dark:text-white focus:outline-none focus:border-brand focus:bg-white dark:focus:bg-slate-700 transition disabled:opacity-50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button
                onClick={handleSubmitText}
                disabled={!textInput.trim() || !workingRoom}
                className="w-full py-3 bg-slate-900 dark:bg-brand text-white font-semibold text-sm rounded-xl hover:bg-slate-800 dark:hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[48px]"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>

        {/* Safe area bottom padding */}
        <div className="pb-safe-bottom" />
      </div>
    </div>
  );
}
