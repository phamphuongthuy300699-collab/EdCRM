begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '93000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'schedule-edit@regression.test', '', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.organizations (id, name, slug)
values ('93000000-0000-4000-8000-000000000010', 'Schedule edit regression', 'schedule-edit-regression');

insert into public.profiles (id, full_name)
values ('93000000-0000-4000-8000-000000000001', 'Schedule teacher');

insert into public.org_memberships (organization_id, user_id, role)
values (
  '93000000-0000-4000-8000-000000000010',
  '93000000-0000-4000-8000-000000000001',
  'teacher'
);

insert into public.branches (id, organization_id, name)
values (
  '93000000-0000-4000-8000-000000000011',
  '93000000-0000-4000-8000-000000000010',
  'Schedule branch'
);

insert into public.rooms (id, organization_id, branch_id, name)
values (
  '93000000-0000-4000-8000-000000000012',
  '93000000-0000-4000-8000-000000000010',
  '93000000-0000-4000-8000-000000000011',
  'Schedule room'
);

insert into public.courses (id, organization_id, title, slug)
values (
  '93000000-0000-4000-8000-000000000013',
  '93000000-0000-4000-8000-000000000010',
  'Schedule course',
  'schedule-edit-course'
);

insert into public.groups (
  id, organization_id, course_id, branch_id, room_id, teacher_id,
  title, status, starts_on, ends_on
) values
  (
    '93000000-0000-4000-8000-000000000020',
    '93000000-0000-4000-8000-000000000010',
    '93000000-0000-4000-8000-000000000013',
    '93000000-0000-4000-8000-000000000011',
    '93000000-0000-4000-8000-000000000012',
    '93000000-0000-4000-8000-000000000001',
    'Edited group', 'active', current_date, current_date + 84
  ),
  (
    '93000000-0000-4000-8000-000000000021',
    '93000000-0000-4000-8000-000000000010',
    '93000000-0000-4000-8000-000000000013',
    '93000000-0000-4000-8000-000000000011',
    '93000000-0000-4000-8000-000000000012',
    '93000000-0000-4000-8000-000000000001',
    'Conflicting group', 'active', current_date, current_date + 84
  );

insert into public.group_schedule_rules (
  id, organization_id, group_id, weekday, starts_at, ends_at
) values (
  '93000000-0000-4000-8000-000000000030',
  '93000000-0000-4000-8000-000000000010',
  '93000000-0000-4000-8000-000000000020',
  6, '15:00', '16:30'
);

-- Model the real sequence: one occurrence was already moved from 15:00 to
-- 12:00, then the weekly group schedule is changed permanently to 12:00.
with target_day as (
  select current_date
    + ((6 - extract(isodow from current_date)::integer + 7) % 7)
    + 7 as day
)
insert into public.lesson_sessions (
  id, organization_id, group_id, course_id, teacher_id, room_id,
  schedule_rule_id, starts_at, ends_at, lesson_date, status, session_kind
)
select
  '93000000-0000-4000-8000-000000000040',
  '93000000-0000-4000-8000-000000000010',
  '93000000-0000-4000-8000-000000000020',
  '93000000-0000-4000-8000-000000000013',
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000012',
  '93000000-0000-4000-8000-000000000030',
  (day + time '15:00') at time zone 'Europe/Moscow',
  (day + time '16:30') at time zone 'Europe/Moscow',
  day, 'moved', 'regular'
from target_day;

with target_day as (
  select current_date
    + ((6 - extract(isodow from current_date)::integer + 7) % 7)
    + 7 as day
)
insert into public.lesson_sessions (
  id, organization_id, group_id, course_id, teacher_id, room_id,
  starts_at, ends_at, lesson_date, status, session_kind,
  rescheduled_from_session_id
)
select
  '93000000-0000-4000-8000-000000000041',
  '93000000-0000-4000-8000-000000000010',
  '93000000-0000-4000-8000-000000000020',
  '93000000-0000-4000-8000-000000000013',
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000012',
  (day + time '12:00') at time zone 'Europe/Moscow',
  (day + time '13:30') at time zone 'Europe/Moscow',
  day, 'planned', 'regular',
  '93000000-0000-4000-8000-000000000040'
from target_day;

select lives_ok(
  $$select public.replace_group_schedule(
    '93000000-0000-4000-8000-000000000010',
    '93000000-0000-4000-8000-000000000020',
    '[{"weekday":6,"starts_at":"12:00","ends_at":"13:30"}]'::jsonb,
    true
  )$$,
  'Saturday group can move from 15:00 to 12:00'
);

select is(
  (select starts_at::text from public.group_schedule_rules
   where group_id = '93000000-0000-4000-8000-000000000020'),
  '12:00:00',
  'new weekly start time persists after the RPC'
);

select is(
  (select ends_at::text from public.group_schedule_rules
   where group_id = '93000000-0000-4000-8000-000000000020'),
  '13:30:00',
  'new weekly end time persists after the RPC'
);

select is(
  (select count(*)::integer from public.lesson_sessions
   where group_id = '93000000-0000-4000-8000-000000000020'
     and status in ('planned', 'live')
     and lesson_date = (
       current_date
       + ((6 - extract(isodow from current_date)::integer + 7) % 7)
       + 7
     )
     and (starts_at at time zone 'Europe/Moscow')::time = time '12:00'),
  1,
  'the existing moved occurrence is reused instead of self-conflicting'
);

select is(
  (select count(*)::integer from public.lesson_sessions
   where id = '93000000-0000-4000-8000-000000000041'),
  1,
  'the protected rescheduled occurrence is preserved'
);

with conflict_day as (
  select current_date
    + ((6 - extract(isodow from current_date)::integer + 7) % 7)
    + 14 as day
)
insert into public.lesson_sessions (
  id, organization_id, group_id, course_id, teacher_id, room_id,
  starts_at, ends_at, lesson_date, status, session_kind
)
select
  '93000000-0000-4000-8000-000000000042',
  '93000000-0000-4000-8000-000000000010',
  '93000000-0000-4000-8000-000000000021',
  '93000000-0000-4000-8000-000000000013',
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000012',
  (day + time '12:30') at time zone 'Europe/Moscow',
  (day + time '14:00') at time zone 'Europe/Moscow',
  day, 'planned', 'regular'
from conflict_day;

select throws_like(
  $$select public.replace_group_schedule(
    '93000000-0000-4000-8000-000000000010',
    '93000000-0000-4000-8000-000000000020',
    '[{"weekday":6,"starts_at":"12:00","ends_at":"13:30"}]'::jsonb,
    true
  )$$,
  '%schedule_resource_conflict%',
  'a real teacher or room overlap with another group is blocked'
);

select is(
  (select count(*)::integer from public.group_schedule_rules
   where group_id = '93000000-0000-4000-8000-000000000020'
     and starts_at = time '12:00'),
  1,
  'a failed conflicting replacement rolls back its statement'
);

select is(
  (select count(*)::integer from public.lesson_sessions
   where group_id = '93000000-0000-4000-8000-000000000021'),
  1,
  'the conflicting group session remains unchanged'
);

select * from finish();
rollback;
