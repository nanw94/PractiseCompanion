"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Container,
  Group,
  MultiSelect,
  NumberInput,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type { FocusItem, RoutineTemplate, StepTemplate } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";
import { useActiveRun } from "@/hooks/useActiveRun";
import { formatDuration } from "@/lib/time";

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function newRoutineId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const TAB_VALUES = ["routines", "sections", "focus"] as const;
type TabValue = (typeof TAB_VALUES)[number];

export default function LibraryPage() {
  const router = useRouter();
  const { data, update } = useAppData();
  const { activeRun, start } = useActiveRun();

  const [tab, setTab] = useState<TabValue>("routines");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && TAB_VALUES.includes(t as TabValue)) setTab(t as TabValue);
  }, []);

  const setTabAndUrl = (v: string | null) => {
    if (!v || !TAB_VALUES.includes(v as TabValue)) return;
    setTab(v as TabValue);
    router.replace(`/library?tab=${v}`);
  };

  const focusLibrary = data.focusLibrary ?? [];
  const stepLibrary = data.stepLibrary ?? [];
  const routines = data.routines ?? [];

  const [routineName, setRoutineName] = useState("New routine");
  const [focusLabel, setFocusLabel] = useState("");
  const [editingFocusId, setEditingFocusId] = useState<string | null>(null);
  const [editingFocusLabel, setEditingFocusLabel] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [sectionMinutes, setSectionMinutes] = useState<number | string>(5);
  const [sectionFocusIds, setSectionFocusIds] = useState<string[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const [editingSectionMinutes, setEditingSectionMinutes] = useState<number | string>(5);
  const [editingSectionFocusIds, setEditingSectionFocusIds] = useState<string[]>([]);

  const sectionMinutesNum = useMemo(() => {
    const n = typeof sectionMinutes === "number" ? sectionMinutes : parseFloat(String(sectionMinutes));
    return Number.isFinite(n) ? Math.max(1, Math.round(n)) : 5;
  }, [sectionMinutes]);

  const totalSections = useMemo(
    () => routines.reduce((acc, r) => acc + (r.steps?.length ?? 0), 0),
    [routines],
  );

  return (
    <Container size="sm">
      <Stack gap="md">
        <Title order={2}>Library</Title>
        <Text c="dimmed" size="sm">
          Routines, sections, and focus — all in one place.
        </Text>

        <Tabs value={tab} onChange={setTabAndUrl}>
          <Tabs.List grow>
            <Tabs.Tab value="routines">Routines</Tabs.Tab>
            <Tabs.Tab value="sections">Sections</Tabs.Tab>
            <Tabs.Tab value="focus">Focus</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="routines" pt="md">
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
                          steps: [{ id: newId("step"), name: "Warm-up", durationSec: 5 * 60, focusIds: [] }],
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
          </Tabs.Panel>

          <Tabs.Panel value="sections" pt="md">
            <Stack gap="md">
              <Card withBorder>
                <Stack gap="sm">
                  <Text fw={600}>Add section template</Text>
                  <TextInput
                    label="Name"
                    value={sectionName}
                    onChange={(e) => setSectionName(e.currentTarget.value)}
                  />
                  <NumberInput
                    label="Minutes"
                    min={1}
                    max={120}
                    value={sectionMinutes}
                    onChange={setSectionMinutes}
                  />
                  <MultiSelect
                    label="Focus"
                    data={focusLibrary.map((f) => ({ value: f.id, label: f.label }))}
                    value={sectionFocusIds}
                    onChange={setSectionFocusIds}
                    searchable
                    comboboxProps={{ withinPortal: true }}
                  />
                  <Button
                    disabled={!sectionName.trim()}
                    onClick={() => {
                      const section: StepTemplate = {
                        id: newId("section"),
                        name: sectionName.trim(),
                        durationSec: sectionMinutesNum * 60,
                        focusIds: sectionFocusIds,
                      };
                      update((prev) => ({
                        ...prev,
                        stepLibrary: [section, ...(prev.stepLibrary ?? [])],
                      }));
                      setSectionName("");
                      setSectionMinutes(5);
                      setSectionFocusIds([]);
                    }}
                  >
                    Add section
                  </Button>
                </Stack>
              </Card>

              <Stack gap="sm">
                {stepLibrary.map((s) => (
                  <Card key={s.id} withBorder>
                    <Stack gap="xs">
                      <Group justify="space-between" align="center">
                        {editingSectionId === s.id ? (
                          <TextInput
                            value={editingSectionName}
                            onChange={(e) => setEditingSectionName(e.currentTarget.value)}
                            style={{ flex: 1 }}
                          />
                        ) : (
                          <Text fw={600}>{s.name}</Text>
                        )}
                        <Text c="dimmed" size="sm">
                          {formatDuration(s.durationSec)}
                        </Text>
                      </Group>

                      {editingSectionId === s.id ? (
                        <>
                          <NumberInput
                            label="Minutes"
                            min={1}
                            max={120}
                            value={editingSectionMinutes}
                            onChange={setEditingSectionMinutes}
                          />
                          <MultiSelect
                            label="Focus"
                            data={focusLibrary.map((f) => ({ value: f.id, label: f.label }))}
                            value={editingSectionFocusIds}
                            onChange={setEditingSectionFocusIds}
                            searchable
                            comboboxProps={{ withinPortal: true }}
                          />
                        </>
                      ) : null}

                      <Group justify="flex-end">
                        {editingSectionId === s.id ? (
                          <>
                            <Button variant="default" onClick={() => setEditingSectionId(null)}>
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                const mins =
                                  typeof editingSectionMinutes === "number"
                                    ? editingSectionMinutes
                                    : parseFloat(String(editingSectionMinutes));
                                update((prev) => ({
                                  ...prev,
                                  stepLibrary: (prev.stepLibrary ?? []).map((x) =>
                                    x.id === s.id
                                      ? {
                                          ...x,
                                          name: editingSectionName.trim() || x.name,
                                          durationSec: Math.max(60, Math.round((mins || 1) * 60)),
                                          focusIds: editingSectionFocusIds,
                                        }
                                      : x,
                                  ),
                                }));
                                setEditingSectionId(null);
                              }}
                            >
                              Save
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="default"
                            onClick={() => {
                              setEditingSectionId(s.id);
                              setEditingSectionName(s.name);
                              setEditingSectionMinutes(Math.round(s.durationSec / 60));
                              setEditingSectionFocusIds(s.focusIds);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="default"
                          color="red"
                          onClick={() => {
                            update((prev) => ({
                              ...prev,
                              stepLibrary: (prev.stepLibrary ?? []).filter((x) => x.id !== s.id),
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
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="focus" pt="md">
            <Stack gap="md">
              <Card withBorder>
                <Stack gap="sm">
                  <Text fw={600}>Add focus</Text>
                  <Group align="end">
                    <TextInput
                      label="Label"
                      value={focusLabel}
                      onChange={(e) => setFocusLabel(e.currentTarget.value)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      disabled={!focusLabel.trim()}
                      onClick={() => {
                        const label = focusLabel.trim();
                        if (!label) return;
                        update((prev) => {
                          const exists = (prev.focusLibrary ?? []).some(
                            (f) => f.label.toLowerCase() === label.toLowerCase(),
                          );
                          if (exists) return prev;
                          const item: FocusItem = { id: newId("focus"), label };
                          return { ...prev, focusLibrary: [item, ...(prev.focusLibrary ?? [])] };
                        });
                        setFocusLabel("");
                      }}
                    >
                      Add
                    </Button>
                  </Group>
                </Stack>
              </Card>

              <Stack gap="sm">
                {focusLibrary.map((f) => (
                  <Card key={f.id} withBorder>
                    <Group justify="space-between" align="center">
                      {editingFocusId === f.id ? (
                        <TextInput
                          value={editingFocusLabel}
                          onChange={(e) => setEditingFocusLabel(e.currentTarget.value)}
                          style={{ flex: 1 }}
                        />
                      ) : (
                        <Text fw={600}>{f.label}</Text>
                      )}

                      <Group>
                        {editingFocusId === f.id ? (
                          <>
                            <Button
                              variant="default"
                              onClick={() => {
                                setEditingFocusId(null);
                                setEditingFocusLabel("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                const label = editingFocusLabel.trim();
                                if (!label) return;
                                update((prev) => ({
                                  ...prev,
                                  focusLibrary: (prev.focusLibrary ?? []).map((x) =>
                                    x.id === f.id ? { ...x, label } : x,
                                  ),
                                }));
                                setEditingFocusId(null);
                                setEditingFocusLabel("");
                              }}
                            >
                              Save
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="default"
                            onClick={() => {
                              setEditingFocusId(f.id);
                              setEditingFocusLabel(f.label);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="default"
                          color="red"
                          onClick={() => {
                            update((prev) => ({
                              ...prev,
                              focusLibrary: (prev.focusLibrary ?? []).filter((x) => x.id !== f.id),
                              routines: (prev.routines ?? []).map((r) => ({
                                ...r,
                                steps: r.steps.map((s) => ({
                                  ...s,
                                  focusIds: s.focusIds.filter((id) => id !== f.id),
                                })),
                              })),
                              stepLibrary: (prev.stepLibrary ?? []).map((s) => ({
                                ...s,
                                focusIds: s.focusIds.filter((id) => id !== f.id),
                              })),
                            }));
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
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
