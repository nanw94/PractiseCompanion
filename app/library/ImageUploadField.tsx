"use client";

import { ActionIcon, Group, Image, Stack, Text, Tooltip } from "@mantine/core";
import { IconPhotoPlus, IconTrash } from "@tabler/icons-react";
import { compressImage } from "@/lib/compress-image";

export function ImageUploadField({
  dataUrl,
  onChange,
}: {
  dataUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Image <Text span size="xs" c="dimmed">(one image, shown during practice)</Text>
      </Text>
      {dataUrl ? (
        <Group align="flex-start" gap="sm">
          <Image
            src={dataUrl}
            alt="section"
            radius="sm"
            h={100}
            w="auto"
            fit="contain"
            style={{ maxWidth: 160, border: "1px solid var(--music-surface-border, #dee2e6)", borderRadius: 8 }}
          />
          <Tooltip label="Remove image">
            <ActionIcon size="md" variant="subtle" color="red" aria-label="Remove image" onClick={() => onChange(null)}>
              <IconTrash size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ) : (
        <label style={{ display: "inline-flex", cursor: "pointer" }}>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0];
              if (!file) return;
              try {
                const dataUrl = await compressImage(file);
                onChange(dataUrl);
              } catch {
                // silently ignore
              }
              e.currentTarget.value = "";
            }}
          />
          <Tooltip label="Upload image">
            <ActionIcon component="span" size="lg" variant="default" aria-label="Upload image">
              <IconPhotoPlus size={22} />
            </ActionIcon>
          </Tooltip>
        </label>
      )}
    </Stack>
  );
}
