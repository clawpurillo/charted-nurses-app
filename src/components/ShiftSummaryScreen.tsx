"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 min-h-[36px] ${
        copied
          ? "bg-accent-new/10 text-accent-new"
          : "bg-slate-100 dark:bg-slate-700 text-text-secondary hover:bg-slate-200 dark:hover:bg-slate-600"
      }`}
    >
      {copied ? "\u2713 Copied" : label ?? "Copy"}
    </button>
  );
}

interface ShiftSummaryScreenProps {
  onNavigate?: (tab: string) => void;
}

export default function ShiftSummaryScreen({ onNavigate }: ShiftSummaryScreenProps) {
  const summaryData = useQuery(api.entries.getShiftSummaryData);
  const saveSummary = useMutation(api.entries.saveShiftSummary);

  const [handoverNotes, setHandoverNotes] = useState("");
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load saved summary if it exists
  const saved = summaryData?.savedSummary;
  if (saved && !isSaving) {
    setHandoverNotes(saved.handoverNotes);
  }

  const toggleTask = useCallback((index: number) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!summaryData) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const fdarSummary = buildExportText(summaryData, completedTasks, handoverNotes);
      await saveSummary({ fdarSummary, handoverNotes: handoverNotes.trim() || undefined });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // Error saving -- show brief feedback
    } finally {
      setIsSaving(false);
    }
  };

  const buildExportText = (
    data: NonNullable<typeof summaryData>,
    tasks: Set<number>,
    notes: string
  ) => {
    const lines: string[] = [];
    const shiftLabel = data.shiftType === "day" ? "Day Shift" : "Night Shift";
    const dateFormatted = new Date(data.shiftDate + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    lines.push(`${dateFormatted} \u2014 ${shiftLabel}`);
    lines.push(data.background);
    lines.push("");

    lines.push("\u2550\u2550\u2550 SITUATION \u2550\u2550\u2550");
    lines.push(data.situation || "No entries recorded this shift.");
    lines.push("");

    lines.push("\u2550\u2550\u2550 ASSESSMENT \u2550\u2550\u2550");
    data.suggestedTasks.forEach((task, i) => {
      const checked = tasks.has(i) ? "[x]" : "[ ]";
      lines.push(`${checked} ${task}`);
    });
    lines.push("");

    if (notes.trim()) {
      lines.push("\u2550\u2550\u2550 RECOMMENDATION / HANDOVER NOTES \u2550\u2550\u2550");
      lines.push(notes.trim());
      lines.push("");
    }

    return lines.join("\n");
  };

  const exportText = summaryData
    ? buildExportText(summaryData, completedTasks, handoverNotes)
    : "";

  if (!summaryData) {
    return (
      <div className="flex-1 overflow-y-auto px-5 pt-4">
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-brand animate-spin" />
          <p className="text-sm text-text-secondary">Loading shift summary...</p>
        </div>
      </div>
    );
  }

  if (summaryData.totalEntries === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-5 pt-4">
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <svg className="w-16 h-16 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <h2 className="text-lg font-bold text-text-primary">No Entries Yet</h2>
          <p className="text-sm text-text-secondary max-w-xs">
            Start recording entries to generate your shift summary.
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate("rooms")}
              className="mt-4 px-6 py-3 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand/90 transition min-h-[48px]"
            >
              Go to My Rooms
            </button>
          )}
        </div>
      </div>
    );
  }

  const shiftLabel = summaryData.shiftType === "day" ? "Day Shift" : "Night Shift";
  const dateFormatted = new Date(summaryData.shiftDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex-1 overflow-y-auto pb-40 px-5 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-text-primary tracking-tight">Shift Summary</h1>
        <p className="text-sm text-text-secondary">{dateFormatted} &middot; {shiftLabel}</p>
      </div>

      {/* SITUATION \u2014 Auto-generated from latest entries per room */}
      <section className="mb-6" aria-labelledby="situation-heading">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-brand" />
          <h2 id="situation-heading" className="text-sm font-bold text-text-primary uppercase tracking-wide">
            Situation
          </h2>
        </div>
        <div className="bg-card dark:bg-slate-700/50 rounded-2xl border border-slate-200/50 dark:border-slate-600 p-4 space-y-3">
          {summaryData.rooms.map((room) => {
            const latestEntry = summaryData.entries
              .filter((e) => e.room === room)
              .sort((a, b) => b.timestamp - a.timestamp)[0];
            return (
              <div key={room} className="flex gap-3">
                <span className="px-2 py-0.5 bg-brand/10 text-brand text-xs font-bold rounded-md shrink-0 h-fit">
                  {room}
                </span>
                <p className="text-sm text-text-primary leading-relaxed">
                  {latestEntry?.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* BACKGROUND \u2014 Entry count summary */}
      <section className="mb-6" aria-labelledby="background-heading">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <h2 id="background-heading" className="text-sm font-bold text-text-primary uppercase tracking-wide">
            Background
          </h2>
        </div>
        <div className="bg-surface dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600">
          <p className="text-sm text-text-primary leading-relaxed">{summaryData.background}</p>
          <div className="flex gap-3 mt-3 text-xs font-medium text-text-secondary">
            <span>{summaryData.totalEntries} total</span>
            <span>&middot;</span>
            <span>{summaryData.voiceCount} voice</span>
            <span>&middot;</span>
            <span>{summaryData.textCount} text</span>
            <span>&middot;</span>
            <span>{summaryData.rooms.length} rooms</span>
          </div>
        </div>
      </section>

      {/* ASSESSMENT \u2014 Task checkboxes */}
      <section className="mb-6" aria-labelledby="assessment-heading">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-accent-new" />
          <h2 id="assessment-heading" className="text-sm font-bold text-text-primary uppercase tracking-wide">
            Assessment
          </h2>
        </div>
        <div className="bg-card dark:bg-slate-700/50 rounded-2xl border border-slate-200/50 dark:border-slate-600 p-4 space-y-2">
          {summaryData.suggestedTasks.map((task, i) => (
            <label
              key={i}
              className="flex items-start gap-3 cursor-pointer group py-1"
            >
              <input
                type="checkbox"
                checked={completedTasks.has(i)}
                onChange={() => toggleTask(i)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-500 text-brand focus:ring-brand focus:ring-offset-0 cursor-pointer"
              />
              <span
                className={`text-sm leading-snug transition-colors ${
                  completedTasks.has(i)
                    ? "text-text-muted line-through"
                    : "text-text-primary group-hover:text-text-secondary"
                }`}
              >
                {task}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* RECOMMENDATION \u2014 Free-text handover notes */}
      <section className="mb-6" aria-labelledby="recommendation-heading">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-brand" />
          <h2 id="recommendation-heading" className="text-sm font-bold text-text-primary uppercase tracking-wide">
            Recommendation
          </h2>
        </div>
        <textarea
          value={handoverNotes}
          onChange={(e) => setHandoverNotes(e.target.value)}
          placeholder="Add handover notes for the incoming shift..."
          rows={5}
          className="w-full px-4 py-3 bg-card dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl text-sm text-text-primary leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition resize-none placeholder:text-text-muted"
          aria-label="Handover notes"
        />
      </section>

      {/* Actions */}
      <div className="space-y-3">
        {/* Copy to clipboard */}
        <div className="flex items-center justify-between bg-surface dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600">
          <div>
            <p className="text-sm font-semibold text-text-primary">Export Summary</p>
            <p className="text-xs text-text-secondary">Copy formatted SBAR text to clipboard</p>
          </div>
          <CopyButton text={exportText} label="Copy All" />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition min-h-[48px] ${
            saveSuccess
              ? "bg-accent-new text-white"
              : "bg-brand text-white hover:bg-brand/90 hover:shadow-lg hover:shadow-brand/30 disabled:opacity-50 active:scale-[0.98]"
          }`}
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Saving...
            </span>
          ) : saveSuccess ? (
            "\u2713 Summary Saved"
          ) : (
            "Save Summary"
          )}
        </button>
      </div>
    </div>
  );
}
