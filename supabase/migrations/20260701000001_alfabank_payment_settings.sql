alter type public.payment_provider add value if not exists 'alfabank';

create table if not exists public.payment_provider_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('alfabank')),
  is_enabled boolean not null default false,
  mode text not null default 'test',
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

alter table public.payment_provider_settings
  drop constraint if exists payment_provider_settings_mode_check;

update public.payment_provider_settings
set mode = 'production'
where provider = 'alfabank'
  and mode = 'live';

alter table public.payment_provider_settings
  add constraint payment_provider_settings_mode_check
  check (mode in ('test', 'production'));

alter table public.payment_provider_settings
  add column if not exists api_login text,
  add column if not exists api_password_secret text,
  add column if not exists test_gateway_url text,
  add column if not exists production_gateway_url text,
  add column if not exists callback_path text,
  add column if not exists success_path text,
  add column if not exists fail_path text,
  add column if not exists currency text not null default 'RUB',
  add column if not exists payment_stage text not null default 'one_step',
  add column if not exists sbp_enabled boolean not null default false,
  add column if not exists fiscalization_enabled boolean not null default false,
  add column if not exists taxation_system text,
  add column if not exists vat_rate text;

alter table public.payment_provider_settings
  drop constraint if exists payment_provider_settings_provider_alfabank_check,
  drop constraint if exists payment_provider_settings_payment_stage_check,
  drop constraint if exists payment_provider_settings_currency_check;

alter table public.payment_provider_settings
  add constraint payment_provider_settings_payment_stage_check
  check (payment_stage in ('one_step', 'two_step'));

alter table public.payment_provider_settings
  add constraint payment_provider_settings_currency_check
  check (currency = 'RUB');

alter table public.payment_provider_settings enable row level security;

drop policy if exists "payment_provider_settings_select_admins_managers" on public.payment_provider_settings;
drop policy if exists "payment_provider_settings_select_admins" on public.payment_provider_settings;
create policy "payment_provider_settings_select_admins"
on public.payment_provider_settings
for select
to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

drop policy if exists "payment_provider_settings_insert_admins" on public.payment_provider_settings;
create policy "payment_provider_settings_insert_admins"
on public.payment_provider_settings
for insert
to authenticated
with check (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

drop policy if exists "payment_provider_settings_update_admins" on public.payment_provider_settings;
create policy "payment_provider_settings_update_admins"
on public.payment_provider_settings
for update
to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

drop policy if exists "payment_provider_settings_delete_admins" on public.payment_provider_settings;
create policy "payment_provider_settings_delete_admins"
on public.payment_provider_settings
for delete
to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

insert into public.payment_provider_settings (
  organization_id,
  provider,
  is_enabled,
  mode,
  test_gateway_url,
  production_gateway_url,
  callback_path,
  success_path,
  fail_path,
  currency,
  payment_stage
)
select
  id,
  'alfabank',
  false,
  'test',
  'https://web.rbsuat.com/ab/rest/',
  'https://engine.paymentgate.ru/payment/rest/',
  '/api/payments/alfabank/callback',
  '/payments/success',
  '/payments/fail',
  'RUB',
  'one_step'
from public.organizations
on conflict (organization_id, provider) do update set
  test_gateway_url = coalesce(public.payment_provider_settings.test_gateway_url, excluded.test_gateway_url),
  production_gateway_url = coalesce(public.payment_provider_settings.production_gateway_url, excluded.production_gateway_url),
  callback_path = coalesce(public.payment_provider_settings.callback_path, excluded.callback_path),
  success_path = coalesce(public.payment_provider_settings.success_path, excluded.success_path),
  fail_path = coalesce(public.payment_provider_settings.fail_path, excluded.fail_path),
  currency = coalesce(public.payment_provider_settings.currency, excluded.currency),
  payment_stage = coalesce(public.payment_provider_settings.payment_stage, excluded.payment_stage),
  updated_at = now();
