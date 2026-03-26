# Supabase setup (PTI Inspect v2.0)

This app can **insert without auth** (anon key). For production you should add Auth + RLS.
For now, to make Option C work:

## 1) Tables (SQL)

Run this in Supabase SQL Editor (adjust as needed):

```sql
-- Enable uuid generator
create extension if not exists "pgcrypto";

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  org_code text not null,
  device_id text not null,
  form_code text not null,
  form_version text,
  app_version text,
  payload jsonb,
  last_saved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- one submission per (org, device, form)
do $$ begin
  alter table public.submissions
    add constraint submissions_unique_device_form unique (org_code, device_id, form_code);
exception when duplicate_object then null; end $$;

create table if not exists public.submission_assets (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  asset_key text not null,
  asset_type text,
  bucket text,
  public_url text,
  created_at timestamptz default now()
);

create index if not exists idx_submission_assets_submission on public.submission_assets(submission_id);

-- Optional unique constraint on (submission_id, asset_type) to prevent duplicates.
-- The app code uses DELETE+INSERT instead of upsert, so this is a safety net.
do $$ begin
  alter table public.submission_assets
    add constraint submission_assets_unique_slot unique (submission_id, asset_type);
exception when duplicate_object then null; end $$;
```

### Migration: fix duplicate rows (run if you already have data)

If your `submission_assets` table already has duplicate `(submission_id, asset_type)` rows
from the 409 bug, run this to clean them up before adding the unique constraint:

```sql
-- Remove duplicate submission_assets rows keeping only the most recent
DELETE FROM public.submission_assets a
USING public.submission_assets b
WHERE a.submission_id = b.submission_id
  AND a.asset_type = b.asset_type
  AND a.created_at < b.created_at;

-- Now add the constraint
ALTER TABLE public.submission_assets
  ADD CONSTRAINT submission_assets_unique_slot UNIQUE (submission_id, asset_type);
```

## 2) Storage bucket

Create bucket: **pti-inspect** (Public).

## 3) Policies / RLS

If you want anonymous inserts:
- Keep **RLS disabled** on `public.submissions` and `public.submission_assets` (simple, not recommended for production)
- Or enable RLS and add policies for `anon` role.

Storage:
- Ensure your bucket policies allow uploads (insert) and reads (select) for `anon`.

## 4) CORS allowed origins

Supabase Dashboard:
`Project Settings -> API -> CORS allowed origins`

Add:
- `https://teleinspect-order.henkancx.com`

(Optionally also your localhost dev):
- `http://localhost:5173`
