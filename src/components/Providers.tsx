"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import ErrorBoundary from "./ErrorBoundary";
import ConvexConnectionStatus from "./ConvexConnectionStatus";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  // Enable verbose logging in development to help diagnose connection issues
  verbose: process.env.NODE_ENV === "development",
});

export default function Providers({ children }: { children: ReactNode }) {
  // ConvexAuthProvider internally wraps children with ConvexProviderWithAuth,
  // so a separate ConvexProvider wrapper is redundant and causes context conflicts.
  return (
    <ErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <ConvexConnectionStatus />
        {children}
      </ConvexAuthProvider>
    </ErrorBoundary>
  );
}
