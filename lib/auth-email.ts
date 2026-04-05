/** Synthetic email for Supabase password auth (username-only UX). */
const SUFFIX = "@users.practice-companion.app";

export function usernameToAuthEmail(username: string): string {
  const t = username.trim().toLowerCase();
  const slug = t.replace(/[^a-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "user";
  return `${slug}${SUFFIX}`;
}

export function isSyntheticAuthEmail(email: string): boolean {
  return email.endsWith(SUFFIX);
}

/** Show username in UI; real emails pass through unchanged. */
export function displayAuthEmail(email: string): string {
  if (isSyntheticAuthEmail(email)) return email.slice(0, -SUFFIX.length);
  return email;
}
