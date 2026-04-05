"use client";

import { usePathname, useRouter } from "next/navigation";
import { ActionIcon, AppShell, Badge, Button, Group, Text, UnstyledButton } from "@mantine/core";
import { useEffect, useMemo } from "react";
import { AuthBar } from "@/components/AuthBar";
import { useAppData } from "@/components/AppDataProvider";
import { useGuardedNavigate } from "@/hooks/useGuardedNavigate";

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Today", href: "/" },
  { label: "Library", href: "/library" },
  { label: "History", href: "/history" },
  { label: "Settings", href: "/settings" },
];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const guardedPush = useGuardedNavigate();
  const { data, dirty, commit, cloudSyncEnabled } = useAppData();
  const hasActiveRoutine = data.activeRun != null;

  const active = useMemo(() => {
    if (pathname?.startsWith("/routines")) return "/library";
    const found = NAV_ITEMS.find((i) => i.href === pathname);
    return found?.href ?? "/";
  }, [pathname]);

  useEffect(() => {
    NAV_ITEMS.forEach((item) => router.prefetch(item.href));
  }, [router]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return (
    <AppShell header={{ height: 56 }} footer={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Text className="music-app-brand" size="lg">
            Practice Companion
          </Text>
          <Group gap="sm" wrap="nowrap">
            {dirty && cloudSyncEnabled ? (
              <Button size="xs" variant="light" onClick={() => void commit()}>
                Save
              </Button>
            ) : null}
            {hasActiveRoutine ? (
              <UnstyledButton onClick={() => guardedPush("/")}>
                <Badge variant="filled">Routine running</Badge>
              </UnstyledButton>
            ) : null}
            <AuthBar />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>

      <AppShell.Footer>
        <Group h="100%" px="md" justify="space-between" gap="xs" grow>
          {NAV_ITEMS.map((item) => (
            <ActionIcon
              key={item.href}
              variant={active === item.href ? "filled" : "subtle"}
              size="lg"
              aria-label={item.label}
              onClick={() => guardedPush(item.href)}
            >
              <Text size="sm">{item.label}</Text>
            </ActionIcon>
          ))}
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}

