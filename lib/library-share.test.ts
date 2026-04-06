import { describe, expect, it } from "vitest";
import {
  appendLibraryShareImport,
  buildLibraryShareExport,
  LIBRARY_SHARE_VERSION,
  parseLibraryShareImport,
} from "./library-share";
import type { AppData, RoutineTemplate, Session } from "./model";
import { STORAGE_VERSION } from "./model";

function minimalApp(overrides: Partial<AppData> = {}): AppData {
  return {
    version: STORAGE_VERSION,
    sessions: [],
    presets: [],
    routines: [],
    stepLibrary: [],
    focusLibrary: [],
    ...overrides,
  };
}

describe("library share: A exports → B imports (merge, no data loss)", () => {
  it("keeps all of B's sections, focus, sessions, and routines; renames colliding import names", () => {
    const bSessions: Session[] = [
      {
        id: "sess_b1",
        startedAt: "2026-01-01T10:00:00.000Z",
        endedAt: "2026-01-01T10:30:00.000Z",
        durationSec: 1800,
        tags: ["b-tag"],
        notes: "B history",
      },
    ];
    const bRoutines: RoutineTemplate[] = [
      {
        id: "routine_b1",
        name: "B Morning",
        totalDurationSec: 600,
        steps: [
          {
            id: "step_b1",
            name: "Warmup",
            durationSec: 120,
            focusIds: ["bf1"],
            sectionTemplateId: "b_sec_warmup",
          },
        ],
      },
    ];

    const bApp = minimalApp({
      sessions: bSessions,
      routines: bRoutines,
      stepLibrary: [
        {
          id: "b_sec_warmup",
          name: "Warmup",
          durationSec: 120,
          focusIds: ["bf1"],
          note: "B warmup note",
        },
        {
          id: "b_sec_only_b",
          name: "Only on B",
          durationSec: 90,
          focusIds: [],
        },
      ],
      focusLibrary: [
        { id: "bf1", label: "Breath" },
        { id: "bf2", label: "Only B focus" },
      ],
    });

    const aExport = buildLibraryShareExport({
      stepLibrary: [
        {
          id: "a_sec1",
          name: "Warmup",
          durationSec: 400,
          focusIds: ["should_not_appear_in_file"],
          note: "From user A",
          imageDataUrl: "data:image/png;base64,QUFB",
        },
        { id: "a_sec2", name: "Scales", durationSec: 600, focusIds: [], note: "A scales" },
      ],
      focusLibrary: [
        { id: "a_f1", label: "Breath" },
        { id: "a_f2", label: "Tone" },
      ],
    });

    const wireText = JSON.stringify(aExport);
    const parsed = parseLibraryShareImport(JSON.parse(wireText) as unknown);
    expect(parsed).not.toBeNull();

    let sectionSeq = 0;
    let focusSeq = 0;
    const { stepLibrary, focusLibrary } = appendLibraryShareImport({
      stepLibrary: bApp.stepLibrary,
      focusLibrary: bApp.focusLibrary,
      parsed: parsed!,
      newSectionId: () => `imported_sec_${++sectionSeq}`,
      newFocusId: () => `imported_foc_${++focusSeq}`,
    });

    const merged: AppData = { ...bApp, stepLibrary, focusLibrary };

    expect(merged.sessions).toEqual(bApp.sessions);
    expect(merged.routines).toEqual(bApp.routines);
    expect(merged.presets).toEqual(bApp.presets);

    expect(merged.stepLibrary).toHaveLength(4);
    expect(merged.stepLibrary.slice(0, 2)).toEqual(bApp.stepLibrary);
    expect(merged.focusLibrary).toHaveLength(4);
    expect(merged.focusLibrary.slice(0, 2)).toEqual(bApp.focusLibrary);

    const importedWarmup = merged.stepLibrary.find((s) => s.id === "imported_sec_1");
    expect(importedWarmup).toBeDefined();
    expect(importedWarmup!.name).toBe("Warmup2");
    expect(importedWarmup!.durationSec).toBe(400);
    expect(importedWarmup!.note).toBe("From user A");
    expect(importedWarmup!.imageDataUrl).toBe("data:image/png;base64,QUFB");
    expect(importedWarmup!.focusIds).toEqual([]);

    const importedScales = merged.stepLibrary.find((s) => s.id === "imported_sec_2");
    expect(importedScales?.name).toBe("Scales");
    expect(importedScales?.note).toBe("A scales");

    const importedBreath = merged.focusLibrary.find((f) => f.id === "imported_foc_1");
    expect(importedBreath?.label).toBe("Breath2");
    const importedTone = merged.focusLibrary.find((f) => f.id === "imported_foc_2");
    expect(importedTone?.label).toBe("Tone");
  });

  it("treats section names and focus labels as separate pools (same spelling does not cross-collide)", () => {
    const bApp = minimalApp({
      stepLibrary: [{ id: "s1", name: "X", durationSec: 60, focusIds: [] }],
      focusLibrary: [{ id: "f1", label: "Y" }],
    });
    const file = buildLibraryShareExport({
      stepLibrary: [{ id: "a1", name: "Y", durationSec: 120, focusIds: [] }],
      focusLibrary: [{ id: "a2", label: "X" }],
    });
    const parsed = parseLibraryShareImport(JSON.parse(JSON.stringify(file)) as unknown)!;
    const { stepLibrary, focusLibrary } = appendLibraryShareImport({
      stepLibrary: bApp.stepLibrary,
      focusLibrary: bApp.focusLibrary,
      parsed,
      newSectionId: () => "ns1",
      newFocusId: () => "nf1",
    });
    expect(stepLibrary.find((s) => s.id === "ns1")?.name).toBe("Y");
    expect(focusLibrary.find((f) => f.id === "nf1")?.label).toBe("X");
  });

  it("export v2 payload has no focusIds on sections and round-trips", () => {
    const payload = buildLibraryShareExport({
      stepLibrary: [{ id: "z", name: "N", durationSec: 180, focusIds: ["f"], note: "n" }],
      focusLibrary: [{ id: "f", label: "L" }],
    });
    expect(payload.libraryShareVersion).toBe(LIBRARY_SHARE_VERSION);
    const row = payload.sections[0] as Record<string, unknown>;
    expect("focusIds" in row).toBe(false);
    const again = parseLibraryShareImport(JSON.parse(JSON.stringify(payload)) as unknown);
    expect(again?.sections[0]).toMatchObject({ name: "N", durationSec: 180, note: "n" });
    expect(again?.focus[0]).toEqual({ label: "L" });
  });

  it("is case-insensitive for collisions: B has Warmup, A exports warmup → imported name gets suffix", () => {
    const bApp = minimalApp({
      stepLibrary: [{ id: "b1", name: "Warmup", durationSec: 60, focusIds: [] }],
      focusLibrary: [],
    });
    const file = buildLibraryShareExport({
      stepLibrary: [{ id: "a1", name: "warmup", durationSec: 200, focusIds: [] }],
      focusLibrary: [],
    });
    const parsed = parseLibraryShareImport(JSON.parse(JSON.stringify(file)) as unknown)!;
    const { stepLibrary } = appendLibraryShareImport({
      stepLibrary: bApp.stepLibrary,
      focusLibrary: [],
      parsed,
      newSectionId: () => "new1",
      newFocusId: () => "nf",
    });
    expect(stepLibrary[0].name).toBe("Warmup");
    expect(stepLibrary[1].name).toBe("warmup2");
  });
});
