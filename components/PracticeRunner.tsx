"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Group, Progress, Stack, Text, Title } from "@mantine/core";
import { useActiveRun } from "@/hooks/useActiveRun";
import { useAppData } from "@/hooks/useAppData";
import { resolveFocusLabels } from "@/lib/focus";
import { formatDuration } from "@/lib/time";

export function PracticeRunner() {
  const router = useRouter();
  const { activeRun, routine, totalDurationSec, pause, resume, next, prev, finish } = useActiveRun();
  const { data } = useAppData();

  const currentSection = useMemo(() => {
    if (!routine || !activeRun) return null;
    return routine.steps[activeRun.currentStepIndex] ?? null;
  }, [routine, activeRun]);

  const routinePercent = useMemo(() => {
    if (!activeRun || totalDurationSec <= 0) return 0;
    return Math.min(100, (activeRun.elapsedSec / totalDurationSec) * 100);
  }, [activeRun, totalDurationSec]);

  const sectionPercent = useMemo(() => {
    if (!activeRun || !currentSection || currentSection.durationSec <= 0) return 0;
    return Math.min(100, (activeRun.stepElapsedSec / currentSection.durationSec) * 100);
  }, [activeRun, currentSection]);

  useEffect(() => {
    if (!routine || !activeRun) return;
    if (activeRun.currentStepIndex >= routine.steps.length) {
      finish();
      router.push("/done");
    }
  }, [activeRun, routine, finish, router]);

  if (!activeRun || !routine || !currentSection) return null;

  const focusLabels = resolveFocusLabels(currentSection.focusIds ?? [], data.focusLibrary ?? []);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="end">
        <Title order={3}>{routine.name}</Title>
        <Text c="dimmed" size="sm">
          {formatDuration(activeRun.elapsedSec)} / {formatDuration(totalDurationSec)}
        </Text>
      </Group>

      <Card withBorder>
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Routine progress
          </Text>
          <Progress value={routinePercent} size="xl" radius="xl" h={20} />
        </Stack>
      </Card>

      <Card withBorder>
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Section progress
          </Text>
          <Progress value={sectionPercent} size="xl" radius="xl" h={20} />
          <Group justify="space-between">
            <Text size="sm">
              {formatDuration(activeRun.stepElapsedSec)} / {formatDuration(currentSection.durationSec)}
            </Text>
            <Text size="sm" c="dimmed">
              Remaining {formatDuration(currentSection.durationSec - activeRun.stepElapsedSec)}
            </Text>
          </Group>
        </Stack>
      </Card>

      <Card withBorder>
        <Stack gap="xs">
          <Text c="dimmed" size="sm">
            Section {activeRun.currentStepIndex + 1} of {routine.steps.length}
          </Text>
          <Text fw={700} size="xl">
            {currentSection.name}
          </Text>
          {focusLabels.length ? (
            <Text c="dimmed">Focus: {focusLabels.join(", ")}</Text>
          ) : (
            <Text c="dimmed">Focus: (not set)</Text>
          )}
        </Stack>
      </Card>

      <Group>
        <Button variant="default" onClick={prev}>
          Back
        </Button>
        {activeRun.isRunning ? (
          <Button variant="default" onClick={pause}>
            Pause
          </Button>
        ) : (
          <Button onClick={resume}>Resume</Button>
        )}
        <Button variant="default" onClick={next}>
          Skip
        </Button>
        <Button
          color="green"
          onClick={() => {
            finish();
            router.push("/done");
          }}
        >
          Finish
        </Button>
      </Group>
    </Stack>
  );
}

