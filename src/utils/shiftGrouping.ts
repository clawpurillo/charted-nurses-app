/**
 * Shift grouping utilities for the Charted nursing app.
 *
 * Shifts:
 * - Day: 07:00 -- 19:00 (7 AM to 7 PM)
 * - Night: 19:00 -- 07:00 (7 PM to 7 AM next day)
 *
 * Night shifts that start before 07:00 belong to the previous calendar day.
 */

export type ShiftType = "day" | "night";

export interface ShiftGroup {
  shiftDate: string; // YYYY-MM-DD
  shiftType: ShiftType;
  label: string; // e.g. "Day Shift -- Mon, May 10"
  header: string; // e.g. "Day Shift -- 07:00 to 19:00"
  entries: Entry[];
}

export interface Entry {
  _id: string;
  room: string;
  description: string;
  entryType: "text" | "voice";
  fdarCategory?: "focus" | "data" | "action" | "response";
  timestamp: number;
  shiftDate: string;
  shiftType: ShiftType;
}

/**
 * Derive the shift type and shift date for a given timestamp.
 * Day shift: 07:00 -- 18:59
 * Night shift: 19:00 -- 06:59 (belongs to previous calendar day)
 */
export function getShiftForDate(date: Date): { shiftDate: string; shiftType: ShiftType } {
  const hour = date.getHours();
  const shiftType: ShiftType = hour >= 7 && hour < 19 ? "day" : "night";
  const shiftDate =
    shiftType === "night" && hour < 7
      ? new Date(date.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA")
      : date.toLocaleDateString("en-CA");
  return { shiftDate, shiftType };
}

/**
 * Group entries by shift date and shift type.
 * Returns an array of ShiftGroup sorted newest-first by shift date.
 */
export function groupEntriesByShift(entries: Entry[]): ShiftGroup[] {
  const groups = new Map<string, ShiftGroup>();

  for (const entry of entries) {
    const key = `${entry.shiftDate}-${entry.shiftType}`;
    if (!groups.has(key)) {
      groups.set(key, {
        shiftDate: entry.shiftDate,
        shiftType: entry.shiftType,
        label: formatShiftLabel(entry.shiftDate, entry.shiftType),
        header: formatShiftHeader(entry.shiftType),
        entries: [],
      });
    }
    groups.get(key)!.entries.push(entry);
  }

  // Sort entries within each group newest-first
  const result = Array.from(groups.values());
  for (const group of result) {
    group.entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Sort groups newest-first
  result.sort((a, b) => {
    const dateA = parseShiftDate(a.shiftDate, a.shiftType);
    const dateB = parseShiftDate(b.shiftDate, b.shiftType);
    return dateB.getTime() - dateA.getTime();
  });

  return result;
}

/**
 * Generate a list of recent shift dates for the scrubber.
 * Returns the last N shifts from the given reference date.
 */
export function getRecentShifts(fromDate: Date = new Date(), count: number = 14): { shiftDate: string; shiftType: ShiftType; label: string }[] {
  const shifts: { shiftDate: string; shiftType: ShiftType; label: string }[] = [];
  let d = new Date(fromDate);

  // Start from the current shift and go backwards
  for (let i = 0; shifts.length < count; i++) {
    // Day shift of date i days ago
    const dayDate = new Date(d.getTime() - i * 24 * 60 * 60 * 1000);
    const { shiftDate: dayShiftDate, shiftType: dayType } = getShiftForDate(dayDate);
    shifts.push({
      shiftDate: dayShiftDate,
      shiftType: dayType,
      label: formatShiftLabel(dayShiftDate, dayType),
    });

    // Night shift of date i days ago
    const nightDate = new Date(dayDate.getTime() + 12 * 60 * 60 * 1000); // 12 hours later = evening
    const { shiftDate: nightShiftDate, shiftType: nightType } = getShiftForDate(nightDate);
    // Only add if different from day shift
    if (nightShiftDate !== dayShiftDate || nightType !== dayType) {
      shifts.push({
        shiftDate: nightShiftDate,
        shiftType: nightType,
        label: formatShiftLabel(nightShiftDate, nightType),
      });
    }
  }

  // Sort newest-first
  shifts.sort((a, b) => {
    const dateA = parseShiftDate(a.shiftDate, a.shiftType);
    const dateB = parseShiftDate(b.shiftDate, b.shiftType);
    return dateB.getTime() - dateA.getTime();
  });

  return shifts.slice(0, count);
}

/**
 * Parse a shift date string back to a Date object for comparison.
 */
function parseShiftDate(shiftDate: string, shiftType: ShiftType): Date {
  const [year, month, day] = shiftDate.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day, 12, 0, 0); // noon to avoid DST issues
  if (shiftType === "night") {
    // Night shift is the evening of this date
    baseDate.setHours(20, 0, 0, 0);
  }
  return baseDate;
}

/**
 * Format a shift label for the scrubber.
 * e.g. "Day -- Mon, May 10"
 */
function formatShiftLabel(shiftDate: string, shiftType: ShiftType): string {
  const date = parseShiftDate(shiftDate, shiftType);
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const type = shiftType === "day" ? "Day" : "Night";
  return `${type} -- ${formatted}`;
}

/**
 * Format a shift header for the group header.
 * e.g. "Day Shift -- 07:00 to 19:00"
 */
function formatShiftHeader(shiftType: ShiftType): string {
  return shiftType === "day"
    ? "Day Shift -- 07:00 to 19:00"
    : "Night Shift -- 19:00 to 07:00";
}

/**
 * Determine the status color category for an entry.
 * - critical: action FDAR entries, or entries with urgency keywords
 * - warning: focus FDAR entries, or entries needing attention
 * - ok: data/response FDAR entries, routine entries
 */
export function getEntryStatus(entry: Entry): "ok" | "warning" | "critical" {
  const desc = entry.description.toLowerCase();

  // Critical keywords
  const criticalKeywords = [
    "critical", "emergency", "code", "stat", "rapid response",
    "fall", "arrest", "seizure", "bleeding", "hemorrhage",
    "notified provider", "new orders", "abnormal", "elevated",
    "tachycardia", "hypertension", "hypotension", "desaturation",
  ];

  // Warning keywords
  const warningKeywords = [
    "monitor", "follow-up", "follow up", "erythema", "swelling",
    "pain", "complaint", "refused", "non-compliant", "change",
    "concern", "worsening", "declining",
  ];

  for (const keyword of criticalKeywords) {
    if (desc.includes(keyword)) return "critical";
  }

  for (const keyword of warningKeywords) {
    if (desc.includes(keyword)) return "warning";
  }

  // FDAR category fallback
  if (entry.fdarCategory === "action") return "warning";
  if (entry.fdarCategory === "focus") return "warning";

  return "ok";
}

/**
 * CSS class mapping for entry status.
 * Grey for routine, yellow for action needed, red for critical.
 */
export function getStatusClasses(status: "ok" | "warning" | "critical"): {
  border: string;
  dot: string;
  badge: string;
} {
  switch (status) {
    case "critical":
      return {
        border: "border-l-red-500",
        dot: "bg-red-500",
        badge: "bg-red-50 text-red-700",
      };
    case "warning":
      return {
        border: "border-l-yellow-500",
        dot: "bg-yellow-500",
        badge: "bg-yellow-50 text-yellow-700",
      };
    case "ok":
    default:
      return {
        border: "border-l-slate-300",
        dot: "bg-slate-400",
        badge: "bg-slate-50 text-slate-600",
      };
  }
}
