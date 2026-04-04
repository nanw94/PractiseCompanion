"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  IconArrowLeft,
  IconCheck,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
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
import type { AppData, FocusItem, RoutineStep, RoutineTemplate, StepTemplate } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";
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

function openEditSavedSectionModal(tpl: StepTemplate, focusLibrary: FocusItem[], update: UpdateFn) {
  modals.open({
    title: "Edit saved section",
    size: "md",
    children: (
      <EditSavedSectionForm
        initial={tpl}
        focusLibrary={focusLibrary}
        onCancel={() => modals.closeAll()}
        onSave={(next) => {
          update((prev) => ({
            ...prev,
            stepLibrary: (prev.stepLibrary ?? []).map((x) => (x.id === next.id ? next : x)),
          }));
          modals.closeAll();
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
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, update } = useAppData();
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
          <Button variant="default" onClick={() => router.push("/library?tab=routines")}>
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

  const addStepFromTemplate = (tpl: StepTemplate) => {
    const durationSec = clampRoutineMinutesSec(tpl.durationSec);
    const base = {
      name: tpl.name,
      durationSec,
      focusIds: tpl.focusIds ?? [],
      note: tpl.note,
      imageDataUrl: tpl.imageDataUrl,
      sectionTemplateId: tpl.id,
    };
    const dupIds = new Set(
      routine.steps.filter((s) => s.sectionTemplateId === tpl.id).slice(1).map((s) => s.id),
    );
    const trimmed = routine.steps.filter((s) => !dupIds.has(s.id));
    const existingIdx = trimmed.findIndex((s) => s.sectionTemplateId === tpl.id);
    let nextSteps: RoutineStep[];
    if (existingIdx === -1) {
      nextSteps = [...trimmed, { id: newId(), ...base }];
    } else {
      nextSteps = trimmed.map((s) =>
        s.sectionTemplateId === tpl.id ? { ...s, ...base } : s,
      );
    }
    updateRoutine({
      ...routine,
      steps: nextSteps,
      totalDurationSec: nextSteps.reduce((a, s) => a + s.durationSec, 0),
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

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);

    if (over?.id === "routine-dropzone" && !activeId.startsWith(CANVAS_PREFIX)) {
      const tpl = stepLibrary.find((s) => s.id === activeId);
      if (tpl) addStepFromTemplate(tpl);
      return;
    }

    if (activeId.startsWith(CANVAS_PREFIX) && over && activeId !== String(over.id)) {
      const fromId = activeId.slice(CANVAS_PREFIX.length);
      const toId = String(over.id).slice(CANVAS_PREFIX.length);
      const oldIndex = routine.steps.findIndex((s) => s.id === fromId);
      const newIndex = routine.steps.findIndex((s) => s.id === toId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const nextSteps = arrayMove(routine.steps, oldIndex, newIndex);
        updateRoutine({ ...routine, steps: nextSteps });
      }
    }
  };

  const sortableIds = routine.steps.map((s) => `${CANVAS_PREFIX}${s.id}`);

  return (
    <Container size="xl" px="md">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <MusicPageShell
          eyebrow="Edit routine"
          title={routine.name}
          hint="Drag saved sections into the canvas. Use ⠿ to reorder."
          trailing={
            <Text size="sm" fw={600} className="music-hint">
              Total: {formatDuration(total)}
            </Text>
          }
        >
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <StepLibraryPanel
                stepLibrary={stepLibrary}
                focusLibrary={focusLibrary}
                update={update}
              />
              <RoutineDropzone>
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
                            openEditCanvasStepModal(s, focusLibrary, (next) => updateCanvasStep(s.id, next))
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
                  onClick={() => router.push("/library?tab=routines")}
                >
                  <IconArrowLeft size={22} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Done">
                <ActionIcon size="lg" aria-label="Done" onClick={() => router.push("/")}>
                  <IconCheck size={22} />
                </ActionIcon>
              </Tooltip>
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
}: {
  stepLibrary: StepTemplate[];
  focusLibrary: FocusItem[];
  update: UpdateFn;
}) {
  return (
    <Card withBorder className="music-card">
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text fw={600}>Saved sections</Text>
          <Tooltip label="Add section in Library">
            <ActionIcon
              component={Link}
              href="/library?tab=sections"
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
                onEdit={() => openEditSavedSectionModal(s, focusLibrary, update)}
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

function RoutineDropzone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "routine-dropzone" });

  return (
    <Card
      withBorder
      ref={setNodeRef}
      className="music-dropzone-card"
      data-music-over={isOver ? "true" : "false"}
    >
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>Routine canvas</Text>
          <Text c="dimmed" size="sm">
            {isOver ? "Release to add section" : "Drop or reorder"}
          </Text>
        </Group>
        {children}
      </Stack>
    </Card>
  );
}
