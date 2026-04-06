import {
  allocateUniqueDisplayName,
  normalizedFocusLabels,
  normalizedSectionNames,
} from "./display-name-unique";
import type { AppData, FocusItem, Id, StepTemplate } from "./model";
import { STORAGE_VERSION } from "./model";

/** Current share format: sections (no focus ids) + focus labels only. */
export const LIBRARY_SHARE_VERSION = 2 as const;

/** Legacy v1 (included routines; still readable for import of sections/focus only). */
export const LIBRARY_SHARE_VERSION_LEGACY = 1 as const;

export type LibraryShareSectionPayload = {
  name: string;
  durationSec: number;
  note?: string;
  imageDataUrl?: string;
};

export type LibraryShareExportV2 = {
  libraryShareVersion: typeof LIBRARY_SHARE_VERSION;
  exportedAt: string;
  sections: LibraryShareSectionPayload[];
  focus: { label: string }[];
};

function stripSectionForExport(t: StepTemplate): LibraryShareSectionPayload {
  return {
    name: t.name,
    durationSec: t.durationSec,
    note: t.note,
    imageDataUrl: t.imageDataUrl,
  };
}

export function buildLibraryShareExport(data: Pick<AppData, "stepLibrary" | "focusLibrary">): LibraryShareExportV2 {
  return {
    libraryShareVersion: LIBRARY_SHARE_VERSION,
    exportedAt: new Date().toISOString(),
    sections: (data.stepLibrary ?? []).map(stripSectionForExport),
    focus: (data.focusLibrary ?? []).map((f) => ({ label: f.label })),
  };
}

export type ParsedLibraryImport = {
  sections: LibraryShareSectionPayload[];
  focus: { label: string }[];
};

/**
 * Append imported sections and focus to existing libraries. Never removes or edits existing rows.
 * Colliding names get numeric suffixes (see `allocateUniqueDisplayName`). New sections always have `focusIds: []`.
 */
export function appendLibraryShareImport(params: {
  stepLibrary: StepTemplate[];
  focusLibrary: FocusItem[];
  parsed: ParsedLibraryImport;
  newSectionId: () => string;
  newFocusId: () => string;
}): { stepLibrary: StepTemplate[]; focusLibrary: FocusItem[] } {
  const { stepLibrary: prevSections, focusLibrary: prevFocus, parsed, newSectionId, newFocusId } = params;
  const takenSections = normalizedSectionNames(prevSections);
  const takenFocus = normalizedFocusLabels(prevFocus);

  const newSections: StepTemplate[] = parsed.sections.map((row) => {
    const name = allocateUniqueDisplayName(row.name || "Untitled", takenSections);
    return {
      id: newSectionId(),
      name,
      durationSec: row.durationSec,
      note: row.note,
      imageDataUrl: row.imageDataUrl,
      focusIds: [] as Id[],
    };
  });

  const newFocus: FocusItem[] = parsed.focus.map((row) => {
    const label = allocateUniqueDisplayName(row.label || "Focus", takenFocus);
    return { id: newFocusId(), label };
  });

  return {
    stepLibrary: [...prevSections, ...newSections],
    focusLibrary: [...prevFocus, ...newFocus],
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

function parseSectionRow(x: unknown): LibraryShareSectionPayload | null {
  if (!isRecord(x)) return null;
  if (typeof x.name !== "string") return null;
  const durationSec = typeof x.durationSec === "number" && Number.isFinite(x.durationSec) ? x.durationSec : 300;
  const note = typeof x.note === "string" ? x.note : undefined;
  const imageDataUrl = typeof x.imageDataUrl === "string" ? x.imageDataUrl : undefined;
  return {
    name: x.name,
    durationSec: Math.max(60, durationSec),
    note,
    imageDataUrl,
  };
}

function parseFocusRow(x: unknown): { label: string } | null {
  if (!isRecord(x)) return null;
  if (typeof x.label !== "string" || !x.label.trim()) return null;
  return { label: x.label.trim() };
}

/**
 * Parse v2 share file, legacy v1, or full app export into importable sections + focus (no routines).
 */
export function parseLibraryShareImport(input: unknown): ParsedLibraryImport | null {
  if (!isRecord(input)) return null;

  if (input.libraryShareVersion === LIBRARY_SHARE_VERSION) {
    if (!Array.isArray(input.sections) || !Array.isArray(input.focus)) return null;
    const sections: LibraryShareSectionPayload[] = [];
    for (const row of input.sections) {
      const p = parseSectionRow(row);
      if (p) sections.push(p);
    }
    const focus: { label: string }[] = [];
    for (const row of input.focus) {
      const f = parseFocusRow(row);
      if (f) focus.push(f);
    }
    return { sections, focus };
  }

  if (input.libraryShareVersion === LIBRARY_SHARE_VERSION_LEGACY) {
    if (!Array.isArray(input.stepLibrary) || !Array.isArray(input.focusLibrary)) return null;
    const sections: LibraryShareSectionPayload[] = [];
    for (const row of input.stepLibrary) {
      if (!isRecord(row)) continue;
      const p = parseSectionRow({
        ...row,
        name: row.name,
        durationSec: row.durationSec,
        note: row.note,
        imageDataUrl: row.imageDataUrl,
      });
      if (p) sections.push(p);
    }
    const focus: { label: string }[] = [];
    for (const row of input.focusLibrary) {
      if (!isRecord(row) || typeof row.label !== "string") continue;
      const f = parseFocusRow({ label: row.label });
      if (f) focus.push(f);
    }
    return { sections, focus };
  }

  if (input.version === STORAGE_VERSION) {
    const app = input as Partial<AppData>;
    if (!Array.isArray(app.stepLibrary) || !Array.isArray(app.focusLibrary)) return null;
    const sections: LibraryShareSectionPayload[] = [];
    for (const row of app.stepLibrary) {
      const p = parseSectionRow(row as unknown);
      if (p) sections.push(p);
    }
    const focus: { label: string }[] = [];
    for (const row of app.focusLibrary) {
      const f = parseFocusRow(row as unknown);
      if (f) focus.push(f);
    }
    return { sections, focus };
  }

  return null;
}
