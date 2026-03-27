# Supabase + Vercel (free tier)

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. **Project Settings → API**: copy **Project URL** and **anon public** key into `.env.local` (see `.env.example`).

## 2. Database schema

In **SQL Editor**, run the script in `supabase/migrations/001_user_app_data.sql`.

This creates `public.user_app_data` (`user_id`, `payload` JSONB, `updated_at`) with **Row Level Security** so each user only reads/writes their own row.

## 3. Auth redirect URLs

**Authentication → URL configuration**:

- **Site URL**: your production URL (e.g. `https://your-app.vercel.app`) or `http://localhost:3000` for dev.
- **Redirect URLs** (add both):

  - `http://localhost:3000/auth/callback`
  - `https://YOUR_VERCEL_DOMAIN/auth/callback`

## 4. Google sign-in

**Authentication → Providers → Google**: enable and paste **Client ID** and **Client Secret** from [Google Cloud Console](https://console.cloud.google.com/) (OAuth 2.0 Web client). Authorized redirect URI in Google must match Supabase’s callback URL (shown in the Supabase Google provider settings).

## 5. Apple sign-in

**Authentication → Providers → Apple**: follow Supabase’s Apple setup. You need an **Apple Developer** account ($/year) for a production **Services ID** and key. Add Apple’s redirect URL Supabase shows to your Apple developer configuration.

## 6. Vercel

In the Vercel project → **Settings → Environment Variables**, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Redeploy after saving.

## 7. How the app uses Supabase

- **Middleware** refreshes the auth cookie on each request (`middleware.ts`).
- **OAuth** returns to `/auth/callback`, which exchanges the code for a session.
- **Library / routines / sessions** live in `AppData`; when signed in, the app **GET/PUT** `/api/app-data`, which reads/writes `user_app_data.payload` under RLS.

## 8. Images (later)

Store files in **Supabase Storage** (new bucket + RLS). Keep **metadata** (paths, MIME types) in Postgres or inside `payload` JSON. Do not rely on huge base64 blobs in `user_app_data` (2 MB request limit on the API route).
