import type { FocusItem, StepTemplate } from "./model";

export function normDisplay(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Pick a display name that is not in `takenNormalized` (case-insensitive).
 * If `original` is free, use it; else `original2`, `original3`, …
 * Mutates `takenNormalized` with the chosen name's normalized form.
 */
export function allocateUniqueDisplayName(original: string, takenNormalized: Set<string>): string {
  let base = original.trim();
  if (!base) base = "Untitled";
  const key = (name: string) => normDisplay(name);
  let candidate = base;
  if (!takenNormalized.has(key(candidate))) {
    takenNormalized.add(key(candidate));
    return candidate;
  }
  let n = 2;
  for (; n < 100000; n += 1) {
    candidate = `${base}${n}`;
    if (!takenNormalized.has(key(candidate))) {
      takenNormalized.add(key(candidate));
      return candidate;
    }
  }
  candidate = `${base}${Date.now()}`;
  takenNormalized.add(key(candidate));
  return candidate;
}

export function isSectionNameTaken(
  stepLibrary: StepTemplate[],
  candidate: string,
  excludeSectionId: string | null,
): boolean {
  const k = normDisplay(candidate);
  if (!k) return false;
  return stepLibrary.some((s) => s.id !== excludeSectionId && normDisplay(s.name) === k);
}

export function isFocusLabelTaken(
  focusLibrary: FocusItem[],
  candidate: string,
  excludeFocusId: string | null,
): boolean {
  const k = normDisplay(candidate);
  if (!k) return false;
  return focusLibrary.some((f) => f.id !== excludeFocusId && normDisplay(f.label) === k);
}

export function normalizedSectionNames(stepLibrary: StepTemplate[]): Set<string> {
  return new Set(stepLibrary.map((s) => normDisplay(s.name)));
}

export function normalizedFocusLabels(focusLibrary: FocusItem[]): Set<string> {
  return new Set(focusLibrary.map((f) => normDisplay(f.label)));
}
