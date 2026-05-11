import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Auth tables (users, sessions, authRefreshTokens, authVerifications, authVerificationCodes)
  // - users/sessions/refreshTokens: essential for password auth
  // - verifications/verificationCodes: for email verification (not used now, but harmless)
  ...authTables,

  userSettings: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("basic"), v.literal("pro")),
    voiceEntriesUsedToday: v.optional(v.number()),
    lastResetDate: v.optional(v.string()),
    // Shift setup state
    assignedRooms: v.optional(v.array(v.string())),
    currentShiftDate: v.optional(v.string()),
    currentShiftType: v.optional(v.union(v.literal("day"), v.literal("night"))),
  }).index("by_user", ["userId"]),

  templates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    trigger: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    usageCount: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  quickPresets: defineTable({
    userId: v.id("users"),
    name: v.string(),
    text: v.string(),
    isDefault: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  entries: defineTable({
    userId: v.id("users"),
    room: v.string(),
    description: v.string(),
    entryType: v.union(v.literal("text"), v.literal("voice")),
    fdarCategory: v.optional(v.union(v.literal("focus"), v.literal("data"), v.literal("action"), v.literal("response"))),
    status: v.optional(v.union(v.literal("ok"), v.literal("warning"), v.literal("critical"))),
    timestamp: v.number(),
    shiftDate: v.string(),
    shiftType: v.union(v.literal("day"), v.literal("night")),
    isCarriedForward: v.optional(v.boolean()),
  })
    .index("by_user_and_shiftDate", ["userId", "shiftDate"])
    .index("by_user_and_room", ["userId", "room"])
    .index("by_user_and_timestamp", ["userId", "timestamp"]),

  shiftSummaries: defineTable({
    userId: v.id("users"),
    shiftDate: v.string(),
    shiftType: v.union(v.literal("day"), v.literal("night")),
    fdarSummary: v.string(),
    handoverNotes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user_and_shiftDate", ["userId", "shiftDate"]),
});