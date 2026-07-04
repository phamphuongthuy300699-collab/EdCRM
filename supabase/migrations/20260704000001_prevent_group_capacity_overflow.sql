-- Enforce group capacity at the database boundary.
-- Keep this as an additive migration so existing servers can upgrade safely.

create or replace function public.prevent_group_capacity_overflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity int;
  v_active_enrollments int;
begin
  if new.group_id is null or new.status not in ('active', 'paused') then
    return new;
  end if;

  select g.capacity
  into v_capacity
  from public.groups g
  where g.id = new.group_id
  for update;

  if not found then
    raise exception 'group_not_found' using errcode = '23503';
  end if;

  if coalesce(v_capacity, 0) <= 0 then
    return new;
  end if;

  select count(*)
  into v_active_enrollments
  from public.enrollments e
  where e.group_id = new.group_id
    and e.status in ('active', 'paused')
    and (tg_op = 'INSERT' or e.id <> new.id);

  if v_active_enrollments >= v_capacity then
    raise exception 'group_capacity_exceeded' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_group_capacity_overflow on public.enrollments;

create trigger trg_prevent_group_capacity_overflow
before insert or update of group_id, status
on public.enrollments
for each row
execute function public.prevent_group_capacity_overflow();
