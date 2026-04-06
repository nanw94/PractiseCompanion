"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ActionIcon,
  Button,
  Card,
  Container,
  Group,
  MultiSelect,
  NumberInput,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconCheck,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import type { CollisionDetection } from "@dnd-kit/core";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { isSectionNameTaken } from "@/lib/display-name-unique";
import type { AppData, FocusItem, RoutineStep, RoutineTemplate, StepTemplate } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";
import { useGuardedNavigate } from "@/hooks/useGuardedNavigate";
import { formatDuration } from "@/lib/time";
import { MusicPageShell } from "@/components/MusicPageShell";
import { ImageUploadField } from "@/app/library/ImageUploadField";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const ROUTINE_MIN_MIN = 1;
const ROUTINE_MAX_MIN = 30;

function clampRoutineMinutesSec(sec: number) {
  const m = Math.round(sec / 60);
  const c = Math.min(ROUTINE_MAX_MIN, Math.max(ROUTINE_MIN_MIN, m));
  return c * 60;
}

/** Prefix canvas step IDs so we can distinguish them from library tile IDs */
const CANVAS_PREFIX = "canvas:";
const ROUTINE_DROP_ID = "routine-dropzone";

/** Collision: when dragging from library, only consider canvas dropzone + sortables (not unrelated UI). */
const routineEditCollisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  if (!activeId.startsWith(CANVAS_PREFIX)) {
    const relevant = args.droppableContainers.filter(
      (c) => c.id === ROUTINE_DROP_ID || String(c.id).startsWith(CANVAS_PREFIX),
    );
    if (relevant.length === 0) return [];
    return closestCenter({ ...args, droppableContainers: relevant });
  }
  return closestCenter(args);
};

function buildStepsAfterDropFromLibrary(
  steps: RoutineStep[],
  tpl: StepTemplate,
  insertBeforeStepId: string | null,
): RoutineStep[] {
  const durationSec = clampRoutineMinutesSec(tpl.durationSec);
  const baseFields = {
    name: tpl.name,
    durationSec,
    focusIds: tpl.focusIds ?? [],
    note: tpl.note,
    imageDataUrl: tpl.imageDataUrl,
    sectionTemplateId: tpl.id,
  };
  const dupIds = new Set(
    steps.filter((s) => s.sectionTemplateId === tpl.id).slice(1).map((s) => s.id),
  );
  const working = steps.filter((s) => !dupIds.has(s.id));

  let targetPos: number;
  if (insertBeforeStepId == null) {
    targetPos = working.length;
  } else {
    const i = working.findIndex((s) => s.id === insertBeforeStepId);
    targetPos = i === -1 ? working.length : i;
  }

  const existingIdx = working.findIndex((s) => s.sectionTemplateId === tpl.id);

  if (existingIdx === -1) {
    const newStep: RoutineStep = { id: newId(), ...baseFields };
    return [...working.slice(0, targetPos), newStep, ...working.slice(targetPos)];
  }

  const merged: RoutineStep = { ...working[existingIdx], ...baseFields };
  const without = working.filter((_, i) => i !== existingIdx);
  let pos = targetPos;
  if (existingIdx < targetPos) pos -= 1;
  pos = Math.max(0, Math.min(pos, without.length));
  return [...without.slice(0, pos), merged, ...without.slice(pos)];
}

function stopDragPropagation(e: React.PointerEvent | React.MouseEvent) {
  e.stopPropagation();
}

type UpdateFn = (recipe: (prev: AppData) => AppData) => void;

function EditSavedSectionForm({
  initial,
  focusLibrary,
  onCancel,
  onSave,
}: {
  initial: StepTemplate;
  focusLibrary: FocusItem[];
  onCancel: () => void;
  onSave: (next: StepTemplate) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [minutes, setMinutes] = useState<number | string>(Math.round(initial.durationSec / 60));
  const [focusIds, setFocusIds] = useState<string[]>(initial.focusIds ?? []);
  const [note, setNote] = useState(initial.note ?? "");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(initial.imageDataUrl ?? null);

  return (
    <Stack gap="sm">
      <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
      <NumberInput label="Minutes" min={1} max={120} value={minutes} onChange={setMinutes} />
      <MultiSelect
        label="Focus"
        data={focusLibrary.map((f) => ({ value: f.id, label: f.label }))}
        value={focusIds}
        onChange={setFocusIds}
        searchable
        comboboxProps={{ withinPortal: true }}
      />
      <Textarea
        label="Note"
        description="Shown during practice"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
      />
      <ImageUploadField dataUrl={imageDataUrl} onChange={setImageDataUrl} />
      <Group justify="flex-end" mt="xs">
        <Button variant="default" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!name.trim()}
          onClick={() => {
            const raw = typeof minutes === "number" ? minutes : parseFloat(String(minutes));
            const m = Number.isFinite(raw) ? Math.max(1, Math.min(120, Math.round(raw))) : 1;
            onSave({
              ...initial,
              name: name.trim(),
              durationSec: m * 60,
              focusIds,
              note: note.trim() || undefined,
              imageDataUrl: imageDataUrl ?? undefined,
            });
          }}
        >
          Save
        </Button>
      </Group>
    </Stack>
  );
}

function openEditSavedSectionModal(
  tpl: StepTemplate,
  focusLibrary: FocusItem[],
  update: UpdateFn,
  commit: () => Promise<boolean>,
) {
  modals.open({
    title: "Edit saved section",
    size: "md",
    children: (
      <EditSavedSectionForm
        initial={tpl}
        focusLibrary={focusLibrary}
        onCancel={() => modals.closeAll()}
        onSave={(next) => {
          const name = next.name.trim();
          if (!name) return;
          update((prev) => {
            const lib = prev.stepLibrary ?? [];
            if (isSectionNameTaken(lib, name, next.id)) {
              queueMicrotask(() =>
                modals.open({
                  title: "Name in use",
                  children: (
                    <Text size="sm">A section with this name already exists. Choose a different name.</Text>
                  ),
                }),
              );
              return prev;
            }
            queueMicrotask(() => {
              void commit();
              modals.closeAll();
            });
            return {
              ...prev,
              stepLibrary: lib.map((x) => (x.id === next.id ? next : x)),
            };
          });
        }}
      />
    ),
  });
}

function EditCanvasStepForm({
  initial,
  focusLibrary,
  onCancel,
  onSave,
}: {
  initial: RoutineStep;
  focusLibrary: FocusItem[];
  onCancel: () => void;
  onSave: (next: RoutineStep) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [minutes, setMinutes] = useState(
    Math.min(ROUTINE_MAX_MIN, Math.max(ROUTINE_MIN_MIN, Math.round(initial.durationSec / 60))),
  );
  const [focusIds, setFocusIds] = useState<string[]>(initial.focusIds ?? []);

  return (
    <Stack gap="sm">
      <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
      <Slider
        min={ROUTINE_MIN_MIN}
        max={ROUTINE_MAX_MIN}
        step={1}
        value={minutes}
        onChange={setMinutes}
        label={(v) => `${v} min`}
        marks={[
          { value: ROUTINE_MIN_MIN, label: `${ROUTINE_MIN_MIN}` },
          { value: ROUTINE_MAX_MIN, label: `${ROUTINE_MAX_MIN}` },
        ]}
      />
      <MultiSelect
        label="Focus"
        data={focusLibrary.map((f) => ({ value: f.id, label: f.label }))}
        value={focusIds}
        onChange={setFocusIds}
        searchable
        comboboxProps={{ withinPortal: true }}
      />
      <Group justify="flex-end" mt="xs">
        <Button variant="default" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!name.trim()}
          onClick={() =>
            onSave({
              ...initial,
              name: name.trim(),
              durationSec: clampRoutineMinutesSec(minutes * 60),
              focusIds,
            })
          }
        >
          Save
        </Button>
      </Group>
    </Stack>
  );
}

function openEditCanvasStepModal(
  step: RoutineStep,
  focusLibrary: FocusItem[],
  onCommit: (next: RoutineStep) => void,
) {
  modals.open({
    title: "Edit section",
    size: "md",
    children: (
      <EditCanvasStepForm
        initial={step}
        focusLibrary={focusLibrary}
        onCancel={() => modals.closeAll()}
        onSave={(next) => {
          onCommit(next);
          modals.closeAll();
        }}
      />
    ),
  });
}

export default function RoutineEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, update, commit } = useAppData();
  const guardedPush = useGuardedNavigate();
  const isLandscape = useMediaQuery("(orientation: landscape)") ?? false;
  const routine = (data.routines ?? []).find((r) => r.id === id) ?? null;
  const focusLibrary = data.focusLibrary ?? [];
  const stepLibrary = data.stepLibrary ?? [];

  const total = useMemo(() => {
    if (!routine) return 0;
    return routine.steps.reduce((acc, s) => acc + s.durationSec, 0);
  }, [routine]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!routine) {
    return (
      <Container size="lg">
        <MusicPageShell eyebrow="Edit routine" title="Routine not found" hint="This routine may have been removed.">
          <Button variant="default" component={Link} href="/library?tab=routines" prefetch>
            Back to Library
          </Button>
        </MusicPageShell>
      </Container>
    );
  }

  const updateRoutine = (next: RoutineTemplate) => {
    update((prev) => ({
      ...prev,
      routines: (prev.routines ?? []).map((r) => (r.id === next.id ? next : r)),
    }));
  };

  const updateStepDuration = (stepId: string, durationSec: number) => {
    const nextSec = clampRoutineMinutesSec(durationSec);
    const nextSteps = routine.steps.map((s) => (s.id === stepId ? { ...s, durationSec: nextSec } : s));
    updateRoutine({
      ...routine,
      steps: nextSteps,
      totalDurationSec: nextSteps.reduce((acc, s) => acc + s.durationSec, 0),
    });
  };

  const updateCanvasStep = (stepId: string, patch: Partial<RoutineStep>) => {
    const nextSteps = routine.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
    updateRoutine({
      ...routine,
      steps: nextSteps,
      totalDurationSec: nextSteps.reduce((acc, s) => acc + s.durationSec, 0),
    });
  };

  const removeStep = (stepId: string) => {
    const nextSteps = routine.steps.filter((s) => s.id !== stepId);
    updateRoutine({
      ...routine,
      steps: nextSteps,
      totalDurationSec: nextSteps.reduce((a, s) => a + s.durationSec, 0),
    });
  };

  const [librarySectionDrag, setLibrarySectionDrag] = useState(false);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeId = String(active.id);

      if (!activeId.startsWith(CANVAS_PREFIX)) {
        const validTarget =
          over?.id === ROUTINE_DROP_ID || (over != null && String(over.id).startsWith(CANVAS_PREFIX));
        if (!validTarget) return;

        update((prev) => {
          const routines = prev.routines ?? [];
          const r = routines.find((x) => x.id === id);
          if (!r) return prev;
          const tpl = (prev.stepLibrary ?? []).find((s) => s.id === activeId);
          if (!tpl) return prev;

          let insertBeforeStepId: string | null = null;
          if (over?.id === ROUTINE_DROP_ID) {
            insertBeforeStepId = null;
          } else if (over && String(over.id).startsWith(CANVAS_PREFIX)) {
            insertBeforeStepId = String(over.id).slice(CANVAS_PREFIX.length);
          } else {
            return prev;
          }

          const nextSteps = buildStepsAfterDropFromLibrary(r.steps, tpl, insertBeforeStepId);
          const totalDurationSec = nextSteps.reduce((acc, s) => acc + s.durationSec, 0);
          const nextRoutine = { ...r, steps: nextSteps, totalDurationSec };
          return { ...prev, routines: routines.map((x) => (x.id === id ? nextRoutine : x)) };
        });
        return;
      }

      if (activeId.startsWith(CANVAS_PREFIX) && over && activeId !== String(over.id)) {
        const fromId = activeId.slice(CANVAS_PREFIX.length);
        const toId = String(over.id).slice(CANVAS_PREFIX.length);
        update((prev) => {
          const routines = prev.routines ?? [];
          const r = routines.find((x) => x.id === id);
          if (!r) return prev;
          const oldIndex = r.steps.findIndex((s) => s.id === fromId);
          const newIndex = r.steps.findIndex((s) => s.id === toId);
          if (oldIndex === -1 || newIndex === -1) return prev;
          const nextSteps = arrayMove(r.steps, oldIndex, newIndex);
          const totalDurationSec = nextSteps.reduce((acc, s) => acc + s.durationSec, 0);
          return {
            ...prev,
            routines: routines.map((x) => (x.id === id ? { ...x, steps: nextSteps, totalDurationSec } : x)),
          };
        });
      }
    },
    [id, update],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setLibrarySectionDrag(false);
      onDragEnd(event);
    },
    [onDragEnd],
  );

  const sortableIds = routine.steps.map((s) => `${CANVAS_PREFIX}${s.id}`);

  return (
    <Container size="xl" px="md">
      <DndContext
        sensors={sensors}
        collisionDetection={routineEditCollisionDetection}
        onDragStart={(e) => {
          if (!String(e.active.id).startsWith(CANVAS_PREFIX)) setLibrarySectionDrag(true);
        }}
        onDragCancel={() => setLibrarySectionDrag(false)}
        onDragEnd={handleDragEnd}
      >
        <MusicPageShell
          eyebrow="Edit routine"
          titleSlot={
            <TextInput
              label="Routine name"
              size="lg"
              className="music-page-title"
              placeholder="Name this routine"
              value={routine.name}
              onChange={(e) =>
                updateRoutine({
                  ...routine,
                  name: e.currentTarget.value,
                })
              }
              styles={{ input: { fontSize: "var(--mantine-h2-font-size)", fontWeight: 600 } }}
            />
          }
          hint="Drag saved sections into the canvas. Use ⠿ to reorder."
          trailing={
            <Text size="sm" fw={600} className="music-hint">
              Total: {formatDuration(total)}
            </Text>
          }
        >
          <Stack gap="md">
            <SimpleGrid cols={isLandscape ? 2 : { base: 1, sm: 2 }} spacing="md">
              <StepLibraryPanel
                stepLibrary={stepLibrary}
                focusLibrary={focusLibrary}
                update={update}
                commit={commit}
              />
              <RoutineDropzone librarySectionDrag={librarySectionDrag}>
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  <Stack gap="xs">
                    {routine.steps.length === 0 ? (
                      <Text c="dimmed" size="sm" py="md">
                        No sections yet. Drag from Saved sections or add a new template in Library.
                      </Text>
                    ) : null}
                    {routine.steps.map((s, idx) => {
                      const minutes = Math.round(s.durationSec / 60);
                      const clampedMin = Math.min(ROUTINE_MAX_MIN, Math.max(ROUTINE_MIN_MIN, minutes));
                      return (
                        <SortableCanvasItem
                          key={s.id}
                          sortableId={`${CANVAS_PREFIX}${s.id}`}
                          step={s}
                          idx={idx}
                          clampedMin={clampedMin}
                          onDurationChange={(n) => updateStepDuration(s.id, n * 60)}
                          onEdit={() =>
                            openEditCanvasStepModal(s, focusLibrary, (next) => {
                              updateCanvasStep(s.id, next);
                              void commit();
                            })
                          }
                          onRemove={() => removeStep(s.id)}
                        />
                      );
                    })}
                  </Stack>
                </SortableContext>
              </RoutineDropzone>
            </SimpleGrid>

            <Group justify="space-between">
              <Tooltip label="Back to Library">
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label="Back to Library"
                  onClick={() => guardedPush("/library?tab=routines")}
                >
                  <IconArrowLeft size={22} />
                </ActionIcon>
              </Tooltip>
              <Group gap="sm">
                <Button variant="light" color="burgundy" size="sm" onClick={() => void commit()}>
                  Save routine
                </Button>
                <Tooltip label="Done">
                  <ActionIcon size="lg" aria-label="Done" onClick={() => guardedPush("/")}>
                    <IconCheck size={22} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Stack>
        </MusicPageShell>
        <DragOverlay />
      </DndContext>
    </Container>
  );
}

function SortableCanvasItem({
  sortableId,
  step,
  idx,
  clampedMin,
  onDurationChange,
  onEdit,
  onRemove,
}: {
  sortableId: string;
  step: RoutineStep;
  idx: number;
  clampedMin: number;
  onDurationChange: (minutes: number) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card withBorder className="music-card" padding="sm">
        <Stack gap="xs">
          <Group gap="sm" align="center" wrap="nowrap">
            <Text
              size="lg"
              c="dimmed"
              lh={1}
              style={{ cursor: "grab", userSelect: "none", flexShrink: 0 }}
              {...listeners}
              {...attributes}
              aria-label="Drag to reorder"
            >
              ⠿
            </Text>
            <Text fw={700} size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
              {step.name}
            </Text>
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {formatDuration(step.durationSec)}
            </Text>
            <Group gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
              <Tooltip label="Edit section">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  aria-label="Edit section"
                  onPointerDown={stopDragPropagation}
                  onClick={onEdit}
                >
                  <IconPencil size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Remove from routine">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  aria-label="Remove from routine"
                  onPointerDown={stopDragPropagation}
                  onClick={onRemove}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          <div onPointerDown={stopDragPropagation}>
            <Slider
              min={ROUTINE_MIN_MIN}
              max={ROUTINE_MAX_MIN}
              step={1}
              value={clampedMin}
              onChange={(v) => onDurationChange(v)}
              label={(v) => `${v} min`}
              marks={[
                { value: ROUTINE_MIN_MIN, label: `${ROUTINE_MIN_MIN}` },
                { value: ROUTINE_MAX_MIN, label: `${ROUTINE_MAX_MIN}` },
              ]}
              size="sm"
            />
          </div>
          <Text size="xs" c="dimmed">
            Section {idx + 1}
          </Text>
        </Stack>
      </Card>
    </div>
  );
}

function StepLibraryPanel({
  stepLibrary,
  focusLibrary,
  update,
  commit,
}: {
  stepLibrary: StepTemplate[];
  focusLibrary: FocusItem[];
  update: UpdateFn;
  commit: () => Promise<boolean>;
}) {
  return (
    <Card withBorder className="music-card">
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text fw={600}>Saved sections</Text>
          <Tooltip label="Add section in Library">
            <ActionIcon
              component={Link}
              href="/library?tab=sections&new=1"
              prefetch
              variant="light"
              color="burgundy"
              size="md"
              aria-label="Add section in Library"
            >
              <IconPlus size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Text c="dimmed" size="sm">
          Drag ⠿ into the routine canvas.
        </Text>
        <Stack gap="xs">
          {stepLibrary.length ? (
            stepLibrary.map((s) => (
              <DraggableStep
                key={s.id}
                template={s}
                onEdit={() => openEditSavedSectionModal(s, focusLibrary, update, commit)}
              />
            ))
          ) : (
            <Text c="dimmed" size="sm">
              No saved sections. Tap Add new in Library.
            </Text>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

function DraggableStep({ template, onEdit }: { template: StepTemplate; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: template.id });
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.55 : 1,
    userSelect: "none",
  };

  return (
    <Card withBorder padding="xs" radius="sm" ref={setNodeRef} style={style} className="music-draggable-tile">
      <Group gap="sm" align="center" wrap="nowrap">
        <Text
          size="lg"
          c="dimmed"
          lh={1}
          style={{ cursor: "grab", flexShrink: 0 }}
          {...listeners}
          {...attributes}
          aria-label="Drag into routine"
        >
          ⠿
        </Text>
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600} truncate>
            {template.name}
          </Text>
          <Text size="xs" c="dimmed">
            {formatDuration(template.durationSec)}
          </Text>
        </Stack>
        <Tooltip label="Edit saved section">
          <ActionIcon
            variant="subtle"
            size="sm"
            aria-label="Edit saved section"
            onPointerDown={stopDragPropagation}
            onClick={onEdit}
          >
            <IconPencil size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Card>
  );
}

function RoutineDropzone({
  children,
  librarySectionDrag,
}: {
  children: ReactNode;
  librarySectionDrag: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: ROUTINE_DROP_ID });

  return (
    <Card
      withBorder
      className="music-dropzone-card"
      data-music-over={isOver ? "true" : "false"}
      data-music-library-drag={librarySectionDrag ? "true" : "false"}
    >
      <Stack ref={setNodeRef} gap="sm" className="routine-canvas-droppable-inner" style={{ minHeight: 160 }}>
        <Group justify="space-between">
          <Text fw={600}>Routine canvas</Text>
          <Text c="dimmed" size="sm">
            {librarySectionDrag
              ? isOver
                ? "Release to add section"
                : "Drop here"
              : isOver
                ? "Release to add section"
                : "Drop or reorder"}
          </Text>
        </Group>
        {children}
      </Stack>
    </Card>
  );
}
