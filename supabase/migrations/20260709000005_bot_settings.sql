create table if not exists public.bot_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('max', 'telegram')),
  is_enabled boolean not null default false,
  bot_token_secret text,
  webhook_secret text,
  bot_username text,
  webhook_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create index if not exists idx_bot_settings_org_provider
  on public.bot_settings (organization_id, provider);

alter table public.bot_settings enable row level security;
