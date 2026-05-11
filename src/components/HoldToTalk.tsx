"use client";

import { useCallback, useRef, useState } from "react";
import { useAuthToken } from "@convex-dev/auth/react";

type RecordingState = "idle" | "recording" | "transcribing" | "done" | "error";

interface HoldToTalkProps {
  onTranscribed: (text: string) => Promise<void>;
  disabled?: boolean;
  limitReached?: boolean;
}

export default function HoldToTalk({
  onTranscribed,
  disabled,
  limitReached,
}: HoldToTalkProps) {
  const token = useAuthToken();
  const [state, setState] = useState<RecordingState>("idle");
  const [statusText, setStatusText] = useState("");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // Track whether we're currently holding to avoid ghost events
  const isHoldingRef = useRef(false);

  const startRecording = useCallback(async () => {
    if (disabled || limitReached || isHoldingRef.current) return;
    isHoldingRef.current = true;
    setErrorDetail(null);

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
          setState("error");
          setStatusText("No audio captured");
          setErrorDetail("Try speaking louder or closer to the microphone");
          isHoldingRef.current = false;
          setTimeout(() => {
            setState("idle");
            setStatusText("");
            setErrorDetail(null);
          }, 3000);
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

          const data = await res.json().catch(() => null);

          if (!res.ok) {
            // Extract user-friendly error from API response
            const apiError = data?.error || "Transcription failed";

            if (res.status === 401) {
              throw new Error("Please sign in to use voice entry");
            }
            if (res.status === 503) {
              throw new Error("Voice service is temporarily unavailable");
            }
            if (res.status === 413) {
              throw new Error("Recording too long — try a shorter message");
            }
            throw new Error(apiError);
          }

          const text = data?.text || "";

          if (text.trim()) {
            setState("done");
            setStatusText("Done!");
            setErrorDetail(null);
            await onTranscribed(text.trim());
          } else {
            setState("error");
            setStatusText("Nothing heard — try again");
            setErrorDetail("Try speaking louder or closer to the microphone");
          }
        } catch (err: unknown) {
          setState("error");
          const msg = err instanceof Error ? err.message : "Transcription failed";
          setStatusText(msg);
          // Only show detail for non-generic errors
          if (!msg.includes("Transcription failed") && !msg.includes("voice entry")) {
            setErrorDetail(null);
          }
        } finally {
          setTimeout(() => {
            setState("idle");
            setStatusText("");
            setErrorDetail(null);
            isHoldingRef.current = false;
          }, 1200);
        }
      };

      recorder.onerror = () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("error");
        setStatusText("Recording failed");
        setErrorDetail("Microphone may be in use by another app");
        isHoldingRef.current = false;
        setTimeout(() => {
          setState("idle");
          setStatusText("");
          setErrorDetail(null);
        }, 3000);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
      setStatusText("Listening...");
    } catch (err: unknown) {
      setState("error");
      const name = err instanceof DOMException ? err.name : "";
      setStatusText(
        name === "NotAllowedError"
          ? "Microphone access denied"
          : name === "NotFoundError"
            ? "No microphone found"
            : "Could not start recording"
      );
      setErrorDetail(
        name === "NotAllowedError"
          ? "Allow microphone access in your browser settings"
          : name === "NotFoundError"
            ? "Connect a microphone and try again"
            : null
      );
      isHoldingRef.current = false;
      setTimeout(() => {
        setState("idle");
        setStatusText("");
        setErrorDetail(null);
      }, 3000);
    }
  }, [disabled, limitReached, onTranscribed, token]);

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
  const isButtonDisabled = disabled || isWorking || limitReached;

  // Determine default status text when idle
  const idleText = limitReached
    ? "Daily voice limit reached"
    : disabled
      ? "Select a room first"
      : "Hold to speak";

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Status text */}
      <p
        className={`text-sm font-medium transition-all duration-200 ${state === "error"
            ? "text-red-500"
            : state === "done"
              ? "text-green-600"
              : state === "recording"
                ? "text-blue-600"
                : limitReached
                  ? "text-amber-600"
                  : "text-slate-400"
          }`}
      >
        {statusText || idleText}
      </p>

      {/* Error detail (sub-text below status) */}
      {errorDetail && (
        <p className="text-xs text-slate-500 text-center max-w-[200px]">
          {errorDetail}
        </p>
      )}

      {/* Limit reached CTA */}
      {limitReached && state === "idle" && (
        <p className="text-xs text-amber-500 font-medium">
          Upgrade for unlimited voice entries
        </p>
      )}

      {/* Main button */}
      <button
        id="hold-to-talk-btn"
        aria-label={limitReached ? "Voice limit reached" : "Hold to record voice entry"}
        aria-pressed={isActive}
        onPointerDown={(e) => {
          if (isButtonDisabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          startRecording();
        }}
        onPointerUp={stopRecording}
        onPointerCancel={stopRecording}
        disabled={isButtonDisabled}
        className={`
          relative w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-150 touch-none
          ${isButtonDisabled && !isActive
            ? limitReached
              ? "bg-amber-100 text-amber-400 cursor-not-allowed"
              : "bg-slate-100 text-slate-300 cursor-not-allowed"
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
                  : limitReached
                    ? "🔒"
                    : "🎤"}
        </span>
      </button>
    </div>
  );
}
