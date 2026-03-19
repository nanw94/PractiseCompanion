import type { AppData, Session, STORAGE_VERSION } from "./model";
import { STORAGE_VERSION as CURRENT_VERSION } from "./model";

const STORAGE_KEY = "practice-companion:data";

function emptyData(): AppData {
  return { version: CURRENT_VERSION, sessions: [], presets: [] };
}

export function loadAppData(): AppData {
  if (typeof window === "undefined") return emptyData();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData();

  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (parsed.version !== (CURRENT_VERSION as typeof STORAGE_VERSION)) return emptyData();
    return {
      version: CURRENT_VERSION,
      sessions: Array.isArray(parsed.sessions) ? (parsed.sessions as Session[]) : [],
      presets: Array.isArray(parsed.presets) ? parsed.presets : [],
      activeSessionDraft: parsed.activeSessionDraft,
    };
  } catch {
    return emptyData();
  }
}

export function saveAppData(data: AppData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function appendSession(session: Session): void {
  const data = loadAppData();
  data.sessions = [session, ...data.sessions];
  saveAppData(data);
}

