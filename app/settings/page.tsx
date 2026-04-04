"use client";

import { useRef, useState } from "react";
import { ActionIcon, Card, Container, Group, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconDownload, IconTrash, IconUpload } from "@tabler/icons-react";
import { useAppData } from "@/hooks/useAppData";
import { modals } from "@mantine/modals";

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const { data, update, cloudSyncEnabled } = useAppData();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Container size="sm">
      <Stack gap="md">
        <Title order={2}>Settings</Title>

        <Card withBorder>
          <Stack gap="sm">
            <Title order={3}>Data</Title>
            <Text c="dimmed" size="sm">
              {cloudSyncEnabled
                ? "Signed in: your library syncs to Supabase (and stays cached in this browser). Export/import is still available as JSON backup."
                : "Local-only storage in this browser. Sign in from the header to sync with Supabase. Export/import is JSON."}
            </Text>

            <Group>
              <Tooltip label="Export JSON">
                <ActionIcon
                  size="lg"
                  variant="light"
                  aria-label="Export JSON"
                  onClick={() => {
                    download(
                      `practice-companion-export-${new Date().toISOString()}.json`,
                      JSON.stringify(data, null, 2),
                    );
                  }}
                >
                  <IconDownload size={22} />
                </ActionIcon>
              </Tooltip>

              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={async (e) => {
                  setError(null);
                  const file = e.target.files?.[0];
                  if (!file) return;

                  try {
                    const text = await file.text();
                    const imported = JSON.parse(text) as typeof data;
                    update((prev) => ({ ...prev, ...imported }));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Import failed");
                  } finally {
                    if (fileRef.current) fileRef.current.value = "";
                  }
                }}
              />

              <Tooltip label="Import JSON">
                <ActionIcon
                  size="lg"
                  variant="default"
                  aria-label="Import JSON"
                  onClick={() => fileRef.current?.click()}
                >
                  <IconUpload size={22} />
                </ActionIcon>
              </Tooltip>
            </Group>

            {error ? (
              <Text c="red" size="sm">
                {error}
              </Text>
            ) : null}
          </Stack>
        </Card>

        <Card withBorder>
          <Stack gap="sm">
            <Title order={3}>Reset</Title>
            <Tooltip label="Wipe all data">
              <ActionIcon
                color="red"
                variant="light"
                size="lg"
                aria-label="Wipe all data"
                onClick={() => {
                  modals.openConfirmModal({
                    title: "Wipe all data",
                    children: <Text size="sm">Wipe all local data? This cannot be undone.</Text>,
                    labels: { confirm: "Wipe", cancel: "Cancel" },
                    confirmProps: { color: "red" },
                    onConfirm: () => {
                      update((prev) => ({
                        ...prev,
                        sessions: [],
                        presets: [],
                        routines: [],
                        stepLibrary: [],
                        focusLibrary: [],
                        activeRun: undefined,
                        lastCompletedRun: undefined,
                      }));
                    },
                  });
                }}
              >
                <IconTrash size={22} />
              </ActionIcon>
            </Tooltip>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

