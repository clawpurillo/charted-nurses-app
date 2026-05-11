"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface QuickPreset {
  id: string;
  name: string;
  text: string;
  isDefault: boolean;
}

interface QuickPresetsProps {
  onSelect: (text: string) => void;
  onCancel: () => void;
}

export default function QuickPresets({ onSelect, onCancel }: QuickPresetsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const presets = useQuery(api.entries.getQuickPresets);
  const searchResults = useQuery(api.entries.searchQuickPresets, { query: searchQuery });
  const addPreset = useMutation(api.entries.addQuickPreset);
  const removePreset = useMutation(api.entries.removeQuickPreset);

  // Auto-focus search input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Use search results when query >= 2 chars, otherwise show all presets
  const displayPresets = searchQuery.length >= 2
    ? (searchResults ?? [])
    : (presets ?? []);

  const handlePresetTap = (preset: QuickPreset) => {
    onSelect(preset.text);
  };

  const handleDeletePreset = async (e: React.MouseEvent, presetId: Id<"quickPresets">) => {
    e.stopPropagation();
    await removePreset({ presetId });
  };

  const handleAddPreset = async () => {
    if (!newName.trim() || !newText.trim()) return;
    await addPreset({ name: newName.trim(), text: newText.trim() });
    setNewName("");
    setNewText("");
    setShowAddForm(false);
  };

  // Highlight matching characters in the preset name
  const highlightMatch = (text: string, query: string) => {
    if (query.length < 2) return text;
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const chars = text.split("");
    let qi = 0;
    const matches = new Set<number>();

    for (let ti = 0; ti < lower.length && qi < q.length; ti++) {
      if (lower[ti] === q[qi]) {
        matches.add(ti);
        qi++;
      }
    }

    if (qi < q.length) return text; // No full match

    return chars.map((char, i) =>
      matches.has(i)
        ? `<mark class="font-semibold text-text-primary">${char}</mark>`
        : `<span class="text-text-secondary">${char}</span>`
    ).join("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-200/50 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-text-primary tracking-tight">Quick Presets</h2>
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            aria-label="Close presets"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search presets..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition min-h-[48px]"
            aria-label="Search presets"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-500 text-white text-xs flex items-center justify-center hover:bg-slate-400 transition"
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-xs text-text-muted mt-1.5">Type 2+ characters to search</p>
        )}
      </div>

      {/* Preset list */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {displayPresets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted">
              {searchQuery ? "No matching presets" : "No presets yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetTap(preset)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface dark:bg-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-left transition group min-h-[48px]"
                aria-label={`Insert preset: ${preset.name}`}
              >
                <div className="flex items-center gap-3">
                  {/* Icon with brand accent */}
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                    preset.isDefault
                      ? "bg-brand/10 text-brand"
                      : "bg-slate-100 dark:bg-slate-600 text-text-secondary"
                  }`}>
                    {preset.isDefault ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <p
                      className="text-sm font-semibold text-text-primary"
                      dangerouslySetInnerHTML={{
                        __html: highlightMatch(preset.name, searchQuery),
                      }}
                    />
                    <p className="text-xs text-text-muted truncate max-w-[200px]">
                      {preset.text}
                    </p>
                  </div>
                </div>
                {/* Delete button for custom presets */}
                {!preset.isDefault && (
                  <button
                    onClick={(e) => handleDeletePreset(e, preset.id)}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/5 transition"
                    aria-label={`Delete preset: ${preset.name}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add custom preset */}
      <div className="px-5 py-3 border-t border-slate-200/50 shrink-0">
        {showAddForm ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Preset name (e.g., BP checked)"
              className="w-full px-3 py-2.5 bg-surface dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand min-h-[48px]"
              aria-label="Preset name"
            />
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Text to insert (e.g., Blood pressure checked and recorded)"
              className="w-full px-3 py-2.5 bg-surface dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand min-h-[48px]"
              aria-label="Preset text"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddPreset();
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddPreset}
                disabled={!newName.trim() || !newText.trim()}
                className="flex-1 py-2.5 bg-brand text-white font-semibold text-sm rounded-xl hover:bg-brand/90 disabled:opacity-50 transition min-h-[48px]"
              >
                Save Preset
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewName("");
                  setNewText("");
                }}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-text-secondary font-semibold text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition min-h-[48px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-brand/30 rounded-xl text-sm font-semibold text-brand/70 hover:text-brand hover:border-brand transition min-h-[48px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Custom Preset
          </button>
        )}
      </div>
    </div>
  );
}
