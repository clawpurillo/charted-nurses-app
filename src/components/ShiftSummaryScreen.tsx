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
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
        copied
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {copied ? "✓ Copied" : label ?? "Copy"}
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
      // Error saving — show brief feedback
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

    lines.push(`${dateFormatted} — ${shiftLabel}`);
    lines.push(data.background);
    lines.push("");

    lines.push("═══ SITUATION ═══");
    lines.push(data.situation || "No entries recorded this shift.");
    lines.push("");

    lines.push("═══ ASSESSMENT ═══");
    data.suggestedTasks.forEach((task, i) => {
      const checked = tasks.has(i) ? "[x]" : "[ ]";
      lines.push(`${checked} ${task}`);
    });
    lines.push("");

    if (notes.trim()) {
      lines.push("═══ RECOMMENDATION / HANDOVER NOTES ═══");
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
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
          <p className="text-sm text-slate-500">Loading shift summary...</p>
        </div>
      </div>
    );
  }

  if (summaryData.totalEntries === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-5 pt-4">
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <h2 className="text-lg font-bold text-slate-800">No Entries Yet</h2>
          <p className="text-sm text-slate-500 max-w-xs">
            Start recording entries to generate your shift summary.
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate("rooms")}
              className="mt-4 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition"
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
        <h1 className="text-xl font-bold text-slate-900">Shift Summary</h1>
        <p className="text-sm text-slate-500">{dateFormatted} · {shiftLabel}</p>
      </div>

      {/* SITUATION — Auto-generated from latest entries per room */}
      <section className="mb-6" aria-labelledby="situation-heading">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <h2 id="situation-heading" className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Situation
          </h2>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          {summaryData.rooms.map((room) => {
            const latestEntry = summaryData.entries
              .filter((e) => e.room === room)
              .sort((a, b) => b.timestamp - a.timestamp)[0];
            return (
              <div key={room} className="flex gap-3">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md shrink-0 h-fit">
                  {room}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {latestEntry?.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* BACKGROUND — Entry count summary */}
      <section className="mb-6" aria-labelledby="background-heading">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <h2 id="background-heading" className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Background
          </h2>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-sm text-slate-700 leading-relaxed">{summaryData.background}</p>
          <div className="flex gap-3 mt-3 text-xs font-medium text-slate-500">
            <span>{summaryData.totalEntries} total</span>
            <span>·</span>
            <span>{summaryData.voiceCount} voice</span>
            <span>·</span>
            <span>{summaryData.textCount} text</span>
            <span>·</span>
            <span>{summaryData.rooms.length} rooms</span>
          </div>
        </div>
      </section>

      {/* ASSESSMENT — Task checkboxes */}
      <section className="mb-6" aria-labelledby="assessment-heading">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <h2 id="assessment-heading" className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Assessment
          </h2>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          {summaryData.suggestedTasks.map((task, i) => (
            <label
              key={i}
              className="flex items-start gap-3 cursor-pointer group py-1"
            >
              <input
                type="checkbox"
                checked={completedTasks.has(i)}
                onChange={() => toggleTask(i)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 focus:ring-offset-0 cursor-pointer"
              />
              <span
                className={`text-sm leading-snug transition-colors ${
                  completedTasks.has(i)
                    ? "text-slate-400 line-through"
                    : "text-slate-700 group-hover:text-slate-900"
                }`}
              >
                {task}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* RECOMMENDATION — Free-text handover notes */}
      <section className="mb-6" aria-labelledby="recommendation-heading">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <h2 id="recommendation-heading" className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Recommendation
          </h2>
        </div>
        <textarea
          value={handoverNotes}
          onChange={(e) => setHandoverNotes(e.target.value)}
          placeholder="Add handover notes for the incoming shift..."
          rows={5}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed focus:outline-none focus:border-slate-400 focus:bg-slate-50 transition resize-none placeholder:text-slate-400"
          aria-label="Handover notes"
        />
      </section>

      {/* Actions */}
      <div className="space-y-3">
        {/* Copy to clipboard */}
        <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4">
          <div>
            <p className="text-sm font-semibold text-slate-700">Export Summary</p>
            <p className="text-xs text-slate-500">Copy formatted SBAR text to clipboard</p>
          </div>
          <CopyButton text={exportText} label="Copy All" />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition ${
            saveSuccess
              ? "bg-green-600 text-white"
              : "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          }`}
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Saving...
            </span>
          ) : saveSuccess ? (
            "✓ Summary Saved"
          ) : (
            "Save Summary"
          )}
        </button>
      </div>
    </div>
  );
}
