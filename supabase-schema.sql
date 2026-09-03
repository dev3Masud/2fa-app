-- ============================================================
-- 2FA Vault - Supabase Schema
-- Run this in Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

-- Users table: stores admin credentials (single-user, but extensible)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  -- PBKDF2 salt + iterations used to wrap the per-user vault key
  kek_salt text not null,
  kek_iterations integer not null default 310000,
  -- Wrapped vault key (encrypted with PBKDF2(password))
  wrapped_vault_key text not null, -- base64
  wrapped_vault_iv text not null,  -- base64
  wrapped_vault_tag text not null, -- base64
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Accounts table: encrypted 2FA entries belonging to a user
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null,
  issuer text not null default '',
  type text not null default 'totp' check (type in ('totp', 'hotp')),
  digits integer not null default 6 check (digits between 6 and 8),
  period integer not null default 30 check (period between 15 and 60),
  algorithm text not null default 'SHA1' check (algorithm in ('SHA1', 'SHA256', 'SHA512')),
  counter bigint not null default 0,
  -- Encrypted TOTP secret (AES-256-GCM with vault key)
  ciphertext text not null, -- base64
  iv text not null,         -- base64
  auth_tag text not null,   -- base64
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookup
create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists accounts_created_at_idx on public.accounts(user_id, created_at desc);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_accounts_updated_at on public.accounts;
create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- We use the SERVICE ROLE key from the server, so RLS is bypassed
-- in our Netlify Functions. But we still enable RLS as a safety
-- net in case the anon key is ever leaked.
-- ============================================================

alter table public.users enable row level security;
alter table public.accounts enable row level security;

-- No policies = no public access. Service role bypasses RLS.
-- (This means the anon key cannot read or write anything.)

-- ============================================================
-- Done. The app will bootstrap the first user from ADMIN_USER /
-- ADMIN_PASS env vars on first login attempt.
-- ============================================================
