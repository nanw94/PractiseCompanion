import type { AppData, FocusItem, RoutineTemplate, Session, StepTemplate } from "./model";
import { STORAGE_VERSION } from "./model";
import { createEmptyAppData } from "./storage";

/**
 * Validates and normalizes JSON into AppData (same rules as localStorage load).
 */
export function parseAppDataFromJson(input: unknown): AppData | null {
  if (!input || typeof input !== "object") return null;
  const parsed = input as Partial<AppData>;

  if (parsed.version === STORAGE_VERSION) {
    const empty = createEmptyAppData();
    return {
      version: STORAGE_VERSION,
      sessions: Array.isArray(parsed.sessions) ? (parsed.sessions as Session[]) : [],
      presets: Array.isArray(parsed.presets) ? parsed.presets : [],
      routines: Array.isArray(parsed.routines) ? (parsed.routines as RoutineTemplate[]) : empty.routines,
      stepLibrary: Array.isArray(parsed.stepLibrary) ? (parsed.stepLibrary as StepTemplate[]) : empty.stepLibrary,
      focusLibrary: Array.isArray(parsed.focusLibrary) ? (parsed.focusLibrary as FocusItem[]) : empty.focusLibrary,
      activeRun: parsed.activeRun,
      lastCompletedRun: parsed.lastCompletedRun,
    };
  }

  return null;
}
