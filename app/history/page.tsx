"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Container, Group, Select, Stack, Text, Title } from "@mantine/core";
import { useAppData } from "@/hooks/useAppData";
import { formatDuration } from "@/lib/time";

function dateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function HistoryPage() {
  const { data, update } = useAppData();
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const s of data.sessions) for (const t of s.tags) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.sessions]);

  const sessions = useMemo(() => {
    if (!tagFilter) return data.sessions;
    return data.sessions.filter((s) => s.tags.includes(tagFilter));
  }, [data.sessions, tagFilter]);

  return (
    <Container size="sm">
      <Stack gap="md">
        <Group justify="space-between" align="end">
          <Title order={2}>History</Title>
          <Select
            label="Filter by tag"
            placeholder="All"
            clearable
            data={allTags}
            value={tagFilter}
            onChange={setTagFilter}
            w={220}
          />
        </Group>

        {sessions.length === 0 ? (
          <Text c="dimmed">No sessions yet.</Text>
        ) : (
          <Stack gap="sm">
            {sessions.map((s) => (
              <Card key={s.id} withBorder>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={600}>{dateLabel(s.startedAt)}</Text>
                    <Text fw={700}>{formatDuration(s.durationSec)}</Text>
                  </Group>

                  <Group gap="xs">
                    {s.tags.slice(0, 6).map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </Group>

                  <Group justify="flex-end">
                    <Button
                      variant="default"
                      color="red"
                      onClick={() => {
                        update((prev) => ({
                          ...prev,
                          sessions: prev.sessions.filter((x) => x.id !== s.id),
                        }));
                      }}
                    >
                      Delete
                    </Button>
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

