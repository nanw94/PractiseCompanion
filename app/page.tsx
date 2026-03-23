"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Container, Group, Select, Stack, Text, Title } from "@mantine/core";
import { useActiveRun } from "@/hooks/useActiveRun";
import { useAppData } from "@/hooks/useAppData";
import { PracticeRunner } from "@/components/PracticeRunner";

function isSameDay(aIso: string, b: Date) {
  const a = new Date(aIso);
  return a.toDateString() === b.toDateString();
}

export default function HomePage() {
  const router = useRouter();
  const { data } = useAppData();
  const { activeRun, start } = useActiveRun();
  const routines = data.routines ?? [];
  const [routineId, setRoutineId] = useState<string | null>(routines[0]?.id ?? null);

  const today = useMemo(() => new Date(), []);
  const todaySessions = useMemo(
    () => data.sessions.filter((s) => isSameDay(s.endedAt, today)),
    [data.sessions, today],
  );
  const totalMin = useMemo(
    () => Math.round(todaySessions.reduce((acc, s) => acc + s.durationSec, 0) / 60),
    [todaySessions],
  );

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Title order={2}>Practice Hub</Title>

        <Card withBorder>
          <Stack gap="sm">
            <Title order={3}>Today</Title>
            <Group>
              <Text fw={700}>{totalMin} min</Text>
              <Text c="dimmed">{todaySessions.length} sessions</Text>
            </Group>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack gap="sm">
            <Title order={3}>Routine</Title>
            <Select
              label="Routine"
              placeholder="Choose a routine"
              data={routines.map((r) => ({ value: r.id, label: r.name }))}
              value={routineId}
              onChange={setRoutineId}
            />
            {!activeRun ? (
              <Button
                disabled={!routineId}
                onClick={() => {
                  if (!routineId) return;
                  start(routineId);
                }}
              >
                Start routine
              </Button>
            ) : null}
            <Button variant="default" onClick={() => router.push("/routines")}>
              Edit routines
            </Button>
            <Button variant="default" onClick={() => router.push("/library")}>
              Open library
            </Button>
          </Stack>
        </Card>

        {activeRun ? (
          <Card withBorder>
            <PracticeRunner />
          </Card>
        ) : null}
      </Stack>
    </Container>
  );
}
