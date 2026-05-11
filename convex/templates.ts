import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Default Templates ────────────────────────────────────

const DEFAULT_TEMPLATES = [
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

// ─── Queries ──────────────────────────────────────────────

export const getTemplates = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

export const searchTemplates = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const all = await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const q = args.query.toLowerCase().trim();
    if (!q) return all;

    // Fuzzy match on trigger and name: score by how many query chars appear in order
    return all
      .map((t) => {
        const triggerLower = t.trigger.toLowerCase();
        const nameLower = t.name.toLowerCase();
        const triggerScore = fuzzyScore(q, triggerLower);
        const nameScore = fuzzyScore(q, nameLower);
        const categoryScore = t.category
          ? fuzzyScore(q, t.category.toLowerCase())
          : 0;
        return { template: t, score: Math.max(triggerScore, nameScore, categoryScore) };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.template);
  },
});

/**
 * Simple fuzzy match score: counts how many query characters
 * appear in order in the target string. Returns 0 if no match.
 */
function fuzzyScore(query: string, target: string): number {
  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) {
      score++;
      qi++;
    }
  }
  return qi === query.length ? score : 0;
}

// ─── Mutations ────────────────────────────────────────────

export const createTemplate = mutation({
  args: {
    name: v.string(),
    trigger: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Normalize trigger: ensure it starts with "."
    const trigger = args.trigger.startsWith(".")
      ? args.trigger
      : `.${args.trigger}`;

    return await ctx.db.insert("templates", {
      userId,
      name: args.name,
      trigger,
      content: args.content,
      category: args.category,
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const updateTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    name: v.optional(v.string()),
    trigger: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== userId) {
      throw new Error("Template not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.trigger !== undefined) {
      updates.trigger = args.trigger.startsWith(".")
        ? args.trigger
        : `.${args.trigger}`;
    }
    if (args.content !== undefined) updates.content = args.content;
    if (args.category !== undefined) updates.category = args.category;

    if (Object.keys(updates).length === 0) return template;

    await ctx.db.patch(args.templateId, updates as any);
    return await ctx.db.get(args.templateId);
  },
});

export const deleteTemplate = mutation({
  args: { templateId: v.id("templates") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== userId) {
      throw new Error("Template not found");
    }

    await ctx.db.delete(args.templateId);
  },
});

export const incrementTemplateUsage = mutation({
  args: { templateId: v.id("templates") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== userId) {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      usageCount: (template.usageCount || 0) + 1,
    });
  },
});

// ─── Seed default templates (idempotent) ──────────────────

export const seedDefaultTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user already has templates
    const existing = await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) return { seeded: 0, message: "Templates already exist for this user" };

    const now = Date.now();
    const ids: string[] = [];
    for (const t of DEFAULT_TEMPLATES) {
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
  },
});
