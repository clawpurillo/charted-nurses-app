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

  // Connected and healthy -- render nothing
  if (connState.isWebSocketConnected) {
    return null;
  }

  // Never connected yet (initial load) -- don't show anything, let useQuery handle loading
  if (!connState.hasEverConnected && connState.connectionRetries === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[100] px-4 py-2 shadow-sm ${
        showReload
          ? "bg-danger/10 border-b border-danger/20"
          : "bg-warning/10 border-b border-warning/20"
      }`}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              showReload
                ? "bg-danger animate-pulse"
                : "bg-warning animate-pulse"
            }`}
          />
          <p className={`text-sm font-medium ${
            showReload ? "text-danger/90" : "text-warning/90"
          }`}>
            {showReload
              ? "Connection lost. Please check your network."
              : "Reconnecting to server..."}
          </p>
        </div>
        {showReload && (
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-danger text-white text-xs font-semibold rounded-md hover:bg-danger/90 transition shrink-0 min-h-[36px]"
          >
            Reload Page
          </button>
        )}
      </div>
    </div>
  );
}
