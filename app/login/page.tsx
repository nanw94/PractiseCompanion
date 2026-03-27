"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Anchor,
  Button,
  Container,
  Divider,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const signInWithGoogle = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        // prompt: consent forces Google account picker so user can switch accounts
        queryParams: { prompt: "select_account" },
      },
    });
  }, []);

  const handleEmailAuth = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      if (!email.trim() || !password) {
        setFormError("Email and password are required.");
        return;
      }
      setLoading(true);

      const supabase = createClient();
      if (!supabase) return;

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        setLoading(false);
        if (error) {
          setFormError(error.message);
        } else {
          setSignupSuccess(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
          setFormError(error.message);
        } else {
          router.push("/");
        }
      }
    },
    [email, password, mode, router],
  );

  if (!isSupabaseConfigured()) {
    return (
      <Container size="xs" py="xl">
        <Alert title="Supabase not configured" color="yellow">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code>.env.local</code>, then restart the dev server. See <code>docs/supabase-setup.md</code>.
        </Alert>
      </Container>
    );
  }

  if (signupSuccess) {
    return (
      <Container size="xs" py="xl">
        <Alert title="Check your email" color="green">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to
          sign in.
        </Alert>
        <Button mt="md" variant="subtle" onClick={() => setSignupSuccess(false)}>
          Back to sign in
        </Button>
      </Container>
    );
  }

  return (
    <Container size="xs" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>{mode === "signup" ? "Create account" : "Sign in"}</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Sync your library across devices. Data is saved to your account.
          </Text>
        </div>

        {authError ? (
          <Alert title="Sign-in failed" color="red">
            Something went wrong. Try again or check redirect URLs in the Supabase dashboard.
          </Alert>
        ) : null}

        <Button size="md" variant="default" onClick={() => void signInWithGoogle()}>
          Continue with Google
        </Button>

        <Divider label="or use email" labelPosition="center" />

        <form onSubmit={(e) => void handleEmailAuth(e)}>
          <Stack gap="sm">
            <TextInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Password"
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
            />

            {formError ? (
              <Alert color="red" py="xs">
                {formError}
              </Alert>
            ) : null}

            <Button type="submit" size="md" loading={loading}>
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </Stack>
        </form>

        <Text size="sm" ta="center">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Anchor component="button" onClick={() => { setMode("signin"); setFormError(null); }}>
                Sign in
              </Anchor>
            </>
          ) : (
            <>
              No account yet?{" "}
              <Anchor component="button" onClick={() => { setMode("signup"); setFormError(null); }}>
                Create one
              </Anchor>
            </>
          )}
        </Text>
      </Stack>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
