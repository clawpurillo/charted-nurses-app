import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    credentials: v.optional(v.string()), // e.g. "RN", "LPN"
  }).index("by_clerkId", ["clerkId"]),

  entries: defineTable({
    userId: v.id("users"),
    room: v.string(),
    description: v.string(),
    timestamp: v.number(), // ms epoch
    shiftDate: v.string(), // "YYYY-MM-DD"
    shiftType: v.union(v.literal("day"), v.literal("night")),
  })
    .index("by_user_and_shiftDate", ["userId", "shiftDate"])
    .index("by_user_and_room", ["userId", "room"]),

  shift_summaries: defineTable({
    userId: v.id("users"),
    shiftDate: v.string(),
    shiftType: v.union(v.literal("day"), v.literal("night")),
    entryCount: v.number(),
    roomCount: v.number(),
    handoverNotes: v.optional(v.string()),
    endedAt: v.number(),
  }).index("by_user_and_shiftDate", ["userId", "shiftDate"]),
});
