import type { RoutineStep, RoutineTemplate, StepTemplate } from "./model";

const ROUTINE_MIN_MIN = 1;
const ROUTINE_MAX_MIN = 30;

export function clampRoutineSectionDurationSec(sec: number) {
  const minutes = Math.round(sec / 60);
  const clampedMinutes = Math.min(ROUTINE_MAX_MIN, Math.max(ROUTINE_MIN_MIN, minutes));
  return clampedMinutes * 60;
}

export function linkedRoutineStepFieldsFromTemplate(
  template: StepTemplate,
): Pick<RoutineStep, "name" | "durationSec" | "focusIds" | "note" | "imageDataUrl" | "sectionTemplateId"> {
  return {
    name: template.name,
    durationSec: clampRoutineSectionDurationSec(template.durationSec),
    focusIds: [...(template.focusIds ?? [])],
    note: template.note,
    imageDataUrl: template.imageDataUrl,
    sectionTemplateId: template.id,
  };
}

export function syncTemplateIntoLinkedRoutineSteps(
  routines: RoutineTemplate[],
  template: StepTemplate,
): RoutineTemplate[] {
  const patch = linkedRoutineStepFieldsFromTemplate(template);
  return routines.map((routine) => {
    let touched = false;
    const steps = routine.steps.map((step) => {
      if (step.sectionTemplateId !== template.id) return step;
      touched = true;
      return { ...step, ...patch };
    });
    if (!touched) return routine;
    return {
      ...routine,
      steps,
      totalDurationSec: steps.reduce((acc, s) => acc + s.durationSec, 0),
    };
  });
}
