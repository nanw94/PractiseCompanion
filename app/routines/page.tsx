"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type { RoutineTemplate } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";
import { useActiveRun } from "@/hooks/useActiveRun";
import { formatDuration } from "@/lib/time";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function RoutinesPage() {
  const router = useRouter();
  const { data, update } = useAppData();
  const { activeRun, start } = useActiveRun();
  const [name, setName] = useState("New routine");

  const routines = data.routines ?? [];
  const totalSections = useMemo(
    () => routines.reduce((acc, r) => acc + (r.steps?.length ?? 0), 0),
    [routines],
  );

  return (
    <Container size="sm">
      <Stack gap="md">
        <Group justify="space-between" align="end">
          <Title order={2}>Routines</Title>
          <Text c="dimmed" size="sm">
            {routines.length} routines · {totalSections} sections
          </Text>
        </Group>

        <Card withBorder>
          <Stack gap="sm">
            <Text fw={600}>Create routine</Text>
            <Group align="end">
              <TextInput
                label="Name"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Button
                disabled={!name.trim()}
                onClick={() => {
                  const routine: RoutineTemplate = {
                    id: newId(),
                    name: name.trim(),
                    totalDurationSec: 20 * 60,
                    steps: [{ id: newId(), name: "Warm-up", durationSec: 5 * 60, focusIds: [] }],
                  };

                  update((prev) => ({ ...prev, routines: [routine, ...(prev.routines ?? [])] }));
                  router.push(`/routines/${routine.id}`);
                }}
              >
                Create
              </Button>
            </Group>
          </Stack>
        </Card>

        <Stack gap="sm">
          {routines.map((r) => (
            <Card key={r.id} withBorder>
              <Group justify="space-between" align="start">
                <Stack gap={2}>
                  <Text fw={600}>{r.name}</Text>
                  <Text c="dimmed" size="sm">
                    {r.steps.length} sections · {formatDuration(r.totalDurationSec)}
                  </Text>
                </Stack>
                <Group>
                  <Button
                    onClick={() => {
                      if (activeRun) {
                        const ok = window.confirm("Replace the current running routine?");
                        if (!ok) return;
                      }
                      start(r.id);
                      router.push("/");
                    }}
                  >
                    Start
                  </Button>
                  <Button variant="default" onClick={() => router.push(`/routines/${r.id}`)}>
                    Edit
                  </Button>
                  <Button
                    variant="default"
                    color="red"
                    onClick={() => {
                      const ok = window.confirm(`Delete routine "${r.name}"?`);
                      if (!ok) return;
                      update((prev) => {
                        const nextRoutines = (prev.routines ?? []).filter((x) => x.id !== r.id);
                        if (nextRoutines.length === 0) return prev;
                        return {
                          ...prev,
                          routines: nextRoutines,
                          activeRun: prev.activeRun?.routineId === r.id ? undefined : prev.activeRun,
                        };
                      });
                    }}
                  >
                    Delete
                  </Button>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

