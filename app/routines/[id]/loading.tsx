"use client";

import { Center, Loader, Stack, Text } from "@mantine/core";

export default function RoutineEditLoading() {
  return (
    <Center mih="45dvh" py="xl">
      <Stack align="center" gap="sm">
        <Loader />
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      </Stack>
    </Center>
  );
}
