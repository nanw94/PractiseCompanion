"use client";

import type { ReactNode } from "react";
import { Group, Stack, Text, Title } from "@mantine/core";

type MusicPageShellProps = {
  eyebrow?: string;
  title?: string;
  /** When set, replaces the string `title` (e.g. editable name field). */
  titleSlot?: ReactNode;
  hint?: string;
  trailing?: ReactNode;
  children: ReactNode;
};

/** Themed page header + content wrapper. See docs/music-theme-template.md. */
export function MusicPageShell({ eyebrow, title, titleSlot, hint, trailing, children }: MusicPageShellProps) {
  const hasHeader = eyebrow || title || titleSlot || hint || trailing;

  return (
    <Stack gap="lg" className="music-page-shell" pt="xs">
      {hasHeader ? (
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Stack gap={6} style={{ flex: 1, minWidth: 200 }}>
            {eyebrow ? (
              <Text size="xs" tt="uppercase" fw={700} className="music-eyebrow">
                {eyebrow}
              </Text>
            ) : null}
            {titleSlot ? (
              <div className="music-page-title-slot">{titleSlot}</div>
            ) : title ? (
              <Title order={2} className="music-page-title">
                {title}
              </Title>
            ) : null}
            {hint ? (
              <Text size="sm" className="music-hint">
                {hint}
              </Text>
            ) : null}
          </Stack>
          {trailing ? <div>{trailing}</div> : null}
        </Group>
      ) : null}
      {children}
    </Stack>
  );
}
