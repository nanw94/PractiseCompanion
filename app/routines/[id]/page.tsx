"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import type { RoutineStep, RoutineTemplate, StepTemplate } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";
import { resolveFocusLabels } from "@/lib/focus";
import { formatDuration } from "@/lib/time";
import { MusicPageShell } from "@/components/MusicPageShell";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const MINUTE_OPTIONS = Array.from({ length: 20 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} min`,
}));

function clampRoutineMinutesSec(sec: number) {
  const m = Math.round(sec / 60);
  const c = Math.min(20, Math.max(1, m));
  return c * 60;
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
    updateRoutine({
      ...routine,
      steps: routine.steps.map((s) => (s.id === stepId ? { ...s, durationSec: nextSec } : s)),
      totalDurationSec: routine.steps.reduce(
        (acc, s) => acc + (s.id === stepId ? nextSec : s.durationSec),
        0,
      ),
    });
  };

  const addStepFromTemplate = (tpl: StepTemplate) => {
    const section: RoutineStep = {
      id: newId(),
      name: tpl.name,
      durationSec: clampRoutineMinutesSec(tpl.durationSec),
      focusIds: tpl.focusIds ?? [],
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
    if (event.over?.id !== "routine-dropzone") return;
    const activeId = String(event.active.id);
    const tpl = stepLibrary.find((s) => s.id === activeId);
    if (tpl) addStepFromTemplate(tpl);
  };

  return (
    <Container size="sm">
      <DndContext onDragEnd={onDragEnd}>
        <MusicPageShell
          eyebrow="Edit routine"
          title={routine.name}
          hint="Drop saved sections into the canvas. Duration can be set to 1–20 minutes per section."
          trailing={
            <Text size="sm" fw={600} className="music-hint">
              Total: {formatDuration(total)}
            </Text>
          }
        >
          <Stack gap="md">
            <StepLibraryPanel stepLibrary={stepLibrary} focusLibrary={focusLibrary} />

            <RoutineDropzone>
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
                  <Card key={s.id} withBorder className="music-card">
                    <Stack gap="sm">
                      <Group justify="space-between" align="center">
                        <Stack gap={4}>
                          <Text fw={700} size="lg">
                            {s.name}
                          </Text>
                          <Group gap={4}>
                            {resolveFocusLabels(s.focusIds, focusLibrary).map((lbl) => (
                              <Badge key={lbl} size="sm" variant="light">
                                {lbl}
                              </Badge>
                            ))}
                          </Group>
                        </Stack>
                        <Button variant="default" color="red" size="xs" onClick={() => removeStep(s.id)}>
                          Remove
                        </Button>
                      </Group>

                      <Text size="xs" c="dimmed">
                        Section {idx + 1} · duration only (edit name/focus in Library → Sections)
                      </Text>

                      <Group align="flex-end" grow>
                        <Select
                          label="Minutes"
                          description="Choose 1–20"
                          data={MINUTE_OPTIONS}
                          value={String(clampedMin)}
                          onChange={(v) => {
                            if (!v) return;
                            const n = parseInt(v, 10);
                            if (Number.isFinite(n)) updateStepDuration(s.id, n * 60);
                          }}
                          comboboxProps={{ withinPortal: true }}
                        />
                        <NumberInput
                          label="Or type minutes"
                          description="1–20"
                          min={1}
                          max={20}
                          value={clampedMin}
                          onChange={(v) => {
                            const n = typeof v === "number" ? v : parseFloat(String(v));
                            if (!Number.isFinite(n)) return;
                            updateStepDuration(s.id, Math.round(n) * 60);
                          }}
                        />
                      </Group>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          </RoutineDropzone>

            <Group justify="space-between">
              <Button variant="default" onClick={() => router.push("/library?tab=routines")}>
                Back
              </Button>
              <Button onClick={() => router.push("/")}>Done</Button>
            </Group>
          </Stack>
        </MusicPageShell>
      </DndContext>
    </Container>
  );
}

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
          <ActionIcon
            component={Link}
            href="/library?tab=sections"
            variant="light"
            color="burgundy"
            size="lg"
            radius="md"
            aria-label="Add new section template"
            title="Add section in Library"
          >
            <Text fw={900} size="lg" lh={1}>
              +
            </Text>
          </ActionIcon>
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
            {isOver ? "Release to add section" : "Drop sections only"}
          </Text>
        </Group>
        {children}
      </Stack>
    </Card>
  );
}
