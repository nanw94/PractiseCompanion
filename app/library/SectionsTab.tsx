"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Group,
  Image,
  MultiSelect,
  NumberInput,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import type { StepTemplate } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";
import { formatDuration } from "@/lib/time";
import { ImageUploadField } from "./ImageUploadField";

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function SectionsTab() {
  const { data, update } = useAppData();

  const focusLibrary = data.focusLibrary ?? [];
  const stepLibrary = data.stepLibrary ?? [];

  const [sectionName, setSectionName] = useState("");
  const [sectionMinutes, setSectionMinutes] = useState<number | string>(5);
  const [sectionFocusIds, setSectionFocusIds] = useState<string[]>([]);
  const [sectionNote, setSectionNote] = useState("");
  const [sectionImageDataUrl, setSectionImageDataUrl] = useState<string | null>(null);

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const [editingSectionMinutes, setEditingSectionMinutes] = useState<number | string>(5);
  const [editingSectionFocusIds, setEditingSectionFocusIds] = useState<string[]>([]);
  const [editingSectionNote, setEditingSectionNote] = useState("");
  const [editingSectionImageDataUrl, setEditingSectionImageDataUrl] = useState<string | null>(null);

  const sectionMinutesNum = useMemo(() => {
    const n = typeof sectionMinutes === "number" ? sectionMinutes : parseFloat(String(sectionMinutes));
    return Number.isFinite(n) ? Math.max(1, Math.round(n)) : 5;
  }, [sectionMinutes]);

  return (
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
          <Textarea
            label="Note"
            description="Shown during practice"
            placeholder="Any cues or reminders…"
            rows={3}
            value={sectionNote}
            onChange={(e) => setSectionNote(e.currentTarget.value)}
          />
          <ImageUploadField
            dataUrl={sectionImageDataUrl}
            onChange={setSectionImageDataUrl}
          />
          <Button
            disabled={!sectionName.trim()}
            onClick={() => {
              const section: StepTemplate = {
                id: newId("section"),
                name: sectionName.trim(),
                durationSec: sectionMinutesNum * 60,
                focusIds: sectionFocusIds,
                note: sectionNote.trim() || undefined,
                imageDataUrl: sectionImageDataUrl ?? undefined,
              };
              update((prev) => ({
                ...prev,
                stepLibrary: [section, ...(prev.stepLibrary ?? [])],
              }));
              setSectionName("");
              setSectionMinutes(5);
              setSectionFocusIds([]);
              setSectionNote("");
              setSectionImageDataUrl(null);
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
                  <Textarea
                    label="Note"
                    description="Shown during practice"
                    rows={3}
                    value={editingSectionNote}
                    onChange={(e) => setEditingSectionNote(e.currentTarget.value)}
                  />
                  <ImageUploadField
                    dataUrl={editingSectionImageDataUrl}
                    onChange={setEditingSectionImageDataUrl}
                  />
                </>
              ) : (
                <>
                  {s.note ? (
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      📝 {s.note}
                    </Text>
                  ) : null}
                  {s.imageDataUrl ? (
                    <Image
                      src={s.imageDataUrl}
                      alt="section"
                      radius="sm"
                      h={80}
                      w="auto"
                      fit="contain"
                      style={{ maxWidth: 120 }}
                    />
                  ) : null}
                </>
              )}

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
                                  note: editingSectionNote.trim() || undefined,
                                  imageDataUrl: editingSectionImageDataUrl ?? undefined,
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
                      setEditingSectionNote(s.note ?? "");
                      setEditingSectionImageDataUrl(s.imageDataUrl ?? null);
                    }}
                  >
                    Edit
                  </Button>
                )}
                <Button
                  variant="default"
                  color="red"
                  onClick={() => {
                    if (!window.confirm(`Are you sure you want to delete the section "${s.name}"?`)) return;
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
  );
}
