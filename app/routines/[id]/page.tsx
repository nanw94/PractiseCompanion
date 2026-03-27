"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  NumberInput,
  Stack,
  Text,
} from "@mantine/core";
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
import type { RoutineStep, RoutineTemplate, StepTemplate } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";
import { resolveFocusLabels } from "@/lib/focus";
import { formatDuration } from "@/lib/time";
import { MusicPageShell } from "@/components/MusicPageShell";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampRoutineMinutesSec(sec: number) {
  const m = Math.round(sec / 60);
  const c = Math.min(20, Math.max(1, m));
  return c * 60;
}

/** Prefix canvas step IDs so we can distinguish them from library tile IDs */
const CANVAS_PREFIX = "canvas:";

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
      <Container size="sm">
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

  const addStepFromTemplate = (tpl: StepTemplate) => {
    const section: RoutineStep = {
      id: newId(),
      name: tpl.name,
      durationSec: clampRoutineMinutesSec(tpl.durationSec),
      focusIds: tpl.focusIds ?? [],
      note: tpl.note,
      imageDataUrl: tpl.imageDataUrl,
    };
    const nextSteps = [...routine.steps, section];
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

    // ── Drop library tile into canvas ──────────────────────────────
    if (over?.id === "routine-dropzone" && !activeId.startsWith(CANVAS_PREFIX)) {
      const tpl = stepLibrary.find((s) => s.id === activeId);
      if (tpl) addStepFromTemplate(tpl);
      return;
    }

    // ── Reorder within canvas ──────────────────────────────────────
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
    <Container size="sm">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <MusicPageShell
          eyebrow="Edit routine"
          title={routine.name}
          hint="Drag saved sections into the canvas. Drag handles (⠿) reorder them."
          trailing={
            <Text size="sm" fw={600} className="music-hint">
              Total: {formatDuration(total)}
            </Text>
          }
        >
          <Stack gap="md">
            <StepLibraryPanel stepLibrary={stepLibrary} focusLibrary={focusLibrary} />

            <RoutineDropzone>
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <Stack gap="sm">
                  {routine.steps.length === 0 ? (
                    <Text c="dimmed" size="sm" py="md">
                      No sections yet. Drag from Saved sections or add a new template in Library.
                    </Text>
                  ) : null}
                  {routine.steps.map((s, idx) => {
                    const minutes = Math.round(s.durationSec / 60);
                    const clampedMin = Math.min(20, Math.max(1, minutes));
                    return (
                      <SortableCanvasItem
                        key={s.id}
                        sortableId={`${CANVAS_PREFIX}${s.id}`}
                        name={s.name}
                        idx={idx}
                        focusBadges={resolveFocusLabels(s.focusIds, focusLibrary)}
                        clampedMin={clampedMin}
                        onDurationChange={(n) => updateStepDuration(s.id, n * 60)}
                        onRemove={() => removeStep(s.id)}
                      />
                    );
                  })}
                </Stack>
              </SortableContext>
            </RoutineDropzone>

            <Group justify="space-between">
              <Button variant="default" onClick={() => router.push("/library?tab=routines")}>
                Back
              </Button>
              <Button onClick={() => router.push("/")}>Done</Button>
            </Group>
          </Stack>
        </MusicPageShell>
        {/* Empty overlay needed so touch drag doesn't scroll */}
        <DragOverlay />
      </DndContext>
    </Container>
  );
}

// ── Sortable canvas item ─────────────────────────────────────────────────────

function SortableCanvasItem({
  sortableId,
  name,
  idx,
  focusBadges,
  clampedMin,
  onDurationChange,
  onRemove,
}: {
  sortableId: string;
  name: string;
  idx: number;
  focusBadges: string[];
  clampedMin: number;
  onDurationChange: (minutes: number) => void;
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
      <Card withBorder className="music-card">
        <Stack gap="sm">
          {/* Header row: drag handle | name+badges | remove button */}
          <Group gap="sm" align="flex-start" wrap="nowrap">
            {/* Drag handle */}
            <Text
              size="lg"
              c="dimmed"
              lh={1}
              mt={2}
              style={{ cursor: "grab", userSelect: "none", flexShrink: 0 }}
              {...listeners}
              {...attributes}
              aria-label="Drag to reorder"
            >
              ⠿
            </Text>

            {/* Name + badges – takes all remaining space */}
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Text fw={700} size="lg" truncate>
                {name}
              </Text>
              {focusBadges.length > 0 ? (
                <Group gap={4}>
                  {focusBadges.map((lbl) => (
                    <Badge key={lbl} size="sm" variant="light">
                      {lbl}
                    </Badge>
                  ))}
                </Group>
              ) : null}
            </Stack>

            {/* Remove – always right-aligned */}
            <Button
              variant="subtle"
              color="red"
              size="compact-sm"
              style={{ flexShrink: 0 }}
              onClick={onRemove}
            >
              Remove
            </Button>
          </Group>

          <Text size="xs" c="dimmed">
            Section {idx + 1} · duration only (edit name/focus in Library → Sections)
          </Text>

          <NumberInput
            label="Duration (minutes)"
            description="1–20 — type or use arrows"
            min={1}
            max={20}
            step={1}
            clampBehavior="strict"
            value={clampedMin}
            onChange={(v) => {
              const n = typeof v === "number" ? v : parseFloat(String(v));
              if (!Number.isFinite(n)) return;
              onDurationChange(Math.round(n));
            }}
            style={{ maxWidth: 200 }}
          />
        </Stack>
      </Card>
    </div>
  );
}

// ── Saved-sections panel ─────────────────────────────────────────────────────

function StepLibraryPanel({
  stepLibrary,
  focusLibrary,
}: {
  stepLibrary: StepTemplate[];
  focusLibrary: { id: string; label: string }[];
}) {
  return (
    <Card withBorder className="music-card">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={600}>Saved sections</Text>
          <Button
            component={Link}
            href="/library?tab=sections"
            variant="light"
            color="burgundy"
            size="sm"
            leftSection={
              <Text fw={900} size="sm" lh={1}>
                +
              </Text>
            }
          >
            Add A New Section
          </Button>
        </Group>
        <Text c="dimmed" size="sm">
          Drag a tile into the routine canvas below.
        </Text>
        <Group gap="sm" align="stretch">
          {stepLibrary.length ? (
            stepLibrary.map((s) => (
              <DraggableStep
                key={s.id}
                id={s.id}
                label={s.name}
                durationSec={s.durationSec}
                focusLabels={resolveFocusLabels(s.focusIds, focusLibrary)}
              />
            ))
          ) : (
            <Text c="dimmed" size="sm">
              No saved sections. Tap + to add one in Library.
            </Text>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

// ── Library draggable tile ───────────────────────────────────────────────────

function DraggableStep({
  id,
  label,
  durationSec,
  focusLabels,
}: {
  id: string;
  label: string;
  durationSec: number;
  focusLabels: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
    padding: "10px 12px",
    userSelect: "none",
    minWidth: 220,
  };

  return (
    <div ref={setNodeRef} className="music-draggable-tile" style={style} {...listeners} {...attributes}>
      <Stack gap={4}>
        <Text size="sm" fw={600}>
          {label}
        </Text>
        <Text size="xs" c="dimmed">
          Duration: {formatDuration(durationSec)}
        </Text>
        <Group gap={4}>
          {focusLabels.length ? (
            focusLabels.slice(0, 4).map((focus) => (
              <Badge key={focus} size="xs" variant="outline">
                {focus}
              </Badge>
            ))
          ) : (
            <Text size="xs" c="dimmed">
              No focus
            </Text>
          )}
        </Group>
      </Stack>
    </div>
  );
}

// ── Dropzone wrapper ─────────────────────────────────────────────────────────

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
            {isOver ? "Release to add section" : "Drop or drag to reorder"}
          </Text>
        </Group>
        {children}
      </Stack>
    </Card>
  );
}
