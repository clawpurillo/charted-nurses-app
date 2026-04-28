import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// ─── Users ───────────────────────────────────────────────

export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    credentials: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        credentials: args.credentials,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      credentials: args.credentials,
    });
    return id;
  },
});

export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
    return user;
  },
});

// ─── Entries ─────────────────────────────────────────────

export const addEntry = mutation({
  args: {
    userId: v.id("users"),
    room: v.string(),
    description: v.string(),
    shiftType: v.union(v.literal("day"), v.literal("night")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const shiftDate = new Date(now).toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    }); // YYYY-MM-DD

    const id = await ctx.db.insert("entries", {
      userId: args.userId,
      room: args.room,
      description: args.description,
      timestamp: now,
      shiftDate,
      shiftType: args.shiftType,
    });
    return id;
  },
});

export const getTodayEntries = query({
  args: {
    userId: v.id("users"),
    shiftDate: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_and_shiftDate", (q) =>
        q.eq("userId", args.userId).eq("shiftDate", args.shiftDate)
      )
      .order("asc")
      .collect();
    return entries;
  },
});

export const getEntriesByRoom = query({
  args: {
    userId: v.id("users"),
    room: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_and_room", (q) =>
        q.eq("userId", args.userId).eq("room", args.room)
      )
      .order("asc")
      .collect();
    return entries;
  },
});

export const getEntriesByDate = query({
  args: {
    userId: v.id("users"),
    shiftDate: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_and_shiftDate", (q) =>
        q.eq("userId", args.userId).eq("shiftDate", args.shiftDate)
      )
      .order("asc")
      .collect();
    return entries;
  },
});

// ─── Shift Summaries ─────────────────────────────────────

export const endShift = mutation({
  args: {
    userId: v.id("users"),
    shiftDate: v.string(),
    shiftType: v.union(v.literal("day"), v.literal("night")),
    entryCount: v.number(),
    roomCount: v.number(),
    handoverNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("shift_summaries", {
      userId: args.userId,
      shiftDate: args.shiftDate,
      shiftType: args.shiftType,
      entryCount: args.entryCount,
      roomCount: args.roomCount,
      handoverNotes: args.handoverNotes,
      endedAt: Date.now(),
    });
    return id;
  },
});

export const getShiftSummaries = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const summaries = await ctx.db
      .query("shift_summaries")
      .order("desc")
      .collect();
    return summaries.filter((s) => s.userId === args.userId);
  },
});

export const getShiftSummary = query({
  args: {
    userId: v.id("users"),
    shiftDate: v.string(),
    shiftType: v.union(v.literal("day"), v.literal("night")),
  },
  handler: async (ctx, args) => {
    const summaries = await ctx.db
      .query("shift_summaries")
      .order("desc")
      .collect();
    return summaries.find(
      (s) =>
        s.userId === args.userId &&
        s.shiftDate === args.shiftDate &&
        s.shiftType === args.shiftType
    );
  },
});
