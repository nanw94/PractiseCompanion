"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Stack, Tabs, Text, Title } from "@mantine/core";
import { RoutinesTab } from "./RoutinesTab";
import { SectionsTab } from "./SectionsTab";
import { FocusTab } from "./FocusTab";

const TAB_VALUES = ["routines", "sections", "focus"] as const;
type TabValue = (typeof TAB_VALUES)[number];

export default function LibraryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabValue>("routines");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && TAB_VALUES.includes(t as TabValue)) setTab(t as TabValue);
  }, []);

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

        <Tabs value={tab} onChange={setTabAndUrl}>
          <Tabs.List grow>
            <Tabs.Tab value="routines">Routines</Tabs.Tab>
            <Tabs.Tab value="sections">Sections</Tabs.Tab>
            <Tabs.Tab value="focus">Focus</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="routines" pt="md">
            <RoutinesTab />
          </Tabs.Panel>

          <Tabs.Panel value="sections" pt="md">
            <SectionsTab />
          </Tabs.Panel>

          <Tabs.Panel value="focus" pt="md">
            <FocusTab />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
