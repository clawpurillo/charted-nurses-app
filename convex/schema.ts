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
  }).index("by_user", ["userId"]),

  entries: defineTable({
    userId: v.id("users"),
    room: v.string(),
    description: v.string(),
    entryType: v.union(v.literal("text"), v.literal("voice")),
    fdarCategory: v.optional(v.union(v.literal("focus"), v.literal("data"), v.literal("action"), v.literal("response"))),
    timestamp: v.number(),
    shiftDate: v.string(),
    shiftType: v.union(v.literal("day"), v.literal("night")),
  })
    .index("by_user_and_shiftDate", ["userId", "shiftDate"])
    .index("by_user_and_room", ["userId", "room"])
    .index("by_user_and_timestamp", ["userId", "timestamp"]),
});