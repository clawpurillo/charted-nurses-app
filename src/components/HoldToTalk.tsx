"use client";

import { useCallback, useRef, useState } from "react";
import { useAuthToken } from "@convex-dev/auth/react";

type RecordingState = "idle" | "recording" | "transcribing" | "done" | "error";

interface HoldToTalkProps {
  onTranscribed: (text: string) => Promise<void>;
  disabled?: boolean;
}

export default function HoldToTalk({ onTranscribed, disabled }: HoldToTalkProps) {
  const token = useAuthToken();
  const [state, setState] = useState<RecordingState>("idle");
  const [statusText, setStatusText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // Track whether we're currently holding to avoid ghost events
  const isHoldingRef = useRef(false);

  const startRecording = useCallback(async () => {
    if (disabled || isHoldingRef.current) return;
    isHoldingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick best supported mime
      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"].find(
          (m) => MediaRecorder.isTypeSupported(m)
        ) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          setState("idle");
          isHoldingRef.current = false;
          return;
        }

        setState("transcribing");
        setStatusText("Transcribing...");

        try {
          const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers,
            body: blob,
          });

          if (!res.ok) throw new Error("Transcription failed");

          const { text } = await res.json();

          if (text?.trim()) {
            setState("done");
            setStatusText("Done!");
            await onTranscribed(text.trim());
          } else {
            setState("error");
            setStatusText("Nothing heard — try again");
          }
        } catch (err: unknown) {
          setState("error");
          setStatusText((err as Error).message ?? "Transcription failed");
        } finally {
          setTimeout(() => {
            setState("idle");
            setStatusText("");
            isHoldingRef.current = false;
          }, 1200);
        }
      };

      recorder.onerror = () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("error");
        setStatusText("Recording failed");
        isHoldingRef.current = false;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
      setStatusText("Listening...");
    } catch (err: unknown) {
      setState("error");
      setStatusText(
        (err as Error).name === "NotAllowedError"
          ? "Microphone access denied"
          : "Could not start recording"
      );
      isHoldingRef.current = false;
      setTimeout(() => {
        setState("idle");
        setStatusText("");
      }, 2000);
    }
  }, [disabled, onTranscribed, token]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  const isActive = state === "recording";
  const isWorking = state === "transcribing";

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Status text */}
      <p
        className={`text-sm font-medium transition-all duration-200 ${
          state === "error"
            ? "text-red-500"
            : state === "done"
            ? "text-green-600"
            : state === "recording"
            ? "text-blue-600"
            : "text-slate-400"
        }`}
      >
        {statusText || (disabled ? "Select a room first" : "Hold to speak")}
      </p>

      {/* Main button */}
      <button
        id="hold-to-talk-btn"
        aria-label="Hold to record voice entry"
        aria-pressed={isActive}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          startRecording();
        }}
        onPointerUp={stopRecording}
        onPointerCancel={stopRecording}
        disabled={disabled || isWorking}
        className={`
          relative w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-150 touch-none
          ${
            disabled || isWorking
              ? "bg-slate-100 text-slate-300 cursor-not-allowed"
              : isActive
              ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-200"
              : state === "done"
              ? "bg-green-500 text-white"
              : state === "error"
              ? "bg-red-100 text-red-500"
              : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
          }
        `}
      >
        {/* Pulse ring when recording */}
        {isActive && (
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
        )}

        {/* Icon */}
        <span className="relative text-3xl">
          {isWorking
            ? "⏳"
            : isActive
            ? "⏹"
            : state === "done"
            ? "✓"
            : state === "error"
            ? "⚠"
            : "🎤"}
        </span>
      </button>
    </div>
  );
}
