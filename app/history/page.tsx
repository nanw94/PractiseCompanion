"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Container, Group, Select, Stack, Tabs, Text, Title } from "@mantine/core";
import { useAppData } from "@/hooks/useAppData";
import { formatDuration } from "@/lib/time";

function dateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

type HistoryTab = "chart" | "list";

type DayBar = {
  day: number;
  durationSec: number;
};

type MonthRow = {
  key: string;
  label: string;
  totalSec: number;
  days: DayBar[];
};

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export default function HistoryPage() {
  const { data, update } = useAppData();
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tab, setTab] = useState<HistoryTab>("chart");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const s of data.sessions) for (const t of s.tags) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.sessions]);

  const sessions = useMemo(() => {
    if (!tagFilter) return data.sessions;
    return data.sessions.filter((s) => s.tags.includes(tagFilter));
  }, [data.sessions, tagFilter]);

  const monthRows = useMemo<MonthRow[]>(() => {
    const byMonth = new Map<string, MonthRow>();

    for (const s of sessions) {
      const dt = new Date(s.startedAt);
      if (Number.isNaN(dt.getTime())) continue;
      const y = dt.getFullYear();
      const m = dt.getMonth();
      const d = dt.getDate();
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;

      if (!byMonth.has(key)) {
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        byMonth.set(key, {
          key,
          label: monthLabel(y, m),
          totalSec: 0,
          days: Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, durationSec: 0 })),
        });
      }

      const row = byMonth.get(key)!;
      row.totalSec += s.durationSec;
      row.days[d - 1].durationSec += s.durationSec;
    }

    return Array.from(byMonth.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [sessions]);

  const globalMaxDaySec = useMemo(() => {
    let max = 0;
    for (const row of monthRows) {
      for (const day of row.days) {
        if (day.durationSec > max) max = day.durationSec;
      }
    }
    return max;
  }, [monthRows]);

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
            comboboxProps={{ withinPortal: true }}
          />
        </Group>

        <Tabs value={tab} onChange={(v) => setTab((v as HistoryTab) ?? "chart")}>
          <Tabs.List grow>
            <Tabs.Tab value="chart">Monthly Chart</Tabs.Tab>
            <Tabs.Tab value="list">Session List</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="chart" pt="md">
            {sessions.length === 0 ? (
              <Text c="dimmed">No sessions yet.</Text>
            ) : (
              <Stack gap="sm">
                {monthRows.map((row) => (
                  <Card key={row.key} withBorder>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600}>{row.label}</Text>
                        <Text fw={700}>{formatDuration(row.totalSec)}</Text>
                      </Group>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          gap: 3,
                          overflowX: "auto",
                          paddingBottom: 6,
                          minHeight: 120,
                        }}
                      >
                        {row.days.map((day) => {
                          const ratio = globalMaxDaySec > 0 ? day.durationSec / globalMaxDaySec : 0;
                          const h = Math.max(2, Math.round(ratio * 80));
                          return (
                            <div
                              key={`${row.key}-${day.day}`}
                              title={`Day ${day.day}: ${formatDuration(day.durationSec)}`}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 4,
                                width: 14,
                                flexShrink: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: 10,
                                  height: h,
                                  borderRadius: 3,
                                  background:
                                    day.durationSec > 0
                                      ? "var(--mantine-color-burgundy-6)"
                                      : "var(--mantine-color-gray-4)",
                                  opacity: day.durationSec > 0 ? 0.95 : 0.45,
                                }}
                              />
                              <Text size="10px" c="dimmed" lh={1}>
                                {day.day}
                              </Text>
                            </div>
                          );
                        })}
                      </div>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="list" pt="md">
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
                            if (!window.confirm("Are you sure you want to delete this session?")) return;
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
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

