"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, ConvexProvider } from "convex/react";
import { ReactNode } from "react";
import ErrorBoundary from "./ErrorBoundary";
import ConvexConnectionStatus from "./ConvexConnectionStatus";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  // Enable verbose logging in development to help diagnose connection issues
  verbose: process.env.NODE_ENV === "development",
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <ConvexAuthProvider client={convex}>
          <ConvexConnectionStatus />
          {children}
        </ConvexAuthProvider>
      </ConvexProvider>
    </ErrorBoundary>
  );
}
