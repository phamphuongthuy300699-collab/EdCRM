-- Settings directories: organization, branches, rooms, courses, groups, staff and payments.

alter table public.organizations
add column if not exists phone text,
add column if not exists email text,
add column if not exists legal_name text,
add column if not exists inn text,
add column if not exists ogrn text;

alter table public.branches
add column if not exists email text,
add column if not exists work_hours text,
add column if not exists map_url text,
add column if not exists description text,
add column if not exists show_on_site boolean not null default true,
add column if not exists sort_order int not null default 100,
add column if not exists updated_at timestamptz not null default now();

update public.branches
set work_hours = coalesce(work_hours, hours)
where work_hours is null
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'branches'
      and column_name = 'hours'
  );

alter table public.rooms
add column if not exists is_active boolean not null default true,
add column if not exists description text,
add column if not exists equipment text,
add column if not exists updated_at timestamptz not null default now();

alter table public.courses
add column if not exists is_active boolean not null default true,
add column if not exists seo_title text,
add column if not exists seo_description text;

alter table public.groups
add column if not exists show_on_site boolean not null default true,
add column if not exists sort_order int not null default 100;

alter table public.profiles
add column if not exists email text,
add column if not exists specialty text,
add column if not exists public_bio text,
add column if not exists internal_comment text,
add column if not exists show_on_site boolean not null default false,
add column if not exists sort_order int not null default 100;

create table if not exists public.payment_provider_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('alfabank')),
  is_enabled boolean not null default false,
  mode text not null default 'test' check (mode in ('test', 'live')),
  merchant_id text,
  terminal_id text,
  return_url text,
  fail_url text,
  webhook_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

alter table public.payment_provider_settings enable row level security;

drop policy if exists "payment_provider_settings_select_admins_managers" on public.payment_provider_settings;
create policy "payment_provider_settings_select_admins_managers"
on public.payment_provider_settings
for select to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[])
);

drop policy if exists "payment_provider_settings_insert_admins" on public.payment_provider_settings;
create policy "payment_provider_settings_insert_admins"
on public.payment_provider_settings
for insert to authenticated
with check (
  public.has_org_role(organization_id, array['owner','admin']::public.app_role[])
);

drop policy if exists "payment_provider_settings_update_admins" on public.payment_provider_settings;
create policy "payment_provider_settings_update_admins"
on public.payment_provider_settings
for update to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin']::public.app_role[])
)
with check (
  public.has_org_role(organization_id, array['owner','admin']::public.app_role[])
);

drop policy if exists "payment_provider_settings_delete_admins" on public.payment_provider_settings;
create policy "payment_provider_settings_delete_admins"
on public.payment_provider_settings
for delete to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin']::public.app_role[])
);

insert into public.payment_provider_settings (organization_id, provider, is_enabled, mode)
select id, 'alfabank', false, 'test'
from public.organizations
on conflict (organization_id, provider) do nothing;
