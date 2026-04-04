"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Card,
  Group,
  MultiSelect,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconCheck, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import type { RoutineStep, StepTemplate } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";
import { formatDuration } from "@/lib/time";
import { ImageUploadField } from "./ImageUploadField";
import { modals } from "@mantine/modals";

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** Same cap as routine canvas (routine editor). */
function clampRoutineCanvasDurationSec(sec: number) {
  const m = Math.round(sec / 60);
  const c = Math.min(30, Math.max(1, m));
  return c * 60;
}

function newRoutineStepId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Selected = string | "new" | null;

/** Align with Library chrome: header, title, tabs, padding. */
const SECTIONS_TAB_COLUMN_MIN_HEIGHT = "calc(100dvh - 200px)";

export function SectionsTab() {
  const { data, update } = useAppData();

  const focusLibrary = data.focusLibrary ?? [];
  const stepLibrary = useMemo(() => data.stepLibrary ?? [], [data.stepLibrary]);
  const routines = useMemo(() => data.routines ?? [], [data.routines]);

  const [selectedId, setSelectedId] = useState<Selected>(null);

  const [draftName, setDraftName] = useState("");
  const [draftMinutes, setDraftMinutes] = useState<number | string>(5);
  const [draftFocusIds, setDraftFocusIds] = useState<string[]>([]);
  const [draftNote, setDraftNote] = useState("");
  const [draftImageDataUrl, setDraftImageDataUrl] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => (selectedId && selectedId !== "new" ? stepLibrary.find((s) => s.id === selectedId) ?? null : null),
    [selectedId, stepLibrary],
  );

  const routineIdsContainingTemplate = useMemo(() => {
    if (!selectedId || selectedId === "new") return [];
    const tid = selectedId;
    return routines.filter((r) => r.steps.some((s) => s.sectionTemplateId === tid)).map((r) => r.id);
  }, [routines, selectedId]);

  const loadDraftFromTemplate = useCallback((t: StepTemplate) => {
    setDraftName(t.name);
    setDraftMinutes(Math.round(t.durationSec / 60));
    setDraftFocusIds(t.focusIds ?? []);
    setDraftNote(t.note ?? "");
    setDraftImageDataUrl(t.imageDataUrl ?? null);
  }, []);

  const resetDraftNew = useCallback(() => {
    setDraftName("");
    setDraftMinutes(5);
    setDraftFocusIds([]);
    setDraftNote("");
    setDraftImageDataUrl(null);
  }, []);

  useEffect(() => {
    if (selectedId === "new") {
      resetDraftNew();
    } else if (selectedId) {
      const t = stepLibrary.find((s) => s.id === selectedId);
      if (t) loadDraftFromTemplate(t);
      else setSelectedId(null);
    } else {
      resetDraftNew();
    }
  }, [selectedId, stepLibrary, loadDraftFromTemplate, resetDraftNew]);

  const draftMinutesNum = useMemo(() => {
    const n = typeof draftMinutes === "number" ? draftMinutes : parseFloat(String(draftMinutes));
    return Number.isFinite(n) ? Math.max(1, Math.round(n)) : 5;
  }, [draftMinutes]);

  const isDirty = useMemo(() => {
    if (selectedId === "new") {
      return (
        draftName.trim().length > 0 ||
        draftMinutesNum !== 5 ||
        draftFocusIds.length > 0 ||
        draftNote.trim().length > 0 ||
        draftImageDataUrl != null
      );
    }
    if (!selectedTemplate) return false;
    return (
      draftName.trim() !== selectedTemplate.name ||
      draftMinutesNum !== Math.round(selectedTemplate.durationSec / 60) ||
      JSON.stringify(draftFocusIds) !== JSON.stringify(selectedTemplate.focusIds ?? []) ||
      (draftNote.trim() || "") !== (selectedTemplate.note ?? "") ||
      (draftImageDataUrl ?? null) !== (selectedTemplate.imageDataUrl ?? null)
    );
  }, [
    selectedId,
    selectedTemplate,
    draftName,
    draftMinutesNum,
    draftFocusIds,
    draftNote,
    draftImageDataUrl,
  ]);

  const discard = () => {
    if (selectedId === "new" || !selectedId) {
      setSelectedId(null);
      resetDraftNew();
      return;
    }
    if (selectedTemplate) loadDraftFromTemplate(selectedTemplate);
  };

  const save = () => {
    const name = draftName.trim();
    if (!name) return;

    if (selectedId === "new") {
      const section: StepTemplate = {
        id: newId("section"),
        name,
        durationSec: draftMinutesNum * 60,
        focusIds: draftFocusIds,
        note: draftNote.trim() || undefined,
        imageDataUrl: draftImageDataUrl ?? undefined,
      };
      update((prev) => ({
        ...prev,
        stepLibrary: [section, ...(prev.stepLibrary ?? [])],
      }));
      setSelectedId(section.id);
      return;
    }

    if (!selectedId || !selectedTemplate) return;

    update((prev) => ({
      ...prev,
      stepLibrary: (prev.stepLibrary ?? []).map((x) =>
        x.id === selectedId
          ? {
              ...x,
              name,
              durationSec: Math.max(60, draftMinutesNum * 60),
              focusIds: draftFocusIds,
              note: draftNote.trim() || undefined,
              imageDataUrl: draftImageDataUrl ?? undefined,
            }
          : x,
      ),
    }));
  };

  const onRoutinesForSectionChange = (nextIds: string[]) => {
    if (!selectedId || selectedId === "new") return;
    const templateId = selectedId;
    const prevIds = routines
      .filter((r) => r.steps.some((s) => s.sectionTemplateId === templateId))
      .map((r) => r.id);
    const added = nextIds.filter((id) => !prevIds.includes(id));
    if (added.length > 0 && !draftName.trim()) return;

    update((prev) => {
      const name = draftName.trim();
      const baseFields = {
        name,
        durationSec: clampRoutineCanvasDurationSec(Math.max(60, draftMinutesNum * 60)),
        focusIds: [...draftFocusIds],
        note: draftNote.trim() || undefined,
        imageDataUrl: draftImageDataUrl ?? undefined,
        sectionTemplateId: templateId,
      };

      const nextRoutines = (prev.routines ?? []).map((r) => {
        const shouldInclude = nextIds.includes(r.id);
        const linked = r.steps.filter((s) => s.sectionTemplateId === templateId);
        const withoutLinked = r.steps.filter((s) => s.sectionTemplateId !== templateId);

        if (!shouldInclude) {
          if (linked.length === 0) return r;
          const steps = withoutLinked;
          return {
            ...r,
            steps,
            totalDurationSec: steps.reduce((a, s) => a + s.durationSec, 0),
          };
        }

        if (linked.length === 0) {
          const steps = [...r.steps, { id: newRoutineStepId(), ...baseFields } satisfies RoutineStep];
          return {
            ...r,
            steps,
            totalDurationSec: steps.reduce((a, s) => a + s.durationSec, 0),
          };
        }

        const dupIds = new Set(linked.slice(1).map((s) => s.id));
        const trimmed = r.steps.filter((s) => !dupIds.has(s.id));
        const steps = trimmed.map((s) => (s.sectionTemplateId === templateId ? { ...s, ...baseFields } : s));
        return {
          ...r,
          steps,
          totalDurationSec: steps.reduce((a, s) => a + s.durationSec, 0),
        };
      });
      return { ...prev, routines: nextRoutines };
    });
  };

  const requestDelete = () => {
    if (!selectedTemplate || selectedId === "new" || !selectedId) return;
    modals.openConfirmModal({
      title: "Delete section",
      children: <Text size="sm">Are you sure you want to delete the section &quot;{selectedTemplate.name}&quot;?</Text>,
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        const sid = selectedId;
        update((prev) => ({
          ...prev,
          stepLibrary: (prev.stepLibrary ?? []).filter((x) => x.id !== sid),
          routines: (prev.routines ?? []).map((r) => {
            const steps = r.steps.filter((s) => s.sectionTemplateId !== sid);
            return {
              ...r,
              steps,
              totalDurationSec: steps.reduce((a, s) => a + s.durationSec, 0),
            };
          }),
        }));
        setSelectedId(null);
        resetDraftNew();
      },
    });
  };

  const cardStyle = {
    display: "flex" as const,
    flexDirection: "column" as const,
    minHeight: SECTIONS_TAB_COLUMN_MIN_HEIGHT,
  };

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" style={{ alignItems: "stretch" }}>
      <Card withBorder style={cardStyle}>
        <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
          <Group justify="space-between" align="center">
            <Text fw={600}>Sections</Text>
            <Tooltip label="New section">
              <ActionIcon
                variant="light"
                color="burgundy"
                aria-label="New section"
                onClick={() => setSelectedId("new")}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Text c="dimmed" size="sm">
            Select a section to edit, or add a new one.
          </Text>
          <Stack gap="xs" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {stepLibrary.length === 0 ? (
              <Text c="dimmed" size="sm">
                No sections yet. Tap + to create one.
              </Text>
            ) : (
              stepLibrary.map((s) => (
                <UnstyledButton
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border:
                      selectedId === s.id
                        ? "2px solid var(--mantine-color-burgundy-6, #862e2e)"
                        : "1px solid var(--mantine-color-default-border, #dee2e6)",
                    background:
                      selectedId === s.id ? "var(--mantine-color-burgundy-0, rgba(134,46,46,0.08))" : undefined,
                  }}
                >
                  <Text size="sm" fw={600} truncate>
                    {s.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatDuration(s.durationSec)}
                  </Text>
                </UnstyledButton>
              ))
            )}
          </Stack>
        </Stack>
      </Card>

      <Card withBorder style={cardStyle}>
        <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text fw={600}>{selectedId === "new" ? "New section" : selectedId ? "Edit section" : "Details"}</Text>
            {selectedId ? (
              <Group gap={4} wrap="nowrap">
                {selectedId !== "new" && selectedTemplate ? (
                  <Tooltip label="Delete section">
                    <ActionIcon variant="subtle" color="red" aria-label="Delete section" onClick={requestDelete}>
                      <IconTrash size={20} />
                    </ActionIcon>
                  </Tooltip>
                ) : null}
                <Tooltip label={selectedId === "new" ? "Cancel" : "Discard changes"}>
                  <ActionIcon
                    variant="subtle"
                    aria-label={selectedId === "new" ? "Cancel" : "Discard changes"}
                    onClick={discard}
                    disabled={selectedId === "new" ? false : !isDirty}
                  >
                    <IconX size={20} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={selectedId === "new" ? "Add section" : "Save"}>
                  <ActionIcon
                    variant="light"
                    color="burgundy"
                    aria-label={selectedId === "new" ? "Add section" : "Save"}
                    disabled={!draftName.trim()}
                    onClick={save}
                  >
                    <IconCheck size={20} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            ) : null}
          </Group>

          {!selectedId ? (
            <Text c="dimmed" size="sm" py="xl">
              Choose a section from the list, or tap + to create a new template.
            </Text>
          ) : (
            <Stack gap="sm" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <TextInput label="Name" value={draftName} onChange={(e) => setDraftName(e.currentTarget.value)} />
              <NumberInput label="Minutes" min={1} max={120} value={draftMinutes} onChange={setDraftMinutes} />
              <MultiSelect
                label="Focus"
                data={focusLibrary.map((f) => ({ value: f.id, label: f.label }))}
                value={draftFocusIds}
                onChange={setDraftFocusIds}
                searchable
                comboboxProps={{ withinPortal: true }}
              />
              <Textarea
                label="Note"
                description="Shown during practice"
                placeholder="Any cues or reminders…"
                rows={3}
                value={draftNote}
                onChange={(e) => setDraftNote(e.currentTarget.value)}
              />
              <ImageUploadField dataUrl={draftImageDataUrl} onChange={setDraftImageDataUrl} />

              <Stack gap="xs" mt="xs">
                <Text size="sm" fw={500}>
                  Routines that include this section
                </Text>
                {selectedId === "new" ? (
                  <Text size="xs" c="dimmed">
                    Save the section first to link it to routines.
                  </Text>
                ) : routines.length === 0 ? (
                  <Text size="xs" c="dimmed">
                    Create a routine under Library → Routines first.
                  </Text>
                ) : (
                  <MultiSelect
                    aria-label="Routines that include this section"
                    description="Tick routines to add this section; untick to remove it. Uses the form above (include unsaved edits). Per-section duration on routines is capped at 30 minutes."
                    placeholder="Pick routines"
                    data={routines.map((r) => ({ value: r.id, label: r.name }))}
                    value={routineIdsContainingTemplate}
                    onChange={(v) => onRoutinesForSectionChange(v ?? [])}
                    searchable
                    comboboxProps={{ withinPortal: true }}
                  />
                )}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Card>
    </SimpleGrid>
  );
}
