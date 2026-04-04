"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon, Button, Card, Group, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { IconPencil, IconPlayerPlay, IconTrash } from "@tabler/icons-react";
import type { RoutineTemplate } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";
import { useActiveRun } from "@/hooks/useActiveRun";
import { formatDuration } from "@/lib/time";

import { modals } from "@mantine/modals";

function newRoutineId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function RoutinesTab() {
  const router = useRouter();
  const { data, update } = useAppData();
  const { activeRun, start } = useActiveRun();

  const routines = data.routines ?? [];
  const [routineName, setRoutineName] = useState("New routine");

  const totalSections = useMemo(
    () => routines.reduce((acc, r) => acc + (r.steps?.length ?? 0), 0),
    [routines],
  );

  return (
    <Stack gap="md">
      <Group justify="space-between" align="end">
        <Text fw={600}>
          {routines.length} routines · {totalSections} sections
        </Text>
      </Group>

      <Card withBorder>
        <Stack gap="sm">
          <Text fw={600}>Create routine</Text>
          <Group align="end">
            <TextInput
              label="Name"
              value={routineName}
              onChange={(e) => setRoutineName(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button
              disabled={!routineName.trim()}
              onClick={() => {
                const routine: RoutineTemplate = {
                  id: newRoutineId(),
                  name: routineName.trim(),
                  totalDurationSec: 20 * 60,
                  steps: [],
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
              <Group gap={6}>
                <Tooltip label="Start routine">
                  <ActionIcon
                    variant="light"
                    color="burgundy"
                    size="lg"
                    aria-label="Start routine"
                    onClick={() => {
                      if (activeRun) {
                        modals.openConfirmModal({
                          title: "Replace running routine?",
                          children: <Text size="sm">This will end your current session.</Text>,
                          labels: { confirm: "Replace", cancel: "Cancel" },
                          onConfirm: () => {
                            start(r.id);
                            router.push("/");
                          },
                        });
                        return;
                      }
                      start(r.id);
                      router.push("/");
                    }}
                  >
                    <IconPlayerPlay size={20} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Edit routine">
                  <ActionIcon
                    variant="default"
                    size="lg"
                    aria-label="Edit routine"
                    onClick={() => router.push(`/routines/${r.id}`)}
                  >
                    <IconPencil size={20} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete routine">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="lg"
                    aria-label="Delete routine"
                    onClick={() => {
                      modals.openConfirmModal({
                        title: "Delete routine",
                        children: <Text size="sm">Are you sure you want to delete the routine "{r.name}"?</Text>,
                        labels: { confirm: "Delete", cancel: "Cancel" },
                        confirmProps: { color: "red" },
                        onConfirm: () => {
                          update((prev) => {
                            const nextRoutines = (prev.routines ?? []).filter((x) => x.id !== r.id);
                            if (nextRoutines.length === 0) return prev;
                            return {
                              ...prev,
                              routines: nextRoutines,
                              activeRun: prev.activeRun?.routineId === r.id ? undefined : prev.activeRun,
                            };
                          });
                        },
                      });
                    }}
                  >
                    <IconTrash size={20} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
