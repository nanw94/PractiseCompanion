"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Group, Image, Progress, Stack, Text, Title } from "@mantine/core";
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

  const focusLabels = useMemo(() => {
    if (!currentSection) return [];
    return resolveFocusLabels(currentSection.focusIds ?? [], data.focusLibrary ?? []);
  }, [currentSection, data.focusLibrary]);

  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    setFocusIndex(0);
  }, [activeRun?.currentStepIndex, focusLabels.join("|")]);

  useEffect(() => {
    if (focusLabels.length <= 1) return;
    const id = window.setInterval(() => {
      setFocusIndex((i) => (i + 1) % focusLabels.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [focusLabels.length]);

  useEffect(() => {
    if (!routine || !activeRun) return;
    if (activeRun.currentStepIndex >= routine.steps.length) {
      finish();
      router.push("/done");
    }
  }, [activeRun, routine, finish, router]);

  if (!activeRun || !routine || !currentSection) return null;

  const activeFocusLabel =
    focusLabels.length > 0 ? focusLabels[focusIndex % focusLabels.length] : null;

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100dvh - 56px - 56px - 32px)",
        maxWidth: 720,
        marginInline: "auto",
        width: "100%",
      }}
    >
      {/* ~70%: section block laid out by fixed strips */}
      <Box
        style={{
          flex: "1 1 70%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--mantine-color-default-border, #dee2e6)",
          borderRadius: 12,
          padding: "var(--mantine-spacing-md)",
          background: "var(--mantine-color-body)",
          gap: 12,
        }}
      >
        <Box
          style={{
            border: "1px solid var(--mantine-color-default-border, #dee2e6)",
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text size="sm" c="dimmed" ta="center">
            {routine.name} · Section {activeRun.currentStepIndex + 1}/{routine.steps.length}
          </Text>
        </Box>

        <Box
          style={{
            border: "1px solid var(--mantine-color-default-border, #dee2e6)",
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text fw={700} ta="center" size="lg">
            {currentSection.name}
          </Text>
        </Box>

        <Box
          style={{
            flex: "0 0 22%",
            minHeight: 90,
            border: "1px solid var(--mantine-color-default-border, #dee2e6)",
            borderRadius: 8,
            padding: "10px 12px",
            overflowY: "auto",
          }}
        >
          <Text size="xs" c="dimmed" mb={4}>
            Note
          </Text>
          <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
            {currentSection.note?.trim() ? currentSection.note : "No note"}
          </Text>
        </Box>

        <Box
          style={{
            flex: "0 0 30%",
            minHeight: 120,
            border: "1px solid var(--mantine-color-default-border, #dee2e6)",
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {currentSection.imageDataUrl ? (
            <Image
              src={currentSection.imageDataUrl}
              alt="section reference"
              radius="sm"
              fit="contain"
              h="100%"
              w="100%"
              style={{ maxHeight: "100%" }}
            />
          ) : (
            <Text c="dimmed">No image</Text>
          )}
        </Box>

        <Box
          style={{
            flex: "1 1 auto",
            minHeight: 120,
            border: "1px solid var(--mantine-color-default-border, #dee2e6)",
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {activeFocusLabel ? (
            <Text
              key={focusLabels.length <= 1 ? "single-focus" : `${focusIndex}-${activeFocusLabel}`}
              className={
                focusLabels.length <= 1 ? "focus-rotate-text focus-rotate-text--loop" : "focus-rotate-text"
              }
              ta="center"
              fw={800}
              style={{
                fontSize: "clamp(1.4rem, 5vw, 2.5rem)",
                lineHeight: 1.15,
                maxWidth: "100%",
              }}
            >
              {activeFocusLabel}
            </Text>
          ) : (
            <Text ta="center" c="dimmed" size="lg" fw={600}>
              No focus
            </Text>
          )}
        </Box>

        <Box
          style={{
            border: "1px solid var(--mantine-color-default-border, #dee2e6)",
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <Text size="xs" c="dimmed" mb={4}>
            Progress bar for section
          </Text>
          <Progress value={sectionPercent} size="lg" radius="md" />
          <Group justify="space-between" mt={6}>
            <Text size="xs" c="dimmed">
              {formatDuration(activeRun.stepElapsedSec)} / {formatDuration(currentSection.durationSec)}
            </Text>
            <Text size="xs" c="dimmed">
              {formatDuration(Math.max(0, currentSection.durationSec - activeRun.stepElapsedSec))} left
            </Text>
          </Group>
        </Box>
      </Box>

      <Group justify="center" gap="xs" py="md" wrap="wrap">
        <Button variant="default" size="sm" onClick={prev}>
          Back
        </Button>
        {activeRun.isRunning ? (
          <Button variant="default" size="sm" onClick={pause}>
            Pause
          </Button>
        ) : (
          <Button size="sm" onClick={resume}>
            Resume
          </Button>
        )}
        <Button variant="default" size="sm" onClick={next}>
          Skip
        </Button>
        <Button
          color="green"
          size="sm"
          onClick={() => {
            finish();
            router.push("/done");
          }}
        >
          Finish
        </Button>
      </Group>

      <Box mt="auto" pt="xs">
        <Text size="xs" c="dimmed" mb={4}>
          Routine · {formatDuration(activeRun.elapsedSec)} / {formatDuration(totalDurationSec)}
        </Text>
        <Progress value={routinePercent} size="xl" radius="xl" h={22} />
      </Box>
    </Box>
  );
}
