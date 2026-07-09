create table if not exists public.guardian_messenger_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  guardian_id uuid references public.guardians(id) on delete cascade,
  provider text not null check (provider in ('max', 'telegram')),
  external_user_id text not null,
  chat_id text,
  phone_normalized text,
  display_name text,
  is_verified boolean not null default false,
  verified_at timestamptz,
  linked_at timestamptz not null default now(),
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (organization_id, provider, external_user_id)
);

create index if not exists idx_guardian_messenger_accounts_guardian_id
  on public.guardian_messenger_accounts (guardian_id);

create index if not exists idx_guardian_messenger_accounts_phone
  on public.guardian_messenger_accounts (phone_normalized);

create index if not exists idx_guardian_messenger_accounts_provider
  on public.guardian_messenger_accounts (provider);

alter table public.guardian_messenger_accounts enable row level security;
