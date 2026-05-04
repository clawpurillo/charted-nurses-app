import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
      return { plan: "free", voiceEntriesUsedToday: 0, lastResetDate: null };
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
    return await ctx.db.insert("userSettings", {
      userId,
      plan: "free",
      voiceEntriesUsedToday: 0,
      lastResetDate: today,
    });
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

export const updateUserPlan = mutation({
  args: { plan: v.union(v.literal("free"), v.literal("basic"), v.literal("pro")) },
  handler: async (ctx, args) => {
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
    await ctx.db.patch(settings._id, {
      plan: args.plan,
      voiceEntriesUsedToday: 0,
      lastResetDate: today,
    });

    return { success: true, plan: args.plan };
  },
});

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