# Charted — Nursing Shift Charting

Quick, room-based nursing shift documentation. No patient details stored — just room numbers and actions.

## Stack
- **Frontend:** Next.js 15 (App Router) + React
- **Backend:** Convex
- **Auth:** Clerk
- **Styling:** Tailwind CSS + shadcn/ui

## Setup

### 1. Environment Variables

Add these to `.env.local`:

```bash
# Clerk (from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex (already set by `npx convex init`)
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
CONVEX_DEPLOYMENT=...
```

### 2. Clerk Setup

1. Create a Clerk app at https://dashboard.clerk.com
2. Enable email/password and/or Google sign-in
3. Copy the API keys to `.env.local`

### 3. Run locally

```bash
# Terminal 1: Convex backend
npx convex dev

# Terminal 2: Next.js frontend
npm run dev
```

Open http://localhost:3000

## Features (Phase 1 MVP)
- ✅ Clerk auth
- ✅ Quick entry: "Room 101, inserted IV on left cephalic vein"
- ✅ Auto-detects room number from input
- ✅ Day/Night shift toggle
- ✅ Live timeline grouped by room
- ✅ End shift summary with handover notes
- ✅ Shift history

## Convex Schema
```
users: clerkId, name, credentials
entries: userId, room, description, timestamp, shiftDate, shiftType
shift_summaries: userId, shiftDate, shiftType, entryCount, roomCount, handoverNotes, endedAt
```

## Deploy

### Convex
```bash
npx convex deploy
```

### Netlify
Connect repo to Netlify. Set env vars in Netlify dashboard.
See `netlify.toml` for build config.
# deploy test
