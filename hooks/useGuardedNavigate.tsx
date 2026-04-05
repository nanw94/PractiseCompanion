"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Group, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useAppData } from "@/components/AppDataProvider";

/** In-app navigation with Jira-style unsaved prompt when `dirty`. */
export function useGuardedNavigate() {
  const router = useRouter();
  const { dirty, commit, revertDraft } = useAppData();

  const guardedPush = useCallback(
    (href: string) => {
      if (!dirty) {
        router.push(href);
        return;
      }

      const go = () => {
        modals.closeAll();
        router.push(href);
      };

      modals.open({
        title: "Unsaved changes",
        children: (
          <Stack gap="md">
            <Text size="sm">Save your changes, discard them, or stay on this page.</Text>
            <Group justify="flex-end" wrap="wrap">
              <Button variant="default" onClick={() => modals.closeAll()}>
                Stay
              </Button>
              <Button
                color="red"
                variant="light"
                onClick={() => {
                  revertDraft();
                  go();
                }}
              >
                Discard
              </Button>
              <Button
                onClick={() => {
                  void (async () => {
                    const ok = await commit();
                    if (ok) go();
                  })();
                }}
              >
                Save
              </Button>
            </Group>
          </Stack>
        ),
      });
    },
    [router, dirty, commit, revertDraft],
  );

  return guardedPush;
}
