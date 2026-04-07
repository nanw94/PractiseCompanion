import { describe, expect, it } from "vitest";
import type { RoutineTemplate, StepTemplate } from "./model";
import {
  clampRoutineSectionDurationSec,
  linkedRoutineStepFieldsFromTemplate,
  syncTemplateIntoLinkedRoutineSteps,
} from "./routine-section-sync";

function makeTemplate(overrides: Partial<StepTemplate> = {}): StepTemplate {
  return {
    id: "sec_1",
    name: "Warmup",
    durationSec: 5 * 60,
    focusIds: ["f1"],
    note: "Steady tempo",
    ...overrides,
  };
}

function makeRoutine(overrides: Partial<RoutineTemplate> = {}): RoutineTemplate {
  return {
    id: "r_1",
    name: "Daily",
    totalDurationSec: 11 * 60,
    steps: [
      { id: "a", name: "A", durationSec: 3 * 60, focusIds: [] },
      { id: "b", name: "B", durationSec: 8 * 60, focusIds: [], sectionTemplateId: "sec_1" },
    ],
    ...overrides,
  };
}

describe("routine section synchronization", () => {
  it("builds routine-linked fields from a template", () => {
    const template = makeTemplate({ durationSec: 45 * 60, focusIds: ["f1", "f2"] });
    const fields = linkedRoutineStepFieldsFromTemplate(template);

    expect(fields).toEqual({
      name: "Warmup",
      durationSec: 30 * 60,
      focusIds: ["f1", "f2"],
      note: "Steady tempo",
      imageDataUrl: undefined,
      sectionTemplateId: "sec_1",
    });

    // Returned arrays should be decoupled from the template object.
    template.focusIds.push("f3");
    expect(fields.focusIds).toEqual(["f1", "f2"]);
  });

  it("synchronizes all routines containing the template", () => {
    const template = makeTemplate({
      name: "Updated Warmup",
      durationSec: 40 * 60,
      focusIds: ["f2"],
      note: "Keep wrist relaxed",
      imageDataUrl: "data:image/png;base64,AAAA",
    });
    const routines = [
      makeRoutine(),
      makeRoutine({
        id: "r_2",
        steps: [{ id: "x", name: "X", durationSec: 2 * 60, focusIds: [] }],
        totalDurationSec: 2 * 60,
      }),
    ];

    const next = syncTemplateIntoLinkedRoutineSteps(routines, template);

    expect(next[0].steps[1]).toMatchObject({
      id: "b",
      sectionTemplateId: "sec_1",
      name: "Updated Warmup",
      durationSec: 30 * 60,
      focusIds: ["f2"],
      note: "Keep wrist relaxed",
      imageDataUrl: "data:image/png;base64,AAAA",
    });
    expect(next[0].totalDurationSec).toBe(33 * 60);

    // Routine without linked step should stay unchanged.
    expect(next[1]).toEqual(routines[1]);
  });

  it("clamps section duration to routine limits", () => {
    expect(clampRoutineSectionDurationSec(10)).toBe(60);
    expect(clampRoutineSectionDurationSec(61 * 60)).toBe(30 * 60);
    expect(clampRoutineSectionDurationSec(5 * 60)).toBe(5 * 60);
  });
});
