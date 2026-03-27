import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseAppDataFromJson } from "@/lib/parse-app-data";
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;

async function getSupabase() {
  return createClient();
}

export async function GET() {
  let supabase;
  try {
    supabase = await getSupabase();
  } catch {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.from("user_app_data").select("payload, updated_at").eq("user_id", user.id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.payload) {
    return NextResponse.json({ data: null });
  }

  const parsed = parseAppDataFromJson(data.payload);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid stored payload" }, { status: 500 });
  }

  return NextResponse.json({ data: parsed, updatedAt: data.updated_at });
}

export async function PUT(request: Request) {
  let supabase;
  try {
    supabase = await getSupabase();
  } catch {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseAppDataFromJson(body);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid app data shape" }, { status: 400 });
  }

  const { error } = await supabase.from("user_app_data").upsert(
    {
      user_id: user.id,
      payload: parsed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
