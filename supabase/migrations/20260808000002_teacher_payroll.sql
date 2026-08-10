create table public.teacher_pay_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  effective_from date not null,
  rate_per_attendee numeric(12,2) not null check (rate_per_attendee >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, teacher_id, effective_from)
);

create table public.teacher_payroll_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lesson_session_id uuid not null references public.lesson_sessions(id) on delete restrict,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  attendee_count integer not null check (attendee_count >= 0),
  rate_snapshot numeric(12,2) not null check (rate_snapshot >= 0),
  amount numeric(14,2) not null check (amount >= 0),
  status text not null default 'accrued' check (status in ('accrued', 'approved', 'paid')),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz,
  paid_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, lesson_session_id, teacher_id)
);
create index teacher_pay_rules_effective_idx on public.teacher_pay_rules (organization_id, teacher_id, effective_from desc);
create index teacher_payroll_teacher_idx on public.teacher_payroll_entries (organization_id, teacher_id, created_at desc);

create or replace function public.set_teacher_pay_rate(p_organization_id uuid,p_teacher_id uuid,p_effective_from date,p_rate numeric,p_actor_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare saved_id uuid;
begin
  if p_rate < 0 then raise exception 'teacher_rate_negative'; end if;
  if not exists(select 1 from public.org_memberships where organization_id=p_organization_id and user_id=p_teacher_id and role='teacher' and is_active=true) then raise exception 'teacher_not_found'; end if;
  insert into public.teacher_pay_rules(organization_id,teacher_id,effective_from,rate_per_attendee,created_by)
  values(p_organization_id,p_teacher_id,p_effective_from,p_rate,p_actor_id)
  on conflict(organization_id,teacher_id,effective_from) do update set rate_per_attendee=excluded.rate_per_attendee,created_by=excluded.created_by
  returning id into saved_id;
  update public.teacher_payroll_entries payroll
    set rate_snapshot=p_rate,amount=payroll.attendee_count*p_rate
    from public.lesson_sessions session
    where payroll.organization_id=p_organization_id and payroll.teacher_id=p_teacher_id and payroll.status='accrued'
      and payroll.lesson_session_id=session.id and session.lesson_date>=p_effective_from
      and exists(select 1 from public.finance_warnings warning where warning.organization_id=p_organization_id and warning.lesson_session_id=payroll.lesson_session_id and warning.warning_type='missing_teacher_rate' and warning.resolved_at is null);
  update public.finance_warnings warning set resolved_at=now()
    where warning.organization_id=p_organization_id and warning.teacher_id=p_teacher_id and warning.warning_type='missing_teacher_rate' and warning.resolved_at is null
      and exists(
        select 1 from public.teacher_payroll_entries payroll join public.lesson_sessions session on session.id=payroll.lesson_session_id
        where payroll.organization_id=p_organization_id and payroll.lesson_session_id=warning.lesson_session_id and payroll.teacher_id=p_teacher_id
          and payroll.status='accrued' and payroll.rate_snapshot=p_rate and session.lesson_date>=p_effective_from
      );
  return saved_id;
end; $$;
revoke all on function public.set_teacher_pay_rate(uuid,uuid,date,numeric,uuid) from public,anon,authenticated;
grant execute on function public.set_teacher_pay_rate(uuid,uuid,date,numeric,uuid) to service_role;

create or replace function public.transition_teacher_payroll(p_organization_id uuid,p_entry_id uuid,p_status text,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare target public.teacher_payroll_entries%rowtype;
begin
  select * into target from public.teacher_payroll_entries where id=p_entry_id and organization_id=p_organization_id for update;
  if not found then raise exception 'payroll_entry_not_found'; end if;
  if target.status='accrued' and p_status='approved' and exists(
    select 1 from public.finance_warnings warning where warning.organization_id=p_organization_id
      and warning.lesson_session_id=target.lesson_session_id and warning.warning_type='missing_teacher_rate' and warning.resolved_at is null
  ) then raise exception 'teacher_rate_missing'; end if;
  if p_status='approved' and target.status='accrued' then
    update public.teacher_payroll_entries set status='approved',approved_at=now(),approved_by=p_actor_id where id=target.id;
  elsif p_status='paid' and target.status='approved' then
    update public.teacher_payroll_entries set status='paid',paid_at=now(),paid_by=p_actor_id where id=target.id;
  elsif p_status=target.status then null;
  else raise exception 'invalid_payroll_transition'; end if;
  return jsonb_build_object('id',target.id,'status',p_status);
end; $$;
revoke all on function public.transition_teacher_payroll(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.transition_teacher_payroll(uuid,uuid,text,uuid) to service_role;

alter table public.teacher_pay_rules enable row level security;
alter table public.teacher_payroll_entries enable row level security;
create policy teacher_pay_rules_finance_read on public.teacher_pay_rules for select to authenticated using(public.has_org_role(organization_id,array['owner','admin','accountant','manager']::public.app_role[]));
create policy teacher_payroll_finance_read on public.teacher_payroll_entries for select to authenticated using(public.has_org_role(organization_id,array['owner','admin','accountant','manager']::public.app_role[]));
create policy teacher_payroll_own_read on public.teacher_payroll_entries for select to authenticated using(teacher_id=auth.uid());
