"use client";

import { useState } from "react";
import { ActionIcon, Button, Card, Group, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import type { FocusItem } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";
import { modals } from "@mantine/modals";

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

              <Group gap={6}>
                {editingFocusId === f.id ? (
                  <>
                    <Tooltip label="Cancel">
                      <ActionIcon
                        variant="default"
                        size="lg"
                        aria-label="Cancel"
                        onClick={() => {
                          setEditingFocusId(null);
                          setEditingFocusLabel("");
                        }}
                      >
                        <IconX size={20} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Save">
                      <ActionIcon
                        size="lg"
                        variant="light"
                        color="burgundy"
                        aria-label="Save"
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
                        <IconCheck size={20} />
                      </ActionIcon>
                    </Tooltip>
                  </>
                ) : (
                  <Tooltip label="Edit focus">
                    <ActionIcon
                      variant="default"
                      size="lg"
                      aria-label="Edit focus"
                      onClick={() => {
                        setEditingFocusId(f.id);
                        setEditingFocusLabel(f.label);
                      }}
                    >
                      <IconPencil size={20} />
                    </ActionIcon>
                  </Tooltip>
                )}
                <Tooltip label="Delete focus">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="lg"
                    aria-label="Delete focus"
                    onClick={() => {
                      modals.openConfirmModal({
                        title: "Delete focus",
                        children: <Text size="sm">Are you sure you want to delete the focus "{f.label}"?</Text>,
                        labels: { confirm: "Delete", cancel: "Cancel" },
                        confirmProps: { color: "red" },
                        onConfirm: () => {
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
