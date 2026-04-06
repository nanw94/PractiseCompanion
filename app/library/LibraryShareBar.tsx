"use client";

import { useRef, useState } from "react";
import { Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconDownload, IconUpload } from "@tabler/icons-react";
import { useAppData } from "@/hooks/useAppData";
import { appendLibraryShareImport, buildLibraryShareExport, parseLibraryShareImport } from "@/lib/library-share";
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

function newSectionTemplateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `section_${crypto.randomUUID()}`;
  return `section_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function newFocusItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `focus_${crypto.randomUUID()}`;
  return `focus_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function LibraryShareBar() {
  const { data, update, commit } = useAppData();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card withBorder>
      <Stack gap="sm">
        <Text fw={600}>Share library</Text>
        <Text c="dimmed" size="sm">
          Export saved sections and focus as JSON (no routines, no focus links on sections). Import adds new
          items only — nothing is removed. If a section name or focus label already exists, the imported one is
          renamed (e.g. <code>abc</code> → <code>abc2</code>).
        </Text>
        <Group gap="sm" wrap="wrap">
          <Button
            size="sm"
            variant="light"
            color="burgundy"
            leftSection={<IconDownload size={18} />}
            onClick={() => {
              const payload = buildLibraryShareExport({
                stepLibrary: data.stepLibrary,
                focusLibrary: data.focusLibrary,
              });
              const day = payload.exportedAt.slice(0, 10);
              download(`practice-companion-library-${day}.json`, JSON.stringify(payload, null, 2));
            }}
          >
            Export sections &amp; focus
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={async (e) => {
              setError(null);
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                if (text.length > 8 * 1024 * 1024) {
                  setError("File is too large.");
                  return;
                }
                let parsedJson: unknown;
                try {
                  parsedJson = JSON.parse(text) as unknown;
                } catch {
                  setError("Invalid JSON.");
                  return;
                }
                const parsed = parseLibraryShareImport(parsedJson);
                if (!parsed) {
                  setError("Not a valid file (library v2, legacy v1, or full app export).");
                  return;
                }
                if (parsed.sections.length === 0 && parsed.focus.length === 0) {
                  setError("Nothing to import in this file.");
                  return;
                }
                modals.openConfirmModal({
                  title: "Import sections & focus?",
                  children: (
                    <Text size="sm">
                      This adds {parsed.sections.length} section(s) and {parsed.focus.length} focus item(s). Your
                      existing sections, focus, routines, and history are kept. Names that clash with what you
                      already have get a numeric suffix.
                    </Text>
                  ),
                  labels: { confirm: "Import", cancel: "Cancel" },
                  confirmProps: { color: "burgundy" },
                  onConfirm: () => {
                    update((prev) => {
                      const { stepLibrary, focusLibrary } = appendLibraryShareImport({
                        stepLibrary: prev.stepLibrary ?? [],
                        focusLibrary: prev.focusLibrary ?? [],
                        parsed,
                        newSectionId: newSectionTemplateId,
                        newFocusId: newFocusItemId,
                      });
                      return { ...prev, stepLibrary, focusLibrary };
                    });
                    void commit();
                  },
                });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Import failed");
              } finally {
                if (fileRef.current) fileRef.current.value = "";
              }
            }}
          />
          <Button
            size="sm"
            variant="default"
            leftSection={<IconUpload size={18} />}
            onClick={() => fileRef.current?.click()}
          >
            Import sections &amp; focus
          </Button>
        </Group>
        {error ? (
          <Text c="red" size="sm">
            {error}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
