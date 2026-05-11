/**
 * Reusable skeleton loading components for authenticated routes.
 * Uses bg-slate-200 dark:bg-slate-700 with animate-pulse per design spec.
 */

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse ${className}`} />
  );
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${
            i === lines - 1 ? "w-3/4" : "w-full"
          } h-3`}
        />
      ))}
    </div>
  );
}

export function SkeletonHeader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 px-5 py-4 border-b border-slate-200/50 bg-white dark:bg-card ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-48 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonPage({ headerTitle, lineCount = 5, className = "" }: {
  headerTitle?: string;
  lineCount?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col h-screen bg-surface font-sans overflow-hidden ${className}`}>
      <SkeletonHeader />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {Array.from({ length: lineCount }).map((_, i) => (
          <SkeletonCard key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}
