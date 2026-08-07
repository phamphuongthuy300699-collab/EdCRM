create or replace function public.crm_set_student_enrollment(
  p_organization_id uuid,
  p_student_id uuid,
  p_group_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student public.students%rowtype;
  target_group public.groups%rowtype;
  active_count integer;
  target_enrollment_id uuid;
begin
  select * into target_student
  from public.students
  where id = p_student_id and organization_id = p_organization_id and deleted_at is null
  for update;
  if not found then raise exception 'student_not_found'; end if;

  if p_group_id is not null then
    select * into target_group
    from public.groups
    where id = p_group_id and organization_id = p_organization_id and status = 'active' and deleted_at is null
    for update;
    if not found then raise exception 'group_not_found_or_inactive'; end if;

    if exists (
      select 1 from public.enrollments
      where organization_id = p_organization_id and student_id = p_student_id and group_id = p_group_id and status = 'active'
    ) then
      return jsonb_build_object('student_id', p_student_id, 'group_id', p_group_id, 'unchanged', true);
    end if;

    if coalesce(target_group.capacity, 0) > 0 then
      select count(*) into active_count from public.enrollments
      where organization_id = p_organization_id and group_id = p_group_id and status in ('active', 'paused');
      if active_count >= target_group.capacity then raise exception 'group_capacity_exceeded'; end if;
    end if;
  end if;

  update public.enrollments
  set status = 'cancelled', ended_on = current_date
  where organization_id = p_organization_id and student_id = p_student_id and status = 'active';

  if p_group_id is not null then
    select id into target_enrollment_id
    from public.enrollments
    where organization_id = p_organization_id and student_id = p_student_id and group_id = p_group_id and status = 'cancelled'
    for update;

    if target_enrollment_id is not null then
      update public.enrollments set status = 'active', started_on = current_date, ended_on = null where id = target_enrollment_id;
    else
      insert into public.enrollments (organization_id, student_id, group_id, status, started_on)
      values (p_organization_id, p_student_id, p_group_id, 'active', current_date)
      returning id into target_enrollment_id;
    end if;
  end if;

  return jsonb_build_object('student_id', p_student_id, 'group_id', p_group_id, 'enrollment_id', target_enrollment_id);
end;
$$;

revoke all on function public.crm_set_student_enrollment(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_set_student_enrollment(uuid, uuid, uuid) to service_role;
