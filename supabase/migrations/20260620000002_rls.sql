-- Enable Row Level Security (RLS) on all tables

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.org_memberships enable row level security;
alter table public.branches enable row level security;
alter table public.rooms enable row level security;
alter table public.courses enable row level security;
alter table public.groups enable row level security;
alter table public.group_schedule_rules enable row level security;
alter table public.students enable row level security;
alter table public.guardians enable row level security;
alter table public.student_guardians enable row level security;
alter table public.enrollments enable row level security;
alter table public.leads enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.attendance enable row level security;
alter table public.audit_log enable row level security;

-- Helper functions for RLS

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
      and m.is_active = true
  );
$$;

create or replace function public.has_org_role(
  target_org_id uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role = any(allowed_roles)
  );
$$;

-- Policies: public.profiles

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Policies: public.organizations

create policy "organizations_select_members"
on public.organizations
for select
to authenticated
using (public.is_org_member(id));

create policy "organizations_write_admins"
on public.organizations
for all
to authenticated
using (public.has_org_role(id, array['owner','admin']::public.app_role[]))
with check (public.has_org_role(id, array['owner','admin']::public.app_role[]));

-- Policies: public.org_memberships

create policy "org_memberships_select_members"
on public.org_memberships
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "org_memberships_write_admins"
on public.org_memberships
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

-- Policies: public.branches

create policy "branches_select_members"
on public.branches
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "branches_write_admins"
on public.branches
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.rooms

create policy "rooms_select_members"
on public.rooms
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "rooms_write_admins"
on public.rooms
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.courses

create policy "courses_select_members"
on public.courses
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "courses_write_admins"
on public.courses
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.groups

create policy "groups_select_members"
on public.groups
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "groups_write_admins"
on public.groups
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.group_schedule_rules

create policy "group_schedule_rules_select_members"
on public.group_schedule_rules
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "group_schedule_rules_write_admins"
on public.group_schedule_rules
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.students

create policy "students_select_members"
on public.students
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "students_write_admins"
on public.students
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.guardians

create policy "guardians_select_members"
on public.guardians
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "guardians_write_admins"
on public.guardians
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.student_guardians

create policy "student_guardians_select_members"
on public.student_guardians
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "student_guardians_write_admins"
on public.student_guardians
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.enrollments

create policy "enrollments_select_members"
on public.enrollments
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "enrollments_write_admins"
on public.enrollments
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.leads

create policy "leads_select_members"
on public.leads
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "leads_write_admins"
on public.leads
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.invoices

create policy "invoices_select_members"
on public.invoices
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "invoices_write_admins"
on public.invoices
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.payments

create policy "payments_select_members"
on public.payments
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "payments_write_admins"
on public.payments
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.attendance

create policy "attendance_select_members"
on public.attendance
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "attendance_write_admins"
on public.attendance
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- Policies: public.payment_transactions (read only by owner/admin)

create policy "payment_transactions_select_admins"
on public.payment_transactions
for select
to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

-- Policies: public.audit_log (read only by owner/admin)

create policy "audit_log_select_admins"
on public.audit_log
for select
to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));
