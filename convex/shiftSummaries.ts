/**
 * Shift summary queries and mutations.
 *
 * This module provides the `getShiftSummary` query expected by the dashboard
 * and any external references. It delegates to the implementations in entries.ts
 * to avoid code duplication.
 *
 * Dashboard function: shiftSummaries:getShiftSummary
 * UI function: entries:getShiftSummaryData
 */

import { getShiftSummaryData, saveShiftSummary as saveSummary } from "./entries";

// Re-export with the expected dashboard function name
export const getShiftSummary = getShiftSummaryData;
export const saveShiftSummary = saveSummary;
