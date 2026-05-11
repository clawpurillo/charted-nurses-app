"use client";

import { useConvexConnectionState } from "convex/react";
import { useEffect, useState } from "react";

/**
 * Connection status banner that appears when Convex is disconnected or reconnecting.
 * Uses useConvexConnectionState to monitor WebSocket connectivity.
 *
 * Renders nothing when connected normally.
 * Shows a "Reconnecting..." banner when the WebSocket is down.
 * Shows a "Connection lost" banner with a reload button if retries exceed a threshold.
 */
export default function ConvexConnectionStatus() {
  const connState = useConvexConnectionState();
  const [showReload, setShowReload] = useState(false);

  // After multiple retries without success, offer a full page reload
  useEffect(() => {
    if (
      !connState.isWebSocketConnected &&
      connState.connectionRetries > 5 &&
      connState.hasEverConnected
    ) {
      setShowReload(true);
    }
  }, [connState.isWebSocketConnected, connState.connectionRetries, connState.hasEverConnected]);

  // Connected and healthy — render nothing
  if (connState.isWebSocketConnected) {
    return null;
  }

  // Never connected yet (initial load) — don't show anything, let useQuery handle loading
  if (!connState.hasEverConnected && connState.connectionRetries === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[100] bg-amber-50 border-b border-amber-200 px-4 py-2 shadow-sm"
    >
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Spinner icon */}
          <svg
            className={`w-4 h-4 text-amber-600 ${showReload ? "" : "animate-spin"}`}
            fill="none"
            viewBox="0 0 24 24"
          >
            {showReload ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            ) : (
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
            )}
          </svg>
          <p className="text-sm font-medium text-amber-800">
            {showReload
              ? "Connection lost. Please check your network."
              : "Reconnecting to server..."}
          </p>
        </div>
        {showReload && (
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded-md hover:bg-amber-700 transition shrink-0"
          >
            Reload Page
          </button>
        )}
      </div>
    </div>
  );
}
