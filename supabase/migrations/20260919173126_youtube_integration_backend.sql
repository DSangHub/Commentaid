create extension if not exists pgcrypto;

create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('youtube')),
  provider_account_id text not null,
  display_name text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  automation_mode text not null default 'approval' check (automation_mode in ('draft', 'approval', 'auto_routine', 'paused')),
  status text not null default 'active' check (status in ('active', 'reconnect_required', 'revoked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

create table public.managed_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  external_id text not null,
  external_parent_id text,
  author_name text,
  body text not null,
  language text,
  video_id text,
  video_title text,
  published_at timestamptz,
  status text not null default 'new' check (status in ('new', 'drafted', 'approved', 'posted', 'ignored', 'escalated')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connected_account_id, external_id)
);

create table public.reply_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.managed_comments(id) on delete cascade,
  english_reply text not null,
  native_reply text not null,
  language text not null,
  tone text not null default 'Helpful',
  risk text not null default 'routine' check (risk in ('routine', 'sensitive', 'urgent')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'posted', 'rejected', 'failed')),
  approved_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reply_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_id uuid not null references public.reply_drafts(id) on delete cascade,
  external_reply_id text,
  status text not null check (status in ('posted', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index managed_comments_user_status_idx on public.managed_comments(user_id, status, published_at desc);
create index reply_drafts_user_status_idx on public.reply_drafts(user_id, status, created_at desc);
create index audit_events_user_created_idx on public.audit_events(user_id, created_at desc);

alter table public.connected_accounts enable row level security;
alter table public.managed_comments enable row level security;
alter table public.reply_drafts enable row level security;
alter table public.reply_publications enable row level security;
alter table public.audit_events enable row level security;

-- These tables are intentionally server-only. The service-role client verifies the
-- signed-in user before every operation, while direct browser Data API access is denied.
revoke all on public.connected_accounts from anon, authenticated;
revoke all on public.managed_comments from anon, authenticated;
revoke all on public.reply_drafts from anon, authenticated;
revoke all on public.reply_publications from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;
revoke all on sequence public.audit_events_id_seq from anon, authenticated;
