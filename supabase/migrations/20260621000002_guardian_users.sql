-- Migration to add guardian_users table for linking auth users with CRM guardians

create table if not exists public.guardian_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organization_id, guardian_id, user_id)
);

-- Enable RLS
alter table public.guardian_users enable row level security;

-- Drop policy if exists
drop policy if exists "guardian_users_select" on public.guardian_users;
drop policy if exists "guardian_users_all" on public.guardian_users;

-- Add RLS Policies
create policy "guardian_users_select" on public.guardian_users
  for select to authenticated using (
    public.is_org_member(organization_id) or user_id = auth.uid()
  );

create policy "guardian_users_all" on public.guardian_users
  for all to authenticated using (
    public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[])
  );
