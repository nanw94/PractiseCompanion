"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Stack, Tabs, Text, Title } from "@mantine/core";
import { LibraryShareBar } from "./LibraryShareBar";
import { RoutinesTab } from "./RoutinesTab";

const SectionsTab = dynamic(() => import("./SectionsTab").then((m) => ({ default: m.SectionsTab })));
const FocusTab = dynamic(() => import("./FocusTab").then((m) => ({ default: m.FocusTab })));

const TAB_VALUES = ["routines", "sections", "focus"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function LibraryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabValue>("routines");
  const [sectionsAutoNew, setSectionsAutoNew] = useState(false);

  const onSectionsAutoNewConsumed = useCallback(() => setSectionsAutoNew(false), []);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TAB_VALUES.includes(t as TabValue)) setTab(t as TabValue);
    if (searchParams.get("new") === "1") {
      setTab("sections");
      setSectionsAutoNew(true);
      router.replace("/library?tab=sections", { scroll: false });
    }
  }, [searchParams, router]);

  const setTabAndUrl = (v: string | null) => {
    if (!v || !TAB_VALUES.includes(v as TabValue)) return;
    setTab(v as TabValue);
    router.replace(`/library?tab=${v}`);
  };

  return (
    <Container size="sm">
      <Stack gap="md">
        <Title order={2}>Library</Title>
        <Text c="dimmed" size="sm">
          Routines, sections, and focus — all in one place.
        </Text>

        <LibraryShareBar />

        <Tabs value={tab} onChange={setTabAndUrl} keepMounted={false}>
          <Tabs.List grow>
            <Tabs.Tab value="routines">Routines</Tabs.Tab>
            <Tabs.Tab value="sections">Sections</Tabs.Tab>
            <Tabs.Tab value="focus">Focus</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="routines" pt="md">
            <RoutinesTab />
          </Tabs.Panel>

          <Tabs.Panel value="sections" pt="md">
            <SectionsTab autoOpenNew={sectionsAutoNew} onAutoOpenNewConsumed={onSectionsAutoNewConsumed} />
          </Tabs.Panel>

          <Tabs.Panel value="focus" pt="md">
            <FocusTab />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <Container size="sm" py="xl">
          <Text c="dimmed">Loading library…</Text>
        </Container>
      }
    >
      <LibraryPageContent />
    </Suspense>
  );
}
