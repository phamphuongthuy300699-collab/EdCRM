-- Migration: Fix RLS policies for parent, student, and teacher portals
-- Problem: Parents and students are NOT org_members (they use guardian_users / student_users),
-- so all policies using is_org_member() block their access to essential tables.
-- Teachers also cannot write attendance (policy only allows owner/admin/manager).

-- ============================================================
-- 1. Helper: is_guardian_of_student(student_id)
--    Returns true if auth.uid() is linked as a guardian of the given student
-- ============================================================
create or replace function public.is_guardian_of_student(p_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guardian_users gu
    join public.student_guardians sg on sg.guardian_id = gu.guardian_id
    where gu.user_id = auth.uid()
      and sg.student_id = p_student_id
  );
$$;

-- ============================================================
-- 2. Helper: is_student_user(student_id)
--    Returns true if auth.uid() is linked as the student
-- ============================================================
create or replace function public.is_student_user(p_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.student_users su
    where su.user_id = auth.uid()
      and su.student_id = p_student_id
  );
$$;

-- ============================================================
-- 3. Fix: students table — parents and students can read their own records
-- ============================================================
drop policy if exists "students_select_as_guardian" on public.students;
create policy "students_select_as_guardian" on public.students
  for select to authenticated
  using (public.is_guardian_of_student(id));

drop policy if exists "students_select_as_student" on public.students;
create policy "students_select_as_student" on public.students
  for select to authenticated
  using (public.is_student_user(id));

-- ============================================================
-- 4. Fix: student_guardians — parents can read their own children's links
-- ============================================================
drop policy if exists "student_guardians_select_as_guardian" on public.student_guardians;
create policy "student_guardians_select_as_guardian" on public.student_guardians
  for select to authenticated
  using (
    exists (
      select 1 from public.guardian_users gu
      where gu.user_id = auth.uid()
        and gu.guardian_id = student_guardians.guardian_id
    )
  );

-- ============================================================
-- 5. Fix: guardians — parents can read their own guardian record
-- ============================================================
drop policy if exists "guardians_select_own" on public.guardians;
create policy "guardians_select_own" on public.guardians
  for select to authenticated
  using (
    exists (
      select 1 from public.guardian_users gu
      where gu.user_id = auth.uid()
        and gu.guardian_id = guardians.id
    )
  );

-- ============================================================
-- 6. Fix: enrollments — parents and students can read relevant enrollments
-- ============================================================
drop policy if exists "enrollments_select_as_guardian" on public.enrollments;
create policy "enrollments_select_as_guardian" on public.enrollments
  for select to authenticated
  using (public.is_guardian_of_student(student_id));

drop policy if exists "enrollments_select_as_student" on public.enrollments;
create policy "enrollments_select_as_student" on public.enrollments
  for select to authenticated
  using (public.is_student_user(student_id));

-- ============================================================
-- 7. Fix: groups — students can read their enrolled group
-- ============================================================
drop policy if exists "groups_select_as_student" on public.groups;
create policy "groups_select_as_student" on public.groups
  for select to authenticated
  using (
    exists (
      select 1 from public.student_users su
      join public.enrollments e on e.student_id = su.student_id
      where su.user_id = auth.uid()
        and e.group_id = groups.id
    )
  );

-- Parents can read their children's groups
drop policy if exists "groups_select_as_guardian" on public.groups;
create policy "groups_select_as_guardian" on public.groups
  for select to authenticated
  using (
    exists (
      select 1 from public.guardian_users gu
      join public.student_guardians sg on sg.guardian_id = gu.guardian_id
      join public.enrollments e on e.student_id = sg.student_id
      where gu.user_id = auth.uid()
        and e.group_id = groups.id
    )
  );

-- ============================================================
-- 8. Fix: courses — students and parents can read relevant courses
-- ============================================================
drop policy if exists "courses_select_as_student" on public.courses;
create policy "courses_select_as_student" on public.courses
  for select to authenticated
  using (
    exists (
      select 1 from public.student_users su
      join public.enrollments e on e.student_id = su.student_id
      join public.groups g on g.id = e.group_id
      where su.user_id = auth.uid()
        and g.course_id = courses.id
    )
  );

-- ============================================================
-- 9. Fix: invoices — parents can read their children's invoices
-- ============================================================
drop policy if exists "invoices_select_as_guardian" on public.invoices;
create policy "invoices_select_as_guardian" on public.invoices
  for select to authenticated
  using (public.is_guardian_of_student(student_id));

-- ============================================================
-- 10. Fix: payments — parents can read their children's payments
-- ============================================================
drop policy if exists "payments_select_as_guardian" on public.payments;
create policy "payments_select_as_guardian" on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.invoices i
      join public.guardian_users gu on true
      join public.student_guardians sg on sg.guardian_id = gu.guardian_id
      where gu.user_id = auth.uid()
        and sg.student_id = i.student_id
        and i.id = payments.invoice_id
    )
  );

-- ============================================================
-- 11. Fix: attendance — parents and students can read relevant records
-- ============================================================
drop policy if exists "attendance_select_as_guardian" on public.attendance;
create policy "attendance_select_as_guardian" on public.attendance
  for select to authenticated
  using (public.is_guardian_of_student(student_id));

drop policy if exists "attendance_select_as_student" on public.attendance;
create policy "attendance_select_as_student" on public.attendance
  for select to authenticated
  using (public.is_student_user(student_id));

-- ============================================================
-- 12. CRITICAL FIX: attendance — teachers can write attendance records
-- ============================================================
drop policy if exists "attendance_write_teacher" on public.attendance;
create policy "attendance_write_teacher" on public.attendance
  for all to authenticated
  using (
    public.has_org_role(organization_id, array['owner','admin','manager','teacher']::public.app_role[])
  )
  with check (
    public.has_org_role(organization_id, array['owner','admin','manager','teacher']::public.app_role[])
  );

-- ============================================================
-- 13. Fix: lesson_sessions — students can read sessions for their group
-- ============================================================
drop policy if exists "lesson_sessions_select_as_student" on public.lesson_sessions;
create policy "lesson_sessions_select_as_student" on public.lesson_sessions
  for select to authenticated
  using (
    exists (
      select 1 from public.student_users su
      join public.enrollments e on e.student_id = su.student_id
      where su.user_id = auth.uid()
        and e.group_id = lesson_sessions.group_id
    )
  );

-- ============================================================
-- 14. Fix: lesson_materials — students can read materials for unlocked sessions
-- ============================================================
drop policy if exists "lesson_materials_select_as_student" on public.lesson_materials;
create policy "lesson_materials_select_as_student" on public.lesson_materials
  for select to authenticated
  using (
    exists (
      select 1 from public.student_users su
      join public.enrollments e on e.student_id = su.student_id
      join public.lesson_sessions ls on ls.group_id = e.group_id
      where su.user_id = auth.uid()
        and ls.materials_unlocked = true
        and ls.lesson_template_id = lesson_materials.lesson_template_id
    )
  );

-- ============================================================
-- 15. Fix: profiles — allow reading teacher profiles for portal display
-- ============================================================
drop policy if exists "profiles_select_by_group_member" on public.profiles;
create policy "profiles_select_by_group_member" on public.profiles
  for select to authenticated
  using (
    -- Students/parents can see their teacher's profile
    exists (
      select 1 from public.groups g
      where g.teacher_id = profiles.id
        and (
          -- Student in this group
          exists (
            select 1 from public.student_users su
            join public.enrollments e on e.student_id = su.student_id
            where su.user_id = auth.uid() and e.group_id = g.id
          )
          OR
          -- Guardian of student in this group
          exists (
            select 1 from public.guardian_users gu
            join public.student_guardians sg on sg.guardian_id = gu.guardian_id
            join public.enrollments e on e.student_id = sg.student_id
            where gu.user_id = auth.uid() and e.group_id = g.id
          )
        )
    )
  );
