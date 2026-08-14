-- A NULL schedule means the caller edited group attributes without touching the
-- weekly rules. An explicit [] remains the intentional clear-schedule command.
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
  if p_rules is not null then
    schedule_result := public.replace_group_schedule(p_organization_id,saved_group_id,p_rules,p_rebuild_future);
  end if;
  return jsonb_build_object('group_id',saved_group_id,'schedule',schedule_result);
end;
$$;
revoke all on function public.save_group_with_schedule(uuid, uuid, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.save_group_with_schedule(uuid, uuid, jsonb, jsonb, boolean) to service_role;
