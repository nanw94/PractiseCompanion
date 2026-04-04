"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon, Button, Card, Container, Group, Select, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconBooks } from "@tabler/icons-react";
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
    <Container size="sm" py="md" fluid={!!activeRun} style={activeRun ? { maxWidth: "100%" } : undefined}>
      <Stack gap="md">
        {!activeRun ? <Title order={2}>Today</Title> : null}

        {!activeRun ? (
          <Card withBorder>
            <Stack gap="sm">
              <Title order={3}>Summary</Title>
              <Group>
                <Text fw={700}>{totalMin} min</Text>
                <Text c="dimmed">{todaySessions.length} sessions</Text>
              </Group>
            </Stack>
          </Card>
        ) : null}

        {!activeRun ? (
          <Card withBorder>
            <Stack gap="sm">
              <Title order={3}>Start a routine</Title>
              <Select
                label="Routine"
                placeholder="Choose a routine"
                data={routines.map((r) => ({ value: r.id, label: r.name }))}
                value={routineId}
                onChange={setRoutineId}
                comboboxProps={{ withinPortal: true }}
              />
              <Button
                disabled={!routineId}
                onClick={() => {
                  if (!routineId) return;
                  start(routineId);
                }}
              >
                Start routine
              </Button>
              <Tooltip label="Manage routines in Library">
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label="Manage routines in Library"
                  onClick={() => router.push("/library?tab=routines")}
                >
                  <IconBooks size={22} />
                </ActionIcon>
              </Tooltip>
            </Stack>
          </Card>
        ) : null}

        {activeRun ? <PracticeRunner /> : null}
      </Stack>
    </Container>
  );
}
