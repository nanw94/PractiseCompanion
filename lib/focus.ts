import type { FocusItem, Id } from "@/lib/model";

export function focusLabelsById(focusLibrary: FocusItem[]) {
  const map = new Map<Id, string>();
  for (const f of focusLibrary) map.set(f.id, f.label);
  return map;
}

export function resolveFocusLabels(focusIds: Id[], focusLibrary: FocusItem[]) {
  const byId = focusLabelsById(focusLibrary);
  return focusIds.map((id) => byId.get(id)).filter((x): x is string => Boolean(x));
}

