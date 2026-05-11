"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

interface TemplateSearchPopupProps {
  onInsert: (content: string, templateId: string) => void;
  onClose: () => void;
  initialQuery: string;
}

export default function TemplateSearchPopup({
  onInsert,
  onClose,
  initialQuery,
}: TemplateSearchPopupProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const templates = useQuery(api.templates.searchTemplates, {
    query: searchQuery,
  });

  const incrementUsage = useMutation(api.templates.incrementTemplateUsage);

  // Auto-focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSelectTemplate = async (template: Doc<"templates">) => {
    try {
      await incrementUsage({ templateId: template._id });
    } catch {
      // Usage tracking is non-critical; insert anyway
    }
    onInsert(template.content, template._id);
  };

  const categoryColors: Record<string, string> = {
    assessment: "bg-blue-100 text-blue-700",
    medication: "bg-amber-100 text-amber-700",
    monitoring: "bg-green-100 text-green-700",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with search input */}
      <div className="px-4 pt-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition"
              aria-label="Search templates"
            />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition shrink-0"
            aria-label="Close template search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto px-4 py-2" role="listbox" aria-label="Template results">
        {templates === undefined ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No templates found
          </div>
        ) : (
          <div className="space-y-2 pb-safe-bottom">
            {templates.map((template) => (
              <button
                key={template._id}
                onClick={() => handleSelectTemplate(template)}
                className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                role="option"
                aria-selected={false}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-slate-900">
                    {template.name}
                  </span>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {template.trigger}
                  </span>
                  {template.category && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        categoryColors[template.category] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {template.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {template.content}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
