-- Guardian-owned accounts and an append-only financial journal.
-- Deliberately no backfill: historical paid payments are reconciled only by an explicit RPC.

alter table public.groups
  add column if not exists billing_enabled boolean not null default false,
  add column if not exists lesson_price numeric(12,2),
  add column if not exists charge_absent_excused boolean not null default false,
  add column if not exists charge_absent_unexcused boolean not null default true;

alter table public.groups drop constraint if exists groups_lesson_price_nonnegative;
alter table public.groups add constraint groups_lesson_price_positive check (lesson_price is null or lesson_price > 0);

create table public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete restrict,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, guardian_id)
);

create table public.billing_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.billing_accounts(id) on delete restrict,
  guardian_id uuid not null references public.guardians(id) on delete restrict,
  student_id uuid references public.students(id) on delete set null,
  entry_type text not null check (entry_type in ('payment','lesson_debit','manual_credit','manual_debit','refund','reversal')),
  amount numeric(14,2) not null check (amount <> 0),
  reason text,
  payment_id uuid references public.payments(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete set null,
  lesson_session_id uuid references public.lesson_sessions(id) on delete restrict,
  attendance_id uuid references public.attendance(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index billing_ledger_payment_unique
  on public.billing_ledger_entries (organization_id, payment_id)
  where payment_id is not null and entry_type = 'payment';
create unique index billing_ledger_refund_unique
  on public.billing_ledger_entries (organization_id, payment_id)
  where payment_id is not null and entry_type = 'refund';
create unique index billing_ledger_lesson_student_unique
  on public.billing_ledger_entries (organization_id, lesson_session_id, student_id)
  where lesson_session_id is not null and student_id is not null and entry_type = 'lesson_debit';
create index billing_ledger_account_created_idx on public.billing_ledger_entries (account_id, created_at desc);
create index billing_accounts_guardian_idx on public.billing_accounts (guardian_id);

create table public.finance_warnings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  warning_key text not null,
  warning_type text not null check (warning_type in ('missing_billing_contact','missing_lesson_price','missing_teacher_rate')),
  lesson_session_id uuid references public.lesson_sessions(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete cascade,
  details jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, warning_key)
);
create index finance_warnings_open_idx on public.finance_warnings (organization_id, warning_type) where resolved_at is null;

create or replace function public.prevent_billing_ledger_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'billing_ledger_is_immutable';
end;
$$;
create trigger billing_ledger_no_update before update or delete on public.billing_ledger_entries
for each row execute function public.prevent_billing_ledger_mutation();

create or replace function public.apply_billing_adjustment(
  p_organization_id uuid, p_guardian_id uuid, p_amount numeric, p_reason text, p_actor_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare target_account public.billing_accounts%rowtype; saved_entry uuid;
begin
  if p_amount = 0 then raise exception 'adjustment_amount_zero'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'adjustment_reason_required'; end if;
  if not exists (select 1 from public.guardians where id = p_guardian_id and organization_id = p_organization_id) then raise exception 'guardian_not_found'; end if;
  insert into public.billing_accounts (organization_id, guardian_id) values (p_organization_id, p_guardian_id)
  on conflict (organization_id, guardian_id) do nothing;
  select * into target_account from public.billing_accounts
    where organization_id = p_organization_id and guardian_id = p_guardian_id for update;
  insert into public.billing_ledger_entries (organization_id, account_id, guardian_id, entry_type, amount, reason, created_by)
  values (p_organization_id, target_account.id, p_guardian_id,
    case when p_amount > 0 then 'manual_credit' else 'manual_debit' end, p_amount, trim(p_reason), p_actor_id)
  returning id into saved_entry;
  update public.billing_accounts set balance = balance + p_amount, updated_at = now() where id = target_account.id;
  return jsonb_build_object('entryId', saved_entry, 'balance', target_account.balance + p_amount);
end;
$$;
revoke all on function public.apply_billing_adjustment(uuid, uuid, numeric, text, uuid) from public, anon, authenticated;
grant execute on function public.apply_billing_adjustment(uuid, uuid, numeric, text, uuid) to service_role;

-- Keep group settings and schedule rules on the existing atomic save boundary.
create or replace function public.save_group_with_schedule(
  p_organization_id uuid, p_group_id uuid, p_group jsonb, p_rules jsonb, p_rebuild_future boolean default true
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  target_group public.groups%rowtype; saved_group_id uuid; schedule_result jsonb;
  group_title text; group_course_id uuid; group_branch_id uuid; group_room_id uuid; group_teacher_id uuid;
  group_status_value public.group_status;
begin
  if jsonb_typeof(coalesce(p_group, '{}'::jsonb)) <> 'object' then raise exception 'group_payload_invalid'; end if;
  if p_group_id is not null then
    select * into target_group from public.groups where id = p_group_id and organization_id = p_organization_id for update;
    if not found then raise exception 'group_not_found'; end if;
  end if;
  group_title := coalesce(nullif(trim(p_group->>'title'), ''), target_group.title);
  group_course_id := coalesce(nullif(p_group->>'course_id', '')::uuid, target_group.course_id);
  group_branch_id := case when p_group ? 'branch_id' then nullif(p_group->>'branch_id', '')::uuid else target_group.branch_id end;
  group_room_id := case when p_group ? 'room_id' then nullif(p_group->>'room_id', '')::uuid else target_group.room_id end;
  group_teacher_id := case when p_group ? 'teacher_id' then nullif(p_group->>'teacher_id', '')::uuid else target_group.teacher_id end;
  group_status_value := coalesce(nullif(p_group->>'status', '')::public.group_status, target_group.status, 'draft'::public.group_status);
  if group_title is null or group_course_id is null then raise exception 'group_required_fields_missing'; end if;
  if not exists (select 1 from public.courses where id = group_course_id and organization_id = p_organization_id) then raise exception 'course_not_found'; end if;
  if group_branch_id is not null and not exists (select 1 from public.branches where id = group_branch_id and organization_id = p_organization_id) then raise exception 'branch_not_found'; end if;
  if group_room_id is not null and not exists (select 1 from public.rooms where id = group_room_id and organization_id = p_organization_id and (group_branch_id is null or branch_id = group_branch_id)) then raise exception 'room_not_found_or_wrong_branch'; end if;
  if group_teacher_id is not null and not exists (select 1 from public.org_memberships where organization_id = p_organization_id and user_id = group_teacher_id and role = 'teacher' and is_active = true) then raise exception 'teacher_not_found'; end if;
  if p_group_id is null then
    insert into public.groups (organization_id,title,course_id,branch_id,room_id,teacher_id,status,age_from,age_to,capacity,starts_on,ends_on,price_monthly,show_on_site,sort_order,billing_enabled,lesson_price,charge_absent_excused,charge_absent_unexcused)
    values (p_organization_id,group_title,group_course_id,group_branch_id,group_room_id,group_teacher_id,group_status_value,
      nullif(p_group->>'age_from','')::int,nullif(p_group->>'age_to','')::int,coalesce(nullif(p_group->>'capacity','')::int,8),nullif(p_group->>'starts_on','')::date,nullif(p_group->>'ends_on','')::date,nullif(p_group->>'price_monthly','')::numeric,coalesce((p_group->>'show_on_site')::boolean,true),coalesce(nullif(p_group->>'sort_order','')::int,100),coalesce((p_group->>'billing_enabled')::boolean,false),nullif(p_group->>'lesson_price','')::numeric,coalesce((p_group->>'charge_absent_excused')::boolean,false),coalesce((p_group->>'charge_absent_unexcused')::boolean,true))
    returning id into saved_group_id;
  else
    update public.groups set title=group_title,course_id=group_course_id,branch_id=group_branch_id,room_id=group_room_id,teacher_id=group_teacher_id,status=group_status_value,
      age_from=case when p_group?'age_from' then nullif(p_group->>'age_from','')::int else target_group.age_from end,
      age_to=case when p_group?'age_to' then nullif(p_group->>'age_to','')::int else target_group.age_to end,
      capacity=case when p_group?'capacity' then coalesce(nullif(p_group->>'capacity','')::int,target_group.capacity) else target_group.capacity end,
      starts_on=case when p_group?'starts_on' then nullif(p_group->>'starts_on','')::date else target_group.starts_on end,
      ends_on=case when p_group?'ends_on' then nullif(p_group->>'ends_on','')::date else target_group.ends_on end,
      price_monthly=case when p_group?'price_monthly' then nullif(p_group->>'price_monthly','')::numeric else target_group.price_monthly end,
      show_on_site=case when p_group?'show_on_site' then (p_group->>'show_on_site')::boolean else target_group.show_on_site end,
      sort_order=case when p_group?'sort_order' then coalesce(nullif(p_group->>'sort_order','')::int,target_group.sort_order) else target_group.sort_order end,
      billing_enabled=case when p_group?'billing_enabled' then (p_group->>'billing_enabled')::boolean else target_group.billing_enabled end,
      lesson_price=case when p_group?'lesson_price' then nullif(p_group->>'lesson_price','')::numeric else target_group.lesson_price end,
      charge_absent_excused=case when p_group?'charge_absent_excused' then (p_group->>'charge_absent_excused')::boolean else target_group.charge_absent_excused end,
      charge_absent_unexcused=case when p_group?'charge_absent_unexcused' then (p_group->>'charge_absent_unexcused')::boolean else target_group.charge_absent_unexcused end,
      updated_at=now() where id=target_group.id;
    saved_group_id := target_group.id;
  end if;
  schedule_result := public.replace_group_schedule(p_organization_id,saved_group_id,p_rules,p_rebuild_future);
  return jsonb_build_object('group_id',saved_group_id,'schedule',schedule_result);
end;
$$;
revoke all on function public.save_group_with_schedule(uuid, uuid, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.save_group_with_schedule(uuid, uuid, jsonb, jsonb, boolean) to service_role;

alter table public.billing_accounts enable row level security;
alter table public.billing_ledger_entries enable row level security;
alter table public.finance_warnings enable row level security;
create policy billing_accounts_staff_read on public.billing_accounts for select to authenticated using (public.has_org_role(organization_id,array['owner','admin','accountant','manager']::public.app_role[]));
create policy billing_accounts_guardian_read on public.billing_accounts for select to authenticated using (exists(select 1 from public.guardian_users gu where gu.organization_id=billing_accounts.organization_id and gu.guardian_id=billing_accounts.guardian_id and gu.user_id=auth.uid()));
create policy billing_ledger_staff_read on public.billing_ledger_entries for select to authenticated using (public.has_org_role(organization_id,array['owner','admin','accountant','manager']::public.app_role[]));
create policy billing_ledger_guardian_read on public.billing_ledger_entries for select to authenticated using (exists(select 1 from public.guardian_users gu where gu.organization_id=billing_ledger_entries.organization_id and gu.guardian_id=billing_ledger_entries.guardian_id and gu.user_id=auth.uid()));
create policy finance_warnings_staff_read on public.finance_warnings for select to authenticated using (public.has_org_role(organization_id,array['owner','admin','accountant','manager']::public.app_role[]));
