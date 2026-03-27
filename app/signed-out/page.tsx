"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { MusicPageShell } from "@/components/MusicPageShell";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignedOutPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/");
    }
  }, [router]);

  return (
    <Container size="xs" py="xl">
      <MusicPageShell eyebrow="Account" title="Signed out" hint="Your local data has been cleared.">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            You have been signed out. Any data that was only in this browser has been cleared. Your saved library is safe
            in your account — it will load again when you sign back in.
          </Text>
          <Button component={Link} href="/login" size="md">
            Sign in again
          </Button>
          <Button component={Link} href="/" variant="subtle" size="sm">
            Continue without signing in
          </Button>
        </Stack>
      </MusicPageShell>
    </Container>
  );
}
