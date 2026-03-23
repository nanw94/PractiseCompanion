"use client";

import { useRouter } from "next/navigation";
import { Button, Card, Container, Group, Stack, Text, Title } from "@mantine/core";
import { useAppData } from "@/hooks/useAppData";
import { resolveFocusLabels } from "@/lib/focus";
import { formatDuration } from "@/lib/time";

export default function DonePage() {
  const router = useRouter();
  const { data } = useAppData();
  const done = data.lastCompletedRun;
  const focusLibrary = data.focusLibrary ?? [];

  if (!done) {
    return (
      <Container size="sm">
        <Stack gap="md">
          <Title order={2}>Done</Title>
          <Text c="dimmed">No completed routine to show.</Text>
          <Button variant="default" onClick={() => router.push("/")}>
            Go home
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="sm">
      <Stack gap="md">
        <Group justify="space-between" align="end">
          <Title order={2}>Done</Title>
          <Text c="dimmed">{formatDuration(done.totalDurationSec)}</Text>
        </Group>

        <Card withBorder>
          <Stack gap={4}>
            <Text fw={700}>{done.routineName}</Text>
            <Text c="dimmed" size="sm">
              {new Date(done.startedAt).toLocaleString()} → {new Date(done.endedAt).toLocaleTimeString()}
            </Text>
          </Stack>
        </Card>

        <Stack gap="sm">
          {done.steps.map((s, idx) => (
            <Card key={s.id} withBorder>
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text fw={600}>
                    Section {idx + 1}: {s.name}
                  </Text>
                  <Text c="dimmed">{formatDuration(s.durationSec)}</Text>
                </Group>
                {resolveFocusLabels(s.focusIds ?? [], focusLibrary).length ? (
                  <Text c="dimmed">
                    Focus: {resolveFocusLabels(s.focusIds ?? [], focusLibrary).join(", ")}
                  </Text>
                ) : null}
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

