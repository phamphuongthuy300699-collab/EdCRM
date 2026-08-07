-- Lock the lesson while validating and saving attendance. Completion uses the
-- same row lock, so the journal cannot be changed after the lesson is completed.
create or replace function public.save_lesson_attendance(
  p_organization_id uuid,
  p_session_id uuid,
  p_actor_id uuid,
  p_is_admin boolean,
  p_records jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.lesson_sessions%rowtype;
  saved_count integer := 0;
  new_absence_student_ids jsonb := '[]'::jsonb;
begin
  select * into target_session
  from public.lesson_sessions
  where id = p_session_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'session_not_found'; end if;
  if not p_is_admin and (target_session.teacher_id is null or target_session.teacher_id <> p_actor_id) then
    raise exception 'foreign_teacher_session';
  end if;
  if target_session.status <> 'live' then raise exception 'session_must_be_live'; end if;
  if jsonb_typeof(coalesce(p_records, '[]'::jsonb)) <> 'array' then raise exception 'attendance_payload_invalid'; end if;

  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid, status text, comment text, absence_reason text)
    where record.student_id is null or record.status not in ('unmarked', 'present', 'late', 'absent_excused', 'absent_unexcused')
  ) then raise exception 'attendance_record_invalid'; end if;
  if (select count(*) from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid)) <>
     (select count(distinct student_id) from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid))
  then raise exception 'attendance_student_duplicate'; end if;
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid)
    where not exists (
      select 1 from public.enrollments enrollment
      where enrollment.organization_id = p_organization_id
        and enrollment.group_id = target_session.group_id
        and enrollment.student_id = record.student_id
        and enrollment.status = 'active'
    ) and not exists (
      select 1 from public.makeup_assignments makeup
      where makeup.organization_id = p_organization_id
        and makeup.target_session_id = target_session.id
        and makeup.student_id = record.student_id
        and makeup.status = 'scheduled'
    )
  ) then raise exception 'attendance_student_not_in_roster'; end if;

  select coalesce(jsonb_agg(record.student_id), '[]'::jsonb) into new_absence_student_ids
  from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid, status text)
  left join public.attendance previous
    on previous.organization_id = p_organization_id
    and previous.lesson_session_id = target_session.id
    and previous.student_id = record.student_id
  where record.status in ('absent_excused', 'absent_unexcused')
    and coalesce(previous.attendance_status, 'unmarked') not in ('absent_excused', 'absent_unexcused');

  insert into public.attendance (
    organization_id, group_id, lesson_session_id, lesson_date, student_id,
    attendance_status, is_present, comment, absence_reason, marked_by, marked_at
  )
  select
    p_organization_id, target_session.group_id, target_session.id,
    coalesce(target_session.lesson_date, (target_session.starts_at at time zone 'Europe/Moscow')::date),
    record.student_id, record.status,
    record.status in ('present', 'late'), nullif(record.comment, ''), nullif(record.absence_reason, ''), p_actor_id, now()
  from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid, status text, comment text, absence_reason text)
  on conflict (lesson_session_id, student_id) do update set
    attendance_status = excluded.attendance_status,
    is_present = excluded.is_present,
    comment = excluded.comment,
    absence_reason = excluded.absence_reason,
    marked_by = excluded.marked_by,
    marked_at = excluded.marked_at;
  get diagnostics saved_count = row_count;

  return jsonb_build_object('saved', saved_count, 'new_absence_student_ids', new_absence_student_ids);
end;
$$;

revoke all on function public.save_lesson_attendance(uuid, uuid, uuid, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.save_lesson_attendance(uuid, uuid, uuid, boolean, jsonb) to service_role;
