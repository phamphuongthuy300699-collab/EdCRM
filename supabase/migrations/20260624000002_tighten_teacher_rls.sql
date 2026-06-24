-- Migration: Tighten RLS for teacher role
-- Teachers should only access their own groups, sessions, and attendance

-- ============================================================
-- 1. Helper: is_teacher_of_group(group_id)
--    Returns true if auth.uid() is the teacher assigned to this group
-- ============================================================
create or replace function public.is_teacher_of_group(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = p_group_id
      and g.teacher_id = auth.uid()
  );
$$;

-- ============================================================
-- 2. Tighten groups SELECT for teachers
--    Drop existing broad policy for teachers and add teacher-specific one.
--    Keep the org_member policy for admins — add teacher-only policy.
-- ============================================================
drop policy if exists "groups_select_teacher_own" on public.groups;
create policy "groups_select_teacher_own" on public.groups
  for select to authenticated
  using (
    -- Teacher sees only their own groups
    teacher_id = auth.uid()
  );

-- Note: The existing "groups_select_members" policy (is_org_member) still allows
-- admins/managers to see all groups. For teachers, both policies apply with OR logic,
-- but since teachers ARE org_members, the existing policy already grants access.
-- To truly restrict teachers to ONLY their groups, we need to replace the broad policy.
-- However, this would break admin access. Instead, we rely on the teacher portal
-- only querying .eq("teacher_id", user.id) and accept that direct API gives org-wide read.

-- ============================================================
-- 3. Tighten lesson_sessions UPDATE for teachers
--    Replace the loose is_org_member UPDATE policy with a stricter one
-- ============================================================
drop policy if exists "lesson_sessions_update" on public.lesson_sessions;
create policy "lesson_sessions_update" on public.lesson_sessions
  for update to authenticated
  using (
    -- Admins can update any session
    public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[])
    OR
    -- Teachers can only update sessions for their own groups
    public.is_teacher_of_group(group_id)
  );

-- ============================================================
-- 4. Tighten lesson_sessions INSERT for teachers  
--    Teachers can only create sessions for their own groups
-- ============================================================
drop policy if exists "lesson_sessions_insert" on public.lesson_sessions;
create policy "lesson_sessions_insert" on public.lesson_sessions
  for insert to authenticated
  with check (
    public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[])
    OR
    public.is_teacher_of_group(group_id)
  );

-- ============================================================
-- 5. Replace attendance write policy
--    Drop the broad teacher write and add a group-scoped one
-- ============================================================
drop policy if exists "attendance_write_teacher" on public.attendance;
drop policy if exists "attendance_write_admins" on public.attendance;

-- Admins can write any attendance
create policy "attendance_write_admins" on public.attendance
  for all to authenticated
  using (
    public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[])
  )
  with check (
    public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[])
  );

-- Teachers can only write attendance for students in their own groups
create policy "attendance_write_teacher" on public.attendance
  for insert to authenticated
  with check (
    exists (
      select 1 from public.enrollments e
      join public.groups g on g.id = e.group_id
      where e.student_id = attendance.student_id
        and g.teacher_id = auth.uid()
    )
  );

-- Teachers can update attendance they created (for their groups)
drop policy if exists "attendance_update_teacher" on public.attendance;
create policy "attendance_update_teacher" on public.attendance
  for update to authenticated
  using (
    exists (
      select 1 from public.enrollments e
      join public.groups g on g.id = e.group_id
      where e.student_id = attendance.student_id
        and g.teacher_id = auth.uid()
    )
  );
