"use client";

import { useState } from "react";
import { Button, Card, Group, Stack, Text, TextInput } from "@mantine/core";
import type { FocusItem } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function FocusTab() {
  const { data, update } = useAppData();

  const focusLibrary = data.focusLibrary ?? [];

  const [focusLabel, setFocusLabel] = useState("");
  const [editingFocusId, setEditingFocusId] = useState<string | null>(null);
  const [editingFocusLabel, setEditingFocusLabel] = useState("");

  return (
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
                    if (!window.confirm(`Are you sure you want to delete the focus "${f.label}"?`)) return;
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
  );
}
