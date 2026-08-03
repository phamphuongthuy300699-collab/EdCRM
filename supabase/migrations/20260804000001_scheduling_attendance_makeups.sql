-- One operational contour for concrete lessons, attendance and makeups.

alter table public.lesson_sessions
  add column if not exists session_kind text not null default 'regular',
  add column if not exists schedule_rule_id uuid references public.group_schedule_rules(id) on delete set null,
  add column if not exists rescheduled_from_session_id uuid references public.lesson_sessions(id) on delete set null,
  add column if not exists change_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists notification_status text not null default 'not_required';

alter table public.lesson_sessions
  drop constraint if exists lesson_sessions_session_kind_check;
alter table public.lesson_sessions
  add constraint lesson_sessions_session_kind_check
  check (session_kind in ('regular', 'makeup', 'trial', 'extra'));

alter table public.lesson_sessions
  drop constraint if exists lesson_sessions_notification_status_check;
alter table public.lesson_sessions
  add constraint lesson_sessions_notification_status_check
  check (notification_status in ('not_required', 'pending', 'sent', 'failed'));

alter table public.lesson_sessions drop constraint if exists lesson_sessions_group_id_lesson_date_key;
create unique index if not exists lesson_sessions_group_starts_unique
  on public.lesson_sessions (group_id, starts_at);
create index if not exists idx_lesson_sessions_rescheduled_from
  on public.lesson_sessions (rescheduled_from_session_id);

create or replace function public.reschedule_lesson_session(
  p_organization_id uuid,
  p_session_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  source public.lesson_sessions%rowtype;
  replacement_id uuid;
begin
  select * into source
  from public.lesson_sessions
  where id = p_session_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'Lesson session not found'; end if;
  if source.status not in ('planned', 'live') then raise exception 'Lesson session cannot be rescheduled'; end if;

  update public.lesson_sessions
  set status = 'moved', change_reason = p_reason, notification_status = 'not_required'
  where id = source.id;

  insert into public.lesson_sessions (
    organization_id, group_id, course_id, module_id, lesson_template_id,
    teacher_id, room_id, starts_at, ends_at, lesson_date, status,
    session_kind, topic, rescheduled_from_session_id, change_reason, notification_status
  ) values (
    source.organization_id, source.group_id, source.course_id, source.module_id, source.lesson_template_id,
    source.teacher_id, source.room_id, p_starts_at, p_ends_at, (p_starts_at at time zone 'Europe/Moscow')::date, 'planned',
    source.session_kind, source.topic, source.id, p_reason, 'pending'
  ) returning id into replacement_id;

  return replacement_id;
end;
$$;
revoke all on function public.reschedule_lesson_session(uuid, uuid, timestamptz, timestamptz, text) from public;
grant execute on function public.reschedule_lesson_session(uuid, uuid, timestamptz, timestamptz, text) to service_role;

alter table public.attendance
  add column if not exists attendance_status text not null default 'unmarked',
  add column if not exists absence_reason text,
  add column if not exists marked_by uuid references public.profiles(id) on delete set null,
  add column if not exists marked_at timestamptz;

update public.attendance
set attendance_status = case when is_present then 'present' else 'absent_unexcused' end,
    marked_at = coalesce(marked_at, created_at)
where attendance_status = 'unmarked';

alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add constraint attendance_status_check
  check (attendance_status in ('unmarked', 'present', 'late', 'absent_excused', 'absent_unexcused'));

alter table public.attendance drop constraint if exists attendance_group_id_student_id_lesson_date_key;
alter table public.attendance drop constraint if exists attendance_lesson_session_student_key;
alter table public.attendance add constraint attendance_lesson_session_student_key
  unique (lesson_session_id, student_id);
create unique index if not exists attendance_legacy_group_student_date_unique
  on public.attendance (group_id, student_id, lesson_date)
  where lesson_session_id is null;

create table if not exists public.makeup_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_attendance_id uuid not null references public.attendance(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  target_session_id uuid references public.lesson_sessions(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'scheduled', 'completed', 'cancelled')),
  requested_by_guardian_id uuid references public.guardians(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  notes text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists makeup_assignments_one_open_per_absence
  on public.makeup_assignments (source_attendance_id)
  where status in ('requested', 'approved', 'scheduled');
create index if not exists idx_makeup_assignments_target_session
  on public.makeup_assignments (target_session_id, status);
create index if not exists idx_makeup_assignments_student
  on public.makeup_assignments (student_id, status);

alter table public.notification_outbox
  add column if not exists student_id uuid references public.students(id) on delete set null,
  add column if not exists lesson_session_id uuid references public.lesson_sessions(id) on delete set null,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists next_attempt_at timestamptz;
create index if not exists idx_notification_outbox_lesson_session
  on public.notification_outbox (lesson_session_id, status);
create index if not exists idx_notification_outbox_student
  on public.notification_outbox (student_id, status);
create index if not exists idx_notification_outbox_retry
  on public.notification_outbox (status, next_attempt_at, created_at);
alter table public.notification_outbox
  drop constraint if exists notification_outbox_guardian_student_session_template_key;
alter table public.notification_outbox
  add constraint notification_outbox_guardian_student_session_template_key
  unique (guardian_id, student_id, lesson_session_id, template_key);

alter table public.makeup_assignments enable row level security;

drop policy if exists "attendance_select_members" on public.attendance;
create policy "attendance_select_members" on public.attendance
  for select to authenticated using (
    public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[])
    or public.is_teacher_of_group(group_id)
  );

drop policy if exists "makeup_assignments_select_staff" on public.makeup_assignments;
create policy "makeup_assignments_select_staff" on public.makeup_assignments
  for select to authenticated using (
    public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[])
    or exists (
      select 1 from public.lesson_sessions ls
      where ls.id = makeup_assignments.target_session_id
        and ls.organization_id = makeup_assignments.organization_id
        and ls.teacher_id = auth.uid()
    )
  );

drop policy if exists "makeup_assignments_write_staff" on public.makeup_assignments;
create policy "makeup_assignments_write_staff" on public.makeup_assignments
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

drop policy if exists "makeup_assignments_select_guardian" on public.makeup_assignments;
create policy "makeup_assignments_select_guardian" on public.makeup_assignments
  for select to authenticated using (
    exists (
      select 1
      from public.guardian_users gu
      join public.student_guardians sg on sg.guardian_id = gu.guardian_id
      where gu.user_id = auth.uid()
        and sg.student_id = makeup_assignments.student_id
    )
  );

drop policy if exists "attendance_write_teacher" on public.attendance;
create policy "attendance_write_teacher" on public.attendance
  for insert to authenticated with check (
    public.is_teacher_of_group(group_id)
    and (
      exists (select 1 from public.enrollments e where e.student_id = attendance.student_id and e.group_id = attendance.group_id and e.status = 'active')
      or exists (
        select 1 from public.makeup_assignments ma
        join public.lesson_sessions ls on ls.id = ma.target_session_id
        where ma.student_id = attendance.student_id
          and ls.id = attendance.lesson_session_id
          and ma.status = 'scheduled'
      )
    )
  );

drop policy if exists "attendance_update_teacher" on public.attendance;
create policy "attendance_update_teacher" on public.attendance
  for update to authenticated
  using (public.is_teacher_of_group(group_id))
  with check (public.is_teacher_of_group(group_id));
