"use client";

import { Button, Group, Image, Stack, Text } from "@mantine/core";
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
          <Button size="xs" variant="subtle" color="red" onClick={() => onChange(null)}>
            Remove image
          </Button>
        </Group>
      ) : (
        <label style={{ display: "inline-block" }}>
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
          <Button size="sm" variant="default" component="span">
            Upload image
          </Button>
        </label>
      )}
    </Stack>
  );
}
