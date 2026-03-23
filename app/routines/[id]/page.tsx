"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  MultiSelect,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import type { RoutineStep, RoutineTemplate, StepTemplate } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";
import { resolveFocusLabels } from "@/lib/focus";
import { formatDuration } from "@/lib/time";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampDurationSec(sec: number) {
  if (!Number.isFinite(sec)) return 60;
  return Math.max(10, Math.round(sec));
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
        <Stack gap="md">
          <Title order={2}>Routine not found</Title>
          <Button variant="default" onClick={() => router.push("/routines")}>
            Back to routines
          </Button>
        </Stack>
      </Container>
    );
  }

  const updateRoutine = (next: RoutineTemplate) => {
    update((prev) => ({
      ...prev,
      routines: (prev.routines ?? []).map((r) => (r.id === next.id ? next : r)),
    }));
  };

  const updateStep = (stepId: string, patch: Partial<RoutineStep>) => {
    updateRoutine({
      ...routine,
      steps: routine.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
      totalDurationSec: routine.steps.reduce(
        (acc, s) => acc + (s.id === stepId ? (patch.durationSec ?? s.durationSec) : s.durationSec),
        0,
      ),
    });
  };

  const addStep = () => {
    const section: RoutineStep = { id: newId(), name: "New section", durationSec: 5 * 60, focusIds: [] };
    updateRoutine({
      ...routine,
      steps: [...routine.steps, section],
      totalDurationSec: total + section.durationSec,
    });
  };

  const addStepFromTemplate = (tpl: StepTemplate) => {
    const section: RoutineStep = {
      id: newId(),
      name: tpl.name,
      durationSec: tpl.durationSec,
      focusIds: tpl.focusIds ?? [],
    };
    updateRoutine({
      ...routine,
      steps: [...routine.steps, section],
      totalDurationSec: total + section.durationSec,
    });
  };

  const removeStep = (stepId: string) => {
    const removed = routine.steps.find((s) => s.id === stepId);
    updateRoutine({
      ...routine,
      steps: routine.steps.filter((s) => s.id !== stepId),
      totalDurationSec: Math.max(0, routine.totalDurationSec - (removed?.durationSec ?? 0)),
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
        <Stack gap="md">
          <Group justify="space-between" align="end">
            <Title order={2}>Edit routine</Title>
            <Text c="dimmed" size="sm">
              Total: {formatDuration(total)}
            </Text>
          </Group>

          <Card withBorder>
            <Stack gap="sm">
              <TextInput
                label="Routine name"
                value={routine.name}
                onChange={(e) => updateRoutine({ ...routine, name: e.currentTarget.value })}
              />
            </Stack>
          </Card>

          <StepLibraryPanel stepLibrary={stepLibrary} focusLibrary={focusLibrary} />

          <RoutineDropzone>
            <Stack gap="sm">
              {routine.steps.map((s, idx) => (
                <Card key={s.id} withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between" align="center">
                      <Text fw={600}>Section {idx + 1}</Text>
                      <Button variant="default" color="red" onClick={() => removeStep(s.id)}>
                        Remove
                      </Button>
                    </Group>

                    <TextInput
                      label="Name"
                      value={s.name}
                      onChange={(e) => updateStep(s.id, { name: e.currentTarget.value })}
                    />

                    <NumberInput
                      label="Minutes"
                      min={1}
                      max={120}
                      value={Math.round(s.durationSec / 60)}
                      onChange={(v) => {
                        const minutes = typeof v === "number" ? v : parseFloat(String(v));
                        updateStep(s.id, { durationSec: clampDurationSec(minutes * 60) });
                      }}
                    />

                    <MultiSelect
                      label="Focus"
                      placeholder="Select focus items"
                      data={focusLibrary.map((f) => ({ value: f.id, label: f.label }))}
                      value={s.focusIds}
                      onChange={(value) => updateStep(s.id, { focusIds: value })}
                      searchable
                    />
                  </Stack>
                </Card>
              ))}
            </Stack>
          </RoutineDropzone>

          <Button variant="light" onClick={addStep}>
            Add section
          </Button>

          <Divider />

          <Group justify="space-between">
            <Button variant="default" onClick={() => router.push("/routines")}>
              Back
            </Button>
            <Button onClick={() => router.push("/")}>Done</Button>
          </Group>
        </Stack>
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
    <Card withBorder>
      <Stack gap="sm">
        <Text fw={600}>Saved sections</Text>
        <Text c="dimmed" size="sm">
          Drag a section tile into the routine canvas.
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
              No saved sections yet. Add some in Library.
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
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
    padding: "10px 12px",
    border: "1px solid var(--mantine-color-gray-4)",
    borderRadius: 8,
    userSelect: "none",
    minWidth: 220,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Stack gap={4}>
        <Text size="sm" fw={600}>
          {label}
        </Text>
        <Text size="xs" c="dimmed">
          Duration: {formatDuration(durationSec)}
        </Text>
        <Group gap={4}>
          {focusLabels.length ? (
            focusLabels.slice(0, 3).map((focus) => (
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

function RoutineDropzone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "routine-dropzone" });

  return (
    <Card
      withBorder
      ref={setNodeRef}
      style={{
        borderStyle: "dashed",
        borderColor: isOver ? "var(--mantine-color-blue-6)" : undefined,
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>Routine canvas (drop sections here)</Text>
          <Text c="dimmed" size="sm">
            {isOver ? "Release to add section" : "Drag from Saved sections"}
          </Text>
        </Group>
        {children}
      </Stack>
    </Card>
  );
}

