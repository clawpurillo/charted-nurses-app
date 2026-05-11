import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Default Templates for Seeding ───────────────────────

const DEFAULT_SEED_TEMPLATES = [
  {
    name: "Vitals",
    trigger: ".vitals",
    content: "BP: / , HR: , RR: , SpO2: %, Temp: °C, Pain: /10",
    category: "assessment",
  },
  {
    name: "Pain Scale",
    trigger: ".pain",
    content: "Pain score: /10. Location: . Character: . Interventions: . Response: ",
    category: "assessment",
  },
  {
    name: "I&O",
    trigger: ".io",
    content: "Intake: IV mL, PO mL. Output: Urine mL, Drain mL, Emesis mL. Net: mL",
    category: "monitoring",
  },
  {
    name: "Med Given",
    trigger: ".med",
    content: "Medication: , Dose: , Route: , Time: , Indication: , Patient response: ",
    category: "medication",
  },
  {
    name: "Wound Check",
    trigger: ".wound",
    content: "Location: . Size: cm. Appearance: . Drainage: . Dressing: . Next change: ",
    category: "assessment",
  },
  {
    name: "Neuro Check",
    trigger: ".neuro",
    content: "LOC: . Orientation: x4. Pupils: PERRL / unequal. Motor: L: R: . Sensation: intact/impaired. GCS: ",
    category: "assessment",
  },
];

/**
 * Seed default templates for a new user. Idempotent — only inserts
 * if the user has no templates yet. Mirrors convex/templates.ts
 * seedDefaultTemplates to keep this a single-file change.
 */
async function seedDefaultTemplates(ctx: any, userId: any) {
  const existing = await ctx.db
    .query("templates")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (existing) return { seeded: 0 };

  const now = Date.now();
  const ids: string[] = [];
  for (const t of DEFAULT_SEED_TEMPLATES) {
    const id = await ctx.db.insert("templates", {
      userId,
      name: t.name,
      trigger: t.trigger,
      content: t.content,
      category: t.category,
      usageCount: 0,
      createdAt: now,
    });
    ids.push(id);
  }
  return { seeded: ids.length, templateIds: ids };
}

// ─── Current User ────────────────────────────────────────

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

// ─── User Settings (Subscription) ─────────────────────────

export const getUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Default to free plan if no settings exist
    if (!settings) {
      return null;
    }

    // Check if we need to reset daily counter
    const today = new Date().toLocaleDateString("en-CA");
    if (settings.lastResetDate !== today) {
      return { 
        ...settings, 
        voiceEntriesUsedToday: 0, 
        lastResetDate: today 
      };
    }

    return settings;
  },
});

export const initializeUserSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) return existing;

    const today = new Date().toLocaleDateString("en-CA");
    const settingsId = await ctx.db.insert("userSettings", {
      userId,
      plan: "free",
      voiceEntriesUsedToday: 0,
      lastResetDate: today,
    });

    // Seed default templates for new user
    await seedDefaultTemplates(ctx, userId);

    return settingsId;
  },
});

export const startShift = mutation({
  args: {
    rooms: v.array(v.string()),
    shiftDate: v.string(),
    shiftType: v.union(v.literal("day"), v.literal("night")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const rooms = args.rooms
      .map((r) => r.trim().toUpperCase())
      .filter((r) => r.length > 0);

    if (existing) {
      await ctx.db.patch(existing._id, {
        assignedRooms: rooms,
        currentShiftDate: args.shiftDate,
        currentShiftType: args.shiftType,
      });
      return { shiftDate: args.shiftDate, shiftType: args.shiftType, rooms };
    }

    await ctx.db.insert("userSettings", {
      userId,
      plan: "free",
      voiceEntriesUsedToday: 0,
      lastResetDate: args.shiftDate,
      assignedRooms: rooms,
      currentShiftDate: args.shiftDate,
      currentShiftType: args.shiftType,
    });

    return { shiftDate: args.shiftDate, shiftType: args.shiftType, rooms };
  },
});

export const updateAssignedRooms = mutation({
  args: { rooms: v.array(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const rooms = args.rooms
      .map((r) => r.trim().toUpperCase())
      .filter((r) => r.length > 0);

    if (settings) {
      await ctx.db.patch(settings._id, { assignedRooms: rooms });
    }
    return rooms;
  },
});

// Voice entry limits per plan
const VOICE_LIMITS = {
  free: 5,
  basic: 15,
  pro: Infinity,
};

export const canUseVoiceEntry = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!settings) return true; // New user, allow first entry

    const plan = settings.plan || "free";
    const limit = VOICE_LIMITS[plan];

    if (limit === Infinity) return true;

    // Check if we need to reset daily counter
    const today = new Date().toLocaleDateString("en-CA");
    const usedToday = settings.lastResetDate === today 
      ? settings.voiceEntriesUsedToday || 0 
      : 0;

    return usedToday < limit;
  },
});

// Removed: Plan changes must be tied to payment verification (Stripe/webhook)
// Self-upgrading bypasses business logic and pricing tiers.
// export const updateUserPlan = mutation({
//   args: { plan: v.union(v.literal("free"), v.literal("basic"), v.literal("pro")) },
//   handler: async (ctx, args) => { ... }
// });

export const incrementVoiceCount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      throw new Error("User settings not initialized");
    }

    const today = new Date().toLocaleDateString("en-CA");
    const currentCount = settings.lastResetDate === today 
      ? (settings.voiceEntriesUsedToday || 0) 
      : 0;

    await ctx.db.patch(settings._id, {
      voiceEntriesUsedToday: currentCount + 1,
      lastResetDate: today,
    });
  },
});

// ─── Entries ─────────────────────────────────────────────

export const addEntry = mutation({
  args: {
    room: v.string(),
    description: v.string(),
    entryType: v.optional(v.union(v.literal("text"), v.literal("voice"))),
    fdarCategory: v.optional(v.union(v.literal("focus"), v.literal("data"), v.literal("action"), v.literal("response"))),
    isCarriedForward: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check voice limit if voice entry
    if (args.entryType === "voice") {
      const settings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (settings) {
        const plan = settings.plan || "free";
        const limit = VOICE_LIMITS[plan];

        if (limit !== Infinity) {
          const today = new Date().toLocaleDateString("en-CA");
          const usedToday = settings.lastResetDate === today 
            ? (settings.voiceEntriesUsedToday || 0) 
            : 0;

          if (usedToday >= limit) {
            throw new Error(`Voice entry limit reached (${limit}/day for ${plan} plan)`);
          }

          // Increment count
          await ctx.db.patch(settings._id, {
            voiceEntriesUsedToday: usedToday + 1,
            lastResetDate: today,
          });
        }
      }
    }

    const now = Date.now();
    const hour = new Date(now).getHours();
    const shiftType: "day" | "night" = hour >= 7 && hour < 19 ? "day" : "night";
    const shiftDate =
      shiftType === "night" && hour < 7
        ? new Date(now - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA")
        : new Date(now).toLocaleDateString("en-CA");

    return await ctx.db.insert("entries", {
      userId,
      room: args.room,
      description: args.description,
      entryType: args.entryType || "text",
      fdarCategory: args.fdarCategory,
      timestamp: now,
      shiftDate,
      shiftType,
      isCarriedForward: args.isCarriedForward || false,
    });
  },
});

export const getTodayEntries = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const now = Date.now();
    const hour = new Date(now).getHours();
    const shiftType: "day" | "night" = hour >= 7 && hour < 19 ? "day" : "night";
    const shiftDate =
      shiftType === "night" && hour < 7
        ? new Date(now - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA")
        : new Date(now).toLocaleDateString("en-CA");

    return await ctx.db
      .query("entries")
      .withIndex("by_user_and_shiftDate", (q) =>
        q.eq("userId", userId).eq("shiftDate", shiftDate)
      )
      .order("asc")
      .collect();
  },
});

export const getEntriesByRoom = query({
  args: { room: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("entries")
      .withIndex("by_user_and_room", (q) =>
        q.eq("userId", userId).eq("room", args.room)
      )
      .order("asc")
      .collect();
  },
});

export const getTimelineEntries = query({
  args: {
    room: v.string(),
    shiftDate: v.string(),
    shiftType: v.union(v.literal("day"), v.literal("night")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("entries")
      .withIndex("by_user_and_shiftDate", (q) =>
        q.eq("userId", userId).eq("shiftDate", args.shiftDate)
      )
      .order("asc")
      .collect()
      .then((entries) =>
        entries.filter(
          (e) => e.room === args.room && e.shiftType === args.shiftType
        )
      );
  },
});

export const getPastEntries = query({
  args: { shiftDate: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("entries")
      .withIndex("by_user_and_shiftDate", (q) =>
        q.eq("userId", userId).eq("shiftDate", args.shiftDate)
      )
      .order("asc")
      .collect();
  },
});

// ─── Room Dashboard Overview ─────────────────────────────

export type RoomStatus = "ok" | "warning" | "critical" | "neutral";

export interface SparklineDot {
  timestamp: number;
  status: RoomStatus;
}

export interface RoomOverview {
  room: string;
  entryCount: number;
  lastEntryTime: number | null;
  status: RoomStatus;
  lastEntryLabel: string;
  sparkline: SparklineDot[];
}

export const getRoomsOverview = query({
  args: {},
  handler: async (ctx): Promise<RoomOverview[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const now = Date.now();
    const hour = new Date(now).getHours();
    const shiftType: "day" | "night" = hour >= 7 && hour < 19 ? "day" : "night";
    const shiftDate =
      shiftType === "night" && hour < 7
        ? new Date(now - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA")
        : new Date(now).toLocaleDateString("en-CA");

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const assignedRooms = settings?.assignedRooms ?? [];

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_and_shiftDate", (q) =>
        q.eq("userId", userId).eq("shiftDate", shiftDate)
      )
      .order("asc")
      .collect();

    // Group entries by room
    const roomEntries = new Map<string, typeof entries>();
    for (const room of assignedRooms) {
      roomEntries.set(room, []);
    }
    for (const entry of entries) {
      const arr = roomEntries.get(entry.room);
      if (arr) {
        arr.push(entry);
      } else {
        roomEntries.set(entry.room, [entry]);
      }
    }

    // Compute per-room overview
    const result: RoomOverview[] = [];
    for (const [room, roomEnts] of roomEntries) {
      const entryCount = roomEnts.length;
      const lastEntryTime =
        entryCount > 0
          ? Math.max(...roomEnts.map((e) => e.timestamp))
          : null;

      // Compute status based on time-since-last-entry
      let status: RoomStatus = "neutral";
      if (entryCount > 0 && lastEntryTime) {
        const hoursSinceLastEntry = (now - lastEntryTime) / (60 * 60 * 1000);
        if (hoursSinceLastEntry < 2) status = "ok";
        else if (hoursSinceLastEntry < 4) status = "warning";
        else status = "critical";

        // Upgrade status if any entry is flagged warning/critical
        const hasFlagged = roomEnts.some(
          (e) => e.status === "critical" || e.status === "warning"
        );
        if (hasFlagged && status === "ok") {
          status = "warning";
        }
      }

      // Last entry label
      let lastEntryLabel = "No entries";
      if (lastEntryTime) {
        const minutesAgo = Math.round((now - lastEntryTime) / 60000);
        if (minutesAgo < 1) lastEntryLabel = "Just now";
        else if (minutesAgo < 60) lastEntryLabel = `${minutesAgo}m ago`;
        else {
          const hours = Math.floor(minutesAgo / 60);
          const mins = minutesAgo % 60;
          lastEntryLabel = `${hours}h ${mins}m ago`;
        }
      } else if (settings?.currentShiftDate) {
        const minutesSinceStart =
          (now - new Date(shiftDate + "T07:00:00").getTime()) / 60000;
        if (minutesSinceStart < 60) lastEntryLabel = "Shift started recently";
        else {
          const hrs = Math.floor(minutesSinceStart / 60);
          lastEntryLabel = `Shift started ${hrs}h ago`;
        }
      }

      // Sparkline: last 8 entries, most recent last
      const last8 = roomEnts.slice(-8);
      const sparkline: SparklineDot[] = last8.map((e) => ({
        timestamp: e.timestamp,
        status: e.status ?? status,
      }));

      result.push({
        room,
        entryCount,
        lastEntryTime,
        status,
        lastEntryLabel,
        sparkline,
      });
    }

    // Sort: critical first, then warning, then neutral, then ok
    const statusOrder: Record<RoomStatus, number> = {
      critical: 0,
      warning: 1,
      neutral: 2,
      ok: 3,
    };
    result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return result;
  },
});

// ─── Stats ───────────────────────────────────────────────

export const getTodayStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, voice: 0, text: 0, rooms: 0 };

    const now = Date.now();
    const hour = new Date(now).getHours();
    const shiftType: "day" | "night" = hour >= 7 && hour < 19 ? "day" : "night";
    const shiftDate =
      shiftType === "night" && hour < 7
        ? new Date(now - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA")
        : new Date(now).toLocaleDateString("en-CA");

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_and_shiftDate", (q) =>
        q.eq("userId", userId).eq("shiftDate", shiftDate)
      )
      .collect();

    const rooms = new Set(entries.map((e) => e.room)).size;
    const voice = entries.filter((e) => e.entryType === "voice").length;
    const text = entries.filter((e) => e.entryType === "text").length;

    return { total: entries.length, voice, text, rooms };
  },
});

// ─── Delete Entry ─────────────────────────────────────────

export const deleteEntry = mutation({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) {
      throw new Error("Entry not found");
    }

    await ctx.db.delete(args.entryId);
  },
});

// ─── End Shift ────────────────────────────────────────────

export const endShift = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const hour = new Date(now).getHours();
    const shiftType: "day" | "night" = hour >= 7 && hour < 19 ? "day" : "night";
    const shiftDate =
      shiftType === "night" && hour < 7
        ? new Date(now - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA")
        : new Date(now).toLocaleDateString("en-CA");

    // Get all entries for this shift
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_and_shiftDate", (q) =>
        q.eq("userId", userId).eq("shiftDate", shiftDate)
      )
      .collect();

    // Return shift summary data
    const rooms = Array.from(new Set(entries.map((e) => e.room)));
    const voiceCount = entries.filter((e) => e.entryType === "voice").length;
    const textCount = entries.filter((e) => e.entryType === "text").length;

    // Clear shift state in userSettings so the user doesn't re-enter the same shift
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        currentShiftDate: undefined,
        currentShiftType: undefined,
      });
    }

    return {
      shiftDate,
      shiftType,
      totalEntries: entries.length,
      rooms,
      roomCount: rooms.length,
      voiceCount,
      textCount,
      entries: entries.sort((a, b) => a.timestamp - b.timestamp),
    };
  },
});

// ─── Past Shifts ─────────────────────────────────────────

export const getPastShifts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Get unique shift dates with their types
    const shiftMap = new Map<string, { shiftDate: string; shiftType: "day" | "night"; count: number; lastEntry: number }>();

    for (const entry of entries) {
      const key = `${entry.shiftDate}-${entry.shiftType}`;
      if (!shiftMap.has(key)) {
        shiftMap.set(key, {
          shiftDate: entry.shiftDate,
          shiftType: entry.shiftType,
          count: 0,
          lastEntry: entry.timestamp,
        });
      }
      const shift = shiftMap.get(key)!;
      shift.count++;
      if (entry.timestamp > shift.lastEntry) {
        shift.lastEntry = entry.timestamp;
      }
    }

    return Array.from(shiftMap.values())
      .sort((a, b) => b.lastEntry - a.lastEntry)
      .slice(0, 30); // Last 30 shifts
  },
});

// ─── Longest Common Subsequence (LCS) for diff ───────────

function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the LCS
  const result: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}

/**
 * Computes a line-level diff between two strings using LCS.
 * Returns { added, removed, unchanged } as newline-separated strings.
 */
function computeLineDiff(oldText: string, newText: string): {
  added: string;
  removed: string;
  unchanged: string;
} {
  const oldLines = oldText.split("\n").filter((l) => l.trim().length > 0);
  const newLines = newText.split("\n").filter((l) => l.trim().length > 0);

  const lcs = longestCommonSubsequence(oldLines, newLines);
  const lcsSet = new Set(lcs);

  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  // Lines removed (in old but not in LCS)
  const lcsIndex = new Map<string, number>();
  for (const line of lcs) {
    lcsIndex.set(line, (lcsIndex.get(line) || 0) + 1);
  }

  const oldCounts = new Map<string, number>();
  for (const line of oldLines) {
    oldCounts.set(line, (oldCounts.get(line) || 0) + 1);
  }

  const newCounts = new Map<string, number>();
  for (const line of newLines) {
    newCounts.set(line, (newCounts.get(line) || 0) + 1);
  }

  for (const line of oldLines) {
    const inLcs = lcsIndex.get(line) || 0;
    const inOld = oldCounts.get(line) || 0;
    if (inOld > inLcs) {
      removed.push(line);
      oldCounts.set(line, inOld - 1);
    } else {
      unchanged.push(line);
      lcsIndex.set(line, inLcs - 1);
    }
  }

  for (const line of newLines) {
    const inLcs = lcsIndex.get(line) || 0;
    const inNew = newCounts.get(line) || 0;
    if (inNew > inLcs) {
      added.push(line);
      newCounts.set(line, inNew - 1);
    }
  }

  return {
    added: added.join("\n"),
    removed: removed.join("\n"),
    unchanged: unchanged.join("\n"),
  };
}

// ─── Carry-Forward Drafts ────────────────────────────────

export const getCarryForwardDrafts = query({
  args: {
    rooms: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const now = Date.now();
    const hour = new Date(now).getHours();
    const currentShiftType: "day" | "night" =
      hour >= 7 && hour < 19 ? "day" : "night";
    const currentShiftDate =
      currentShiftType === "night" && hour < 7
        ? new Date(now - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA")
        : new Date(now).toLocaleDateString("en-CA");

    // Get the most recent entries for each room from previous shifts
    // (not the current shift — we want entries from before today's shift started)
    const allEntries = await ctx.db
      .query("entries")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Filter out current shift entries and get latest per room
    const latestPerRoom = new Map<
      string,
      { entry: typeof allEntries[number]; previousEntry: typeof allEntries[number] | null }
    >();

    for (const entry of allEntries) {
      const key = `${entry.room}-${entry.shiftType}`;
      // Skip entries from the current shift
      if (entry.shiftDate === currentShiftDate && entry.shiftType === currentShiftType) {
        continue;
      }
      if (!args.rooms.includes(entry.room)) continue;

      if (!latestPerRoom.has(key)) {
        // Find the previous entry for this room+shiftType (the one before the latest)
        const previousEntry = allEntries.find(
          (e) =>
            e.room === entry.room &&
            e.shiftType === entry.shiftType &&
            e.shiftDate !== entry.shiftDate &&
            !(e.shiftDate === currentShiftDate && e.shiftType === currentShiftType)
        ) || null;

        latestPerRoom.set(key, { entry, previousEntry });
      }
    }

    // Build the draft results
    const drafts = [];
    for (const [key, { entry, previousEntry }] of latestPerRoom) {
      const room = entry.room;
      const diff = previousEntry
        ? computeLineDiff(previousEntry.description, entry.description)
        : { added: "", removed: "", unchanged: entry.description };

      drafts.push({
        room,
        latestEntry: {
          _id: entry._id,
          description: entry.description,
          timestamp: entry.timestamp,
          entryType: entry.entryType,
          fdarCategory: entry.fdarCategory,
        },
        previousEntry: previousEntry
          ? {
              _id: previousEntry._id,
              description: previousEntry.description,
              timestamp: previousEntry.timestamp,
            }
          : null,
        diff,
      });
    }

    return drafts;
  },
});

// ─── Shift Summary Data (SBAR auto-generation) ────────────

export const getShiftSummaryData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();
    const hour = new Date(now).getHours();
    const shiftType: "day" | "night" = hour >= 7 && hour < 19 ? "day" : "night";
    const shiftDate =
      shiftType === "night" && hour < 7
        ? new Date(now - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA")
        : new Date(now).toLocaleDateString("en-CA");

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_and_shiftDate", (q) =>
        q.eq("userId", userId).eq("shiftDate", shiftDate)
      )
      .order("asc")
      .collect();

    const voiceCount = entries.filter((e) => e.entryType === "voice").length;
    const textCount = entries.filter((e) => e.entryType === "text").length;
    const rooms = Array.from(new Set(entries.map((e) => e.room))).sort();

    // Auto-generate Situation: latest entry per room
    const latestPerRoom = new Map<string, typeof entries[number]>();
    for (const entry of entries) {
      latestPerRoom.set(entry.room, entry);
    }

    const situationParts: string[] = [];
    for (const room of rooms) {
      const latest = latestPerRoom.get(room)!;
      situationParts.push(`Room ${room}: ${latest.description}`);
    }
    const situation = situationParts.join("\n\n");

    // Background: entry count summary
    const background = `${entries.length} entries recorded (${voiceCount} voice, ${textCount} text) across ${rooms.length} room${rooms.length !== 1 ? "s" : ""} during ${shiftType} shift`;

    // Derive task checkboxes from entry types present
    const entryTypesPresent = new Set(entries.map((e) => e.entryType));
    const fdarCategoriesPresent = new Set(
      entries.flatMap((e) => (e.fdarCategory ? [e.fdarCategory] : []))
    );

    const suggestedTasks: string[] = [];
    if (fdarCategoriesPresent.has("focus") || entries.length > 0) {
      suggestedTasks.push("Review all patient charts for updates");
    }
    if (entries.some((e) => e.description.toLowerCase().includes("med"))) {
      suggestedTasks.push("Verify medication administration records");
    }
    if (entries.some((e) => e.description.toLowerCase().includes("vital"))) {
      suggestedTasks.push("Confirm vital signs are up to date");
    }
    if (entries.some((e) => e.status === "warning" || e.status === "critical")) {
      suggestedTasks.push("Follow up on flagged entries");
    }
    suggestedTasks.push("Complete handover notes for incoming shift");

    // Check if summary already saved
    const existingSummary = await ctx.db
      .query("shiftSummaries")
      .withIndex("by_user_and_shiftDate", (q) =>
        q.eq("userId", userId).eq("shiftDate", shiftDate)
      )
      .first();

    return {
      shiftDate,
      shiftType,
      entries,
      rooms,
      totalEntries: entries.length,
      voiceCount,
      textCount,
      situation,
      background,
      suggestedTasks,
      savedSummary: existingSummary
        ? {
            fdarSummary: existingSummary.fdarSummary,
            handoverNotes: existingSummary.handoverNotes ?? "",
          }
        : null,
    };
  },
});

export const saveShiftSummary = mutation({
  args: {
    fdarSummary: v.string(),
    handoverNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const hour = new Date(now).getHours();
    const shiftType: "day" | "night" = hour >= 7 && hour < 19 ? "day" : "night";
    const shiftDate =
      shiftType === "night" && hour < 7
        ? new Date(now - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA")
        : new Date(now).toLocaleDateString("en-CA");

    // Upsert: check if summary already exists for this shift
    const existing = await ctx.db
      .query("shiftSummaries")
      .withIndex("by_user_and_shiftDate", (q) =>
        q.eq("userId", userId).eq("shiftDate", shiftDate)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fdarSummary: args.fdarSummary,
        handoverNotes: args.handoverNotes,
      });
      return existing._id;
    }

    return await ctx.db.insert("shiftSummaries", {
      userId,
      shiftDate,
      shiftType,
      fdarSummary: args.fdarSummary,
      handoverNotes: args.handoverNotes,
      createdAt: now,
    });
  },
});

// ─── Quick Presets ───────────────────────────────────────

export const getQuickPresets = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const presets = await ctx.db
      .query("quickPresets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return presets.map((p) => ({
      id: p._id,
      name: p.name,
      text: p.text,
      isDefault: p.isDefault ?? false,
    }));
  },
});

export const searchQuickPresets = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const presets = await ctx.db
      .query("quickPresets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const lowerQuery = args.query.toLowerCase();
    return presets
      .filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.text.toLowerCase().includes(lowerQuery)
      )
      .map((p) => ({
        id: p._id,
        name: p.name,
        text: p.text,
        isDefault: p.isDefault ?? false,
      }));
  },
});

export const addQuickPreset = mutation({
  args: { name: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("quickPresets", {
      userId,
      name: args.name,
      text: args.text,
      isDefault: false,
    });
  },
});

export const removeQuickPreset = mutation({
  args: { presetId: v.id("quickPresets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const preset = await ctx.db.get(args.presetId);
    if (!preset || preset.userId !== userId) {
      throw new Error("Preset not found");
    }
    if (preset.isDefault) {
      throw new Error("Cannot delete default presets");
    }

    await ctx.db.delete(args.presetId);
  },
});