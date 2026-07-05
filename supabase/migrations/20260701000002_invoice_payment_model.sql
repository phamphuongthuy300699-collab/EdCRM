-- Full invoice/payment model for CRM and parent portal.
-- Existing invoices/payments tables are extended in place: no duplicate payment entities.

alter type public.payment_provider add value if not exists 'manual';
alter type public.payment_provider add value if not exists 'alfabank';

alter type public.payment_status add value if not exists 'redirected';
alter type public.payment_status add value if not exists 'authorized';
alter type public.payment_status add value if not exists 'paid';
alter type public.payment_status add value if not exists 'unknown';

create sequence if not exists public.invoice_number_seq;

alter table public.invoices
  add column if not exists number text,
  add column if not exists description text,
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.invoices
  alter column student_id drop not null;

update public.invoices
set
  number = coalesce(number, 'INV-' || left(id::text, 8)),
  description = coalesce(description, title)
where number is null
   or description is null;

alter table public.invoices
  alter column number set not null;

alter table public.payments
  add column if not exists provider_order_id text,
  add column if not exists payment_url text,
  add column if not exists external_status text,
  add column if not exists failed_at timestamptz,
  add column if not exists raw_request jsonb,
  add column if not exists raw_response jsonb;

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  provider text not null check (provider in ('manual', 'alfabank')),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_invoices_org_number
  on public.invoices (organization_id, number);

create index if not exists idx_invoices_organization_id
  on public.invoices (organization_id);

create index if not exists idx_invoices_student_id
  on public.invoices (student_id);

create index if not exists idx_invoices_guardian_id
  on public.invoices (guardian_id);

create index if not exists idx_invoices_status
  on public.invoices (status);

create index if not exists idx_payments_invoice_id
  on public.payments (invoice_id);

create index if not exists idx_payments_provider_order_id
  on public.payments (provider_order_id);

create index if not exists idx_payments_status
  on public.payments (status);

create index if not exists idx_payment_events_payment_id
  on public.payment_events (payment_id);

create index if not exists idx_payment_events_invoice_id
  on public.payment_events (invoice_id);

alter table public.payment_events enable row level security;

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.number is null or btrim(new.number) = '' then
    new.number :=
      'INV-' ||
      to_char(coalesce(new.issued_at, now()), 'YYYY') ||
      '-' ||
      lpad(nextval('public.invoice_number_seq')::text, 6, '0');
  end if;

  if new.description is null or btrim(new.description) = '' then
    new.description := new.title;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_assign_invoice_number on public.invoices;
create trigger trg_assign_invoice_number
before insert or update on public.invoices
for each row
execute function public.assign_invoice_number();

create or replace function public.calculate_invoice_status(p_invoice_id uuid)
returns public.invoice_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_paid_amount numeric(12,2);
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if not found then
    return null;
  end if;

  if v_invoice.status = 'cancelled' then
    return 'cancelled';
  end if;

  select coalesce(sum(amount), 0)
  into v_paid_amount
  from public.payments
  where invoice_id = p_invoice_id
    and status::text in ('paid', 'succeeded');

  if v_paid_amount >= v_invoice.amount and v_invoice.amount > 0 then
    return 'paid';
  end if;

  if v_paid_amount > 0 then
    return 'partially_paid';
  end if;

  if v_invoice.due_date is not null
     and v_invoice.due_date < current_date
     and v_invoice.status <> 'draft' then
    return 'overdue';
  end if;

  if v_invoice.status = 'draft' then
    return 'draft';
  end if;

  return 'issued';
end;
$$;

create or replace function public.sync_invoice_status_from_payments(p_invoice_id uuid)
returns public.invoice_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.invoice_status;
begin
  if p_invoice_id is null then
    return null;
  end if;

  v_status := public.calculate_invoice_status(p_invoice_id);

  update public.invoices
  set
    status = v_status,
    paid_at = case when v_status = 'paid' then coalesce(paid_at, now()) else null end,
    updated_at = now()
  where id = p_invoice_id
    and status <> 'cancelled';

  return v_status;
end;
$$;

create or replace function public.sync_invoice_status_from_payment_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_invoice_status_from_payments(old.invoice_id);
    return old;
  end if;

  perform public.sync_invoice_status_from_payments(new.invoice_id);

  if tg_op = 'UPDATE' and old.invoice_id is distinct from new.invoice_id then
    perform public.sync_invoice_status_from_payments(old.invoice_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_invoice_status_from_payments on public.payments;
create trigger trg_sync_invoice_status_from_payments
after insert or update or delete on public.payments
for each row
execute function public.sync_invoice_status_from_payment_trigger();

-- Tighten finance RLS: org finance roles and managers can work with invoices/payments;
-- teachers are deliberately excluded. Guardians only see their own children's records.
drop policy if exists "invoices_select_members" on public.invoices;
drop policy if exists "invoices_write_admins" on public.invoices;
drop policy if exists "invoices_select_as_guardian" on public.invoices;

create policy "invoices_select_finance_members"
on public.invoices
for select
to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','accountant','manager']::public.app_role[])
);

create policy "invoices_select_as_guardian"
on public.invoices
for select
to authenticated
using (
  (student_id is not null and public.is_guardian_of_student(student_id))
  or exists (
    select 1
    from public.guardian_users gu
    where gu.user_id = auth.uid()
      and gu.organization_id = invoices.organization_id
      and gu.guardian_id = invoices.guardian_id
  )
);

create policy "invoices_write_finance_members"
on public.invoices
for all
to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','accountant','manager']::public.app_role[])
)
with check (
  public.has_org_role(organization_id, array['owner','admin','accountant','manager']::public.app_role[])
);

drop policy if exists "payments_select_members" on public.payments;
drop policy if exists "payments_write_admins" on public.payments;
drop policy if exists "payments_select_as_guardian" on public.payments;

create policy "payments_select_finance_members"
on public.payments
for select
to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','accountant','manager']::public.app_role[])
);

create policy "payments_select_as_guardian"
on public.payments
for select
to authenticated
using (
  (student_id is not null and public.is_guardian_of_student(student_id))
  or exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and (
        (i.student_id is not null and public.is_guardian_of_student(i.student_id))
        or exists (
          select 1
          from public.guardian_users gu
          where gu.user_id = auth.uid()
            and gu.organization_id = i.organization_id
            and gu.guardian_id = i.guardian_id
        )
      )
  )
);

create policy "payments_write_finance_members"
on public.payments
for all
to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','accountant','manager']::public.app_role[])
)
with check (
  public.has_org_role(organization_id, array['owner','admin','accountant','manager']::public.app_role[])
);

drop policy if exists "payment_events_select_finance_members" on public.payment_events;
create policy "payment_events_select_finance_members"
on public.payment_events
for select
to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','accountant']::public.app_role[])
);

drop policy if exists "payment_events_write_finance_members" on public.payment_events;
create policy "payment_events_write_finance_members"
on public.payment_events
for all
to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','accountant','manager']::public.app_role[])
)
with check (
  public.has_org_role(organization_id, array['owner','admin','accountant','manager']::public.app_role[])
);
