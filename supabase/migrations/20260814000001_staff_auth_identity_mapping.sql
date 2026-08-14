-- Decouple Supabase Auth identities from canonical staff profile UUIDs.
-- Business foreign keys continue to reference profiles.id.
create table public.staff_auth_identities (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  staff_profile_id uuid not null references public.profiles(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  primary key (organization_id, staff_profile_id),
  unique (auth_user_id)
);

alter table public.staff_auth_identities enable row level security;
revoke all on table public.staff_auth_identities from public, anon, authenticated;
grant select, insert, update, delete on table public.staff_auth_identities to service_role;

create or replace function public.validate_staff_auth_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.org_memberships membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.staff_profile_id
  ) then
    raise exception using errcode = '23514', message = 'staff_profile_not_in_organization';
  end if;

  if new.auth_user_id <> new.staff_profile_id and exists (
    select 1
    from public.org_memberships membership
    where membership.user_id = new.auth_user_id
  ) then
    raise exception using errcode = '23514', message = 'auth_identity_already_canonical_staff';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_staff_auth_identity() from public, anon, authenticated;
grant execute on function public.validate_staff_auth_identity() to service_role;

create trigger validate_staff_auth_identity_before_write
before insert or update on public.staff_auth_identities
for each row execute function public.validate_staff_auth_identity();

-- Backfill only direct staff identities whose organization ownership is unambiguous.
with identity_organizations as (
  select user_id, organization_id from public.org_memberships
  union
  select user_id, organization_id from public.guardian_users
  union
  select user_id, organization_id from public.student_users
), exclusive_identities as (
  select user_id, min(organization_id::text)::uuid as organization_id
  from identity_organizations
  group by user_id
  having count(distinct organization_id) = 1
)
insert into public.staff_auth_identities (organization_id, staff_profile_id, auth_user_id)
select membership.organization_id, membership.user_id, membership.user_id
from public.org_memberships membership
join exclusive_identities identity
  on identity.user_id = membership.user_id
 and identity.organization_id = membership.organization_id
join auth.users auth_user on auth_user.id = membership.user_id
where membership.is_active = true
on conflict do nothing;

create or replace function public.current_staff_profile_id(target_org_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select identity.staff_profile_id
      from public.staff_auth_identities identity
      join public.org_memberships membership
        on membership.organization_id = identity.organization_id
       and membership.user_id = identity.staff_profile_id
       and membership.is_active = true
      where identity.organization_id = target_org_id
        and identity.auth_user_id = auth.uid()
      limit 1
    ),
    (
      select membership.user_id
      from public.org_memberships membership
      where membership.organization_id = target_org_id
        and membership.user_id = auth.uid()
        and membership.is_active = true
      limit 1
    )
  );
$$;

create or replace function public.current_staff_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select identity.staff_profile_id
      from public.staff_auth_identities identity
      join public.org_memberships membership
        on membership.organization_id = identity.organization_id
       and membership.user_id = identity.staff_profile_id
       and membership.is_active = true
      where identity.auth_user_id = auth.uid()
      limit 1
    ),
    (
      select membership.user_id
      from public.org_memberships membership
      where membership.user_id = auth.uid()
        and membership.is_active = true
      limit 1
    )
  );
$$;

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_staff_profile_id(target_org_id) is not null;
$$;

create or replace function public.has_org_role(
  target_org_id uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_memberships membership
    where membership.organization_id = target_org_id
      and membership.user_id = public.current_staff_profile_id(target_org_id)
      and membership.is_active = true
      and membership.role = any(allowed_roles)
  );
$$;

create or replace function public.is_teacher_of_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups target_group
    where target_group.id = p_group_id
      and target_group.teacher_id = public.current_staff_profile_id(target_group.organization_id)
  );
$$;

revoke all on function public.current_staff_profile_id(uuid) from public, anon, authenticated;
revoke all on function public.current_staff_profile_id() from public, anon, authenticated;
revoke all on function public.is_org_member(uuid) from public, anon, authenticated;
revoke all on function public.has_org_role(uuid, public.app_role[]) from public, anon, authenticated;
revoke all on function public.is_teacher_of_group(uuid) from public, anon, authenticated;
grant execute on function public.current_staff_profile_id(uuid) to authenticated, service_role;
grant execute on function public.current_staff_profile_id() to authenticated, service_role;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.has_org_role(uuid, public.app_role[]) to authenticated, service_role;
grant execute on function public.is_teacher_of_group(uuid) to authenticated, service_role;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = coalesce(public.current_staff_profile_id(), auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = coalesce(public.current_staff_profile_id(), auth.uid()))
with check (id = coalesce(public.current_staff_profile_id(), auth.uid()));

drop policy if exists "groups_select_teacher_own" on public.groups;
create policy "groups_select_teacher_own" on public.groups
for select to authenticated
using (teacher_id = public.current_staff_profile_id(organization_id));

drop policy if exists "attendance_write_teacher" on public.attendance;
create policy "attendance_write_teacher" on public.attendance
for insert to authenticated
with check (
  exists (
    select 1
    from public.enrollments enrollment
    join public.groups target_group on target_group.id = enrollment.group_id
    where enrollment.student_id = attendance.student_id
      and target_group.teacher_id = public.current_staff_profile_id(target_group.organization_id)
  )
);

drop policy if exists "attendance_update_teacher" on public.attendance;
create policy "attendance_update_teacher" on public.attendance
for update to authenticated
using (
  exists (
    select 1
    from public.enrollments enrollment
    join public.groups target_group on target_group.id = enrollment.group_id
    where enrollment.student_id = attendance.student_id
      and target_group.teacher_id = public.current_staff_profile_id(target_group.organization_id)
  )
);

drop policy if exists "makeup_assignments_select_staff" on public.makeup_assignments;
create policy "makeup_assignments_select_staff" on public.makeup_assignments
for select to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[])
  or exists (
    select 1
    from public.lesson_sessions session
    where session.id = makeup_assignments.target_session_id
      and session.organization_id = makeup_assignments.organization_id
      and session.teacher_id = public.current_staff_profile_id(session.organization_id)
  )
);

drop policy if exists teacher_payroll_own_read on public.teacher_payroll_entries;
create policy teacher_payroll_own_read on public.teacher_payroll_entries
for select to authenticated
using (teacher_id = public.current_staff_profile_id(organization_id));
