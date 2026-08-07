create or replace function public.transition_lesson_session(
  p_organization_id uuid,
  p_session_id uuid,
  p_actor_id uuid,
  p_action text,
  p_is_admin boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.lesson_sessions%rowtype;
begin
  select * into target_session
  from public.lesson_sessions
  where id = p_session_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'session_not_found'; end if;

  if not p_is_admin and (target_session.teacher_id is null or target_session.teacher_id <> p_actor_id) then
    raise exception 'foreign_teacher_session';
  end if;

  if p_action = 'start' then
    if target_session.status = 'live' then
      return jsonb_build_object('id', target_session.id, 'status', target_session.status, 'unchanged', true);
    end if;
    if target_session.status <> 'planned' then raise exception 'session_cannot_start'; end if;
    update public.lesson_sessions
    set status = 'live', started_at = coalesce(started_at, now()), materials_unlocked = true
    where id = target_session.id;
    return jsonb_build_object('id', target_session.id, 'status', 'live');
  end if;

  if p_action = 'complete' then
    if target_session.status = 'completed' then
      return jsonb_build_object('id', target_session.id, 'status', target_session.status, 'unchanged', true);
    end if;
    if target_session.status <> 'live' then raise exception 'session_must_be_live'; end if;

    if exists (
      with expected_students as (
        select student_id from public.enrollments
        where organization_id = p_organization_id and group_id = target_session.group_id and status = 'active'
        union
        select student_id from public.makeup_assignments
        where organization_id = p_organization_id and target_session_id = target_session.id and status = 'scheduled'
      )
      select 1 from expected_students expected
      left join public.attendance attendance_row
        on attendance_row.lesson_session_id = target_session.id and attendance_row.student_id = expected.student_id
      where attendance_row.id is null or attendance_row.attendance_status = 'unmarked'
    ) then
      raise exception 'attendance_incomplete';
    end if;

    -- FUTURE FINANCE ATOMIC BOUNDARY: lesson debit, teacher accrual and ledgers belong in this transaction.
    update public.makeup_assignments makeup
    set status = 'completed', completed_at = coalesce(makeup.completed_at, now()), updated_at = now()
    where makeup.organization_id = p_organization_id
      and makeup.target_session_id = target_session.id
      and makeup.status = 'scheduled'
      and exists (
        select 1 from public.attendance attendance_row
        where attendance_row.lesson_session_id = target_session.id
          and attendance_row.student_id = makeup.student_id
          and attendance_row.attendance_status in ('present', 'late')
      );
    update public.lesson_sessions
    set status = 'completed', completed_at = coalesce(completed_at, now())
    where id = target_session.id;
    return jsonb_build_object('id', target_session.id, 'status', 'completed');
  end if;

  raise exception 'unsupported_session_action';
end;
$$;

revoke all on function public.transition_lesson_session(uuid, uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.transition_lesson_session(uuid, uuid, uuid, text, boolean) to service_role;
