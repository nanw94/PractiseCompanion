"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ActionIcon, Badge, Group, Text, Tooltip } from "@mantine/core";
import { IconLogin, IconLogout } from "@tabler/icons-react";
import { useAppData } from "@/components/AppDataProvider";
import { displayAuthEmail } from "@/lib/auth-email";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthBar() {
  const router = useRouter();
  const { commit, cloudSyncEnabled, syncStatus } = useAppData();
  const [accountLabel, setAccountLabel] = useState<string | null>(null);
  const signingOutRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    if (!supabase) return;

    const refresh = () => {
      void supabase.auth.getUser().then(({ data: { user } }) => {
        const meta = user?.user_metadata?.username;
        const em = user?.email ?? null;
        if (typeof meta === "string" && meta.trim()) {
          setAccountLabel(meta.trim());
        } else if (em) {
          setAccountLabel(displayAuthEmail(em));
        } else {
          setAccountLabel(null);
        }
      });
    };

    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (!signingOutRef.current) refresh();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured()) {
    return (
      <Text size="xs" c="dimmed">
        Cloud off
      </Text>
    );
  }

  if (accountLabel) {
    return (
      <Group gap="xs" wrap="nowrap">
        {syncStatus === "saving" ? (
          <Badge size="xs" color="gray" variant="light">
            Saving…
          </Badge>
        ) : syncStatus === "saved" ? (
          <Badge size="xs" color="green" variant="light">
            Saved
          </Badge>
        ) : syncStatus === "error" ? (
          <Badge size="xs" color="red" variant="light">
            Sync error
          </Badge>
        ) : null}
        <Text size="xs" c="dimmed" visibleFrom="sm" lineClamp={1} maw={140}>
          {accountLabel}
        </Text>
        <Tooltip label="Sign out">
          <ActionIcon
            size="md"
            variant="subtle"
            aria-label="Sign out"
            onClick={async () => {
              signingOutRef.current = true;
              if (cloudSyncEnabled) await commit();
              const supabase = createClient();
              await supabase?.auth.signOut({ scope: "global" });
              router.push("/signed-out");
            }}
          >
            <IconLogout size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  }

  return (
    <Tooltip label="Sign in">
      <ActionIcon component={Link} href="/login" variant="light" size="md" aria-label="Sign in">
        <IconLogin size={20} />
      </ActionIcon>
    </Tooltip>
  );
}
