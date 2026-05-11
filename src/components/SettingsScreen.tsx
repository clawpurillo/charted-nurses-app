"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useState, useCallback, useEffect, useRef } from "react";

// ─── High-contrast mode ───────────────────────────────────

const HIGH_CONTRAST_KEY = "charted-high-contrast";

function useHighContrast() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem(HIGH_CONTRAST_KEY) === "true";
    setEnabled(saved);
    if (saved) {
      document.documentElement.classList.add("high-contrast");
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("high-contrast");
        localStorage.setItem(HIGH_CONTRAST_KEY, "true");
      } else {
        document.documentElement.classList.remove("high-contrast");
        localStorage.setItem(HIGH_CONTRAST_KEY, "false");
      }
      return next;
    });
  }, []);

  return { enabled, toggle };
}

// ─── Plan badge helpers ───────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  basic: "bg-blue-100 text-blue-700",
  pro: "bg-amber-100 text-amber-800",
};

// ─── Template editor modal ────────────────────────────────

interface TemplateEditorProps {
  template: Doc<"templates"> | null; // null = creating new
  onSave: (data: { name: string; trigger: string; content: string; category: string }) => void;
  onCancel: () => void;
}

function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name ?? "");
  const [trigger, setTrigger] = useState(template?.trigger ?? "");
  const [content, setContent] = useState(template?.content ?? "");
  const [category, setCategory] = useState(template?.category ?? "");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (!name.trim() || !trigger.trim() || !content.trim()) return;
    onSave({
      name: name.trim(),
      trigger: trigger.trim(),
      content: content.trim(),
      category: category.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={template ? "Edit template" : "New template"}
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          {template ? "Edit Template" : "New Template"}
        </h2>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            ref={titleRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vitals Check"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 min-h-[48px]"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Trigger</span>
          <input
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="e.g. .vitals"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 min-h-[48px] font-mono"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Content</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Template text with placeholders..."
            rows={4}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 resize-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Category</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. assessment, medication"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 min-h-[48px]"
          />
        </label>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !trigger.trim() || !content.trim()}
            className="flex-1 py-3 bg-slate-900 text-white font-semibold text-sm rounded-xl hover:bg-slate-800 disabled:opacity-50 transition min-h-[48px]"
          >
            {template ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirmation ──────────────────────────────────

interface DeleteConfirmProps {
  templateName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirm({ templateName, onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirm delete"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Delete Template</p>
          <p className="text-sm text-slate-500 mt-1">
            Are you sure you want to delete &quot;{templateName}&quot;? This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 text-white font-semibold text-sm rounded-xl hover:bg-red-700 transition min-h-[48px]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Screen ─────────────────────────────────

interface SettingsScreenProps {
  onNavigate?: (screen: string) => void;
}

export default function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  const { signOut } = useAuthActions();
  const user = useQuery(api.entries.me);
  const userSettings = useQuery(api.entries.getUserSettings);
  const templates = useQuery(api.templates.getTemplates);
  const seedTemplates = useMutation(api.templates.seedDefaultTemplates);
  const createTemplate = useMutation(api.templates.createTemplate);
  const updateTemplate = useMutation(api.templates.updateTemplate);
  const deleteTemplate = useMutation(api.templates.deleteTemplate);

  const { enabled: highContrast, toggle: toggleHighContrast } = useHighContrast();

  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Doc<"templates"> | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Doc<"templates"> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Voice usage
  const plan = userSettings?.plan ?? "free";
  const VOICE_LIMITS: Record<string, number | string> = { free: 5, basic: 15, pro: "Unlimited" };
  const used = userSettings?.voiceEntriesUsedToday ?? 0;
  const limit = VOICE_LIMITS[plan] ?? 5;
  const voiceDisplay = limit === "Unlimited" ? `${used} used today — unlimited` : `${used}/${limit} voice entries used today`;
  const resetDate = userSettings?.lastResetDate
    ? new Date(userSettings.lastResetDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : null;

  // Template CRUD
  const handleSaveTemplate = async (data: { name: string; trigger: string; content: string; category: string }) => {
    try {
      if (editingTemplate) {
        await updateTemplate({
          templateId: editingTemplate._id,
          name: data.name,
          trigger: data.trigger,
          content: data.content,
          category: data.category,
        });
        showToast("Template updated");
      } else {
        await createTemplate({
          name: data.name,
          trigger: data.trigger,
          content: data.content,
          category: data.category,
        });
        showToast("Template created");
      }
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to save template");
    }
    setShowEditor(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    try {
      await deleteTemplate({ templateId: deletingTemplate._id as Id<"templates"> });
      showToast("Template deleted");
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to delete template");
    }
    setDeletingTemplate(null);
  };

  const handleSeedDefaults = async () => {
    try {
      const result = await seedTemplates();
      showToast(result.message ?? `Seeded ${result.seeded} templates`);
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to seed templates");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 pt-safe-top shrink-0">
        <div className="flex items-center px-5 py-4">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6 space-y-6 px-5 pt-4">
        {/* Profile section */}
        <section aria-label="Profile">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Profile</h2>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-bold shrink-0" aria-hidden="true">
              {(user?.name ?? "U")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{user?.name ?? "User"}</p>
              <p className="text-sm text-slate-500 truncate">{user?.email ?? "No email"}</p>
            </div>
          </div>
        </section>

        {/* Plan & voice usage */}
        <section aria-label="Plan and usage">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Plan &amp; Usage</h2>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Current Plan</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${PLAN_COLORS[plan] ?? PLAN_COLORS.free}`}>
                {PLAN_LABELS[plan] ?? "Free"}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-sm font-medium text-slate-700">Voice Entries</p>
              <p className="text-sm text-slate-500 mt-0.5">{voiceDisplay}</p>
              {resetDate && (
                <p className="text-xs text-slate-400 mt-1">Resets daily (last reset: {resetDate})</p>
              )}
            </div>
          </div>
        </section>

        {/* Accessibility */}
        <section aria-label="Accessibility">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Accessibility</h2>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <button
              onClick={toggleHighContrast}
              className="w-full flex items-center justify-between min-h-[48px]"
              role="switch"
              aria-checked={highContrast}
              aria-label="High contrast mode"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-slate-700">High Contrast Mode</p>
                <p className="text-xs text-slate-400 mt-0.5">Black and yellow theme with larger text</p>
              </div>
              <div className={`w-12 h-7 rounded-full transition-colors ${highContrast ? "bg-slate-900" : "bg-slate-200"} relative`}>
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${highContrast ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </button>
          </div>
        </section>

        {/* Shift History */}
        <section aria-label="Shift History">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">History</h2>
          <button
            onClick={() => onNavigate?.("history")}
            className="w-full bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 hover:bg-slate-50 transition min-h-[56px] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">Shift History</p>
              <p className="text-xs text-slate-500">Browse past shifts and entries</p>
            </div>
            <svg className="w-5 h-5 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </section>

        {/* Template management */}
        <section aria-label="Templates">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Templates</h2>
            <div className="flex gap-2">
              {(templates?.length ?? 0) === 0 && (
                <button
                  onClick={handleSeedDefaults}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition min-h-[48px] flex items-center"
                >
                  Load defaults
                </button>
              )}
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowEditor(true);
                }}
                className="text-xs font-semibold text-slate-900 hover:text-slate-700 transition min-h-[48px] flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
            {templates === undefined ? (
              <div className="p-6 text-center text-sm text-slate-400">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">No templates yet. Load defaults or create one.</div>
            ) : (
              templates.map((t) => (
                <div key={t._id} className="p-4 flex items-start gap-3 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{t.name}</p>
                      {t.category && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">{t.category}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{t.trigger}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingTemplate(t);
                        setShowEditor(true);
                      }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      aria-label={`Edit ${t.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeletingTemplate(t)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      aria-label={`Delete ${t.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Sign out */}
        <section aria-label="Account">
          <button
            onClick={() => signOut()}
            className="w-full py-3 bg-white border border-red-200 text-red-600 font-semibold text-sm rounded-xl hover:bg-red-50 transition min-h-[48px] flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </section>
      </div>

      {/* Modals */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setShowEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {deletingTemplate && (
        <DeleteConfirm
          templateName={deletingTemplate.name}
          onConfirm={handleDeleteTemplate}
          onCancel={() => setDeletingTemplate(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
