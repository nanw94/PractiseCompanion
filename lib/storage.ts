import type {
  AppData,
  FocusItem,
  RoutineTemplate,
  Session,
  StepTemplate,
  STORAGE_VERSION,
} from "./model";
import { STORAGE_VERSION as CURRENT_VERSION } from "./model";

const STORAGE_KEY = "practice-companion:data";

function emptyData(): AppData {
  const focusLibrary: FocusItem[] = [
    { id: "posture", label: "Posture" },
    { id: "bow", label: "Relaxed bow" },
    { id: "intonation", label: "Intonation" },
    { id: "rhythm", label: "Rhythm" },
  ];

  const stepLibrary: StepTemplate[] = [
    { id: "lib_warmup", name: "Warm-up", durationSec: 5 * 60, focusIds: ["posture", "bow"] },
    { id: "lib_scales", name: "Scales", durationSec: 10 * 60, focusIds: ["intonation", "rhythm"] },
  ];

  const defaultRoutine: RoutineTemplate = {
    id: "default",
    name: "Daily practice",
    totalDurationSec: 20 * 60,
    steps: [
      { id: "warmup", name: "Warm-up", durationSec: 5 * 60, focusIds: ["posture", "bow"] },
      { id: "technique", name: "Technique", durationSec: 10 * 60, focusIds: ["intonation", "rhythm"] },
      { id: "repertoire", name: "Repertoire", durationSec: 5 * 60, focusIds: [] },
    ],
  };

  return {
    version: CURRENT_VERSION,
    sessions: [],
    presets: [],
    routines: [defaultRoutine],
    stepLibrary,
    focusLibrary,
  };
}

export function loadAppData(): AppData {
  if (typeof window === "undefined") return emptyData();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData();

  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (parsed.version === (CURRENT_VERSION as typeof STORAGE_VERSION)) {
      return {
        version: CURRENT_VERSION,
        sessions: Array.isArray(parsed.sessions) ? (parsed.sessions as Session[]) : [],
        presets: Array.isArray(parsed.presets) ? parsed.presets : [],
        routines: Array.isArray((parsed as any).routines)
          ? ((parsed as any).routines as RoutineTemplate[])
          : emptyData().routines,
        stepLibrary: Array.isArray((parsed as any).stepLibrary)
          ? ((parsed as any).stepLibrary as StepTemplate[])
          : emptyData().stepLibrary,
        focusLibrary: Array.isArray((parsed as any).focusLibrary)
          ? ((parsed as any).focusLibrary as FocusItem[])
          : emptyData().focusLibrary,
        activeRun: (parsed as any).activeRun,
        lastCompletedRun: (parsed as any).lastCompletedRun,
      };
    }

    // v1 -> v3 best-effort migration
    if (parsed.version === 1) {
      const base = emptyData();
      const sessions = Array.isArray(parsed.sessions) ? (parsed.sessions as Session[]) : [];
      const presets = Array.isArray(parsed.presets) ? parsed.presets : [];
      return { ...base, sessions, presets };
    }

    // v2 -> v3 focus text -> focus ids migration
    if ((parsed as any).version === 2) {
      const base = emptyData();
      const sessions = Array.isArray(parsed.sessions) ? (parsed.sessions as Session[]) : [];
      const presets = Array.isArray(parsed.presets) ? parsed.presets : [];
      const routinesV2 = Array.isArray((parsed as any).routines) ? (parsed as any).routines : [];

      const focusByLabel = new Map<string, FocusItem>();
      for (const f of base.focusLibrary) focusByLabel.set(f.label, f);

      const routines: RoutineTemplate[] = routinesV2.map((r: any) => {
        const steps = Array.isArray(r.steps) ? r.steps : [];
        return {
          id: String(r.id),
          name: String(r.name ?? "Routine"),
          totalDurationSec: Number(r.totalDurationSec ?? 0) || 0,
          steps: steps.map((s: any) => {
            const focusText = typeof s.focus === "string" ? s.focus.trim() : "";
            const focusIds: string[] = [];
            if (focusText) {
              let item = focusByLabel.get(focusText);
              if (!item) {
                item = { id: `focus_${focusByLabel.size + 1}`, label: focusText };
                focusByLabel.set(focusText, item);
              }
              focusIds.push(item.id);
            }
            return {
              id: String(s.id),
              name: String(s.name ?? "Section"),
              durationSec: Number(s.durationSec ?? 60) || 60,
              focusIds,
            };
          }),
        };
      });

      return {
        ...base,
        sessions,
        presets,
        routines: routines.length ? routines : base.routines,
        focusLibrary: Array.from(focusByLabel.values()),
        activeRun: (parsed as any).activeRun,
        lastCompletedRun: (parsed as any).lastCompletedRun,
      };
    }

    return emptyData();
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

