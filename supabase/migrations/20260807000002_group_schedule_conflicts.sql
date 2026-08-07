create or replace function public.guard_group_schedule_rule_conflicts()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_group public.groups%rowtype;
begin
  select * into target_group from public.groups
  where id = new.group_id and organization_id = new.organization_id;
  if not found then raise exception 'group_not_found'; end if;

  if target_group.status = 'active' and exists (
    select 1
    from public.group_schedule_rules other_rule
    join public.groups other_group on other_group.id = other_rule.group_id
    where other_rule.organization_id = new.organization_id
      and other_rule.group_id <> new.group_id
      and other_rule.weekday = new.weekday
      and other_rule.starts_at < new.ends_at
      and other_rule.ends_at > new.starts_at
      and other_group.status = 'active'
      and other_group.deleted_at is null
      and (
        (target_group.teacher_id is not null and other_group.teacher_id = target_group.teacher_id)
        or (target_group.room_id is not null and other_group.room_id = target_group.room_id)
      )
  ) then
    raise exception 'Schedule rule conflicts with an active group teacher or room';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_group_schedule_rule_conflicts on public.group_schedule_rules;
create trigger guard_group_schedule_rule_conflicts
before insert or update on public.group_schedule_rules
for each row execute function public.guard_group_schedule_rule_conflicts();
