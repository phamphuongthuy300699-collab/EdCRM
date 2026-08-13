begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '91000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'fixed-teacher@pay.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);
insert into public.organizations (id, name, slug)
values ('91000000-0000-4000-8000-000000000010', 'Teacher pay modes test', 'teacher-pay-modes-test');
insert into public.profiles (id, full_name)
values ('91000000-0000-4000-8000-000000000001', 'Fixed teacher');
insert into public.org_memberships (organization_id, user_id, role)
values ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000001', 'teacher');
insert into public.branches (id, organization_id, name)
values ('91000000-0000-4000-8000-000000000011', '91000000-0000-4000-8000-000000000010', 'Test branch');
insert into public.courses (id, organization_id, title, slug)
values ('91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000010', 'Test course', 'pay-mode-course');
insert into public.groups (
  id, organization_id, course_id, branch_id, teacher_id, title, status,
  starts_on, ends_on, billing_enabled
) values (
  '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000010',
  '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000011',
  '91000000-0000-4000-8000-000000000001', 'Bounded group', 'active', current_date + 14, current_date + 28, false
);

select lives_ok(
  $$select public.set_teacher_pay_rate(
    '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000001',
    'per_lesson', current_date - 30, 1500, '91000000-0000-4000-8000-000000000001'
  )$$,
  'fixed lesson rate is accepted'
);
select is((select pay_mode from public.teacher_pay_rules where teacher_id = '91000000-0000-4000-8000-000000000001'), 'per_lesson', 'rule stores fixed mode');

insert into public.lesson_sessions (
  id, organization_id, group_id, course_id, teacher_id, starts_at, ends_at, lesson_date, status, session_kind
) values (
  '91000000-0000-4000-8000-000000000060', '91000000-0000-4000-8000-000000000010',
  '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000012',
  '91000000-0000-4000-8000-000000000001', now() - interval '1 hour', now(), current_date, 'live', 'regular'
);
select is((select count(*)::integer from public.teacher_payroll_entries where lesson_session_id = '91000000-0000-4000-8000-000000000060'), 0, 'live lesson has no payroll before completion');
select lives_ok(
  $$select public.transition_lesson_session(
    '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000060',
    '91000000-0000-4000-8000-000000000001', 'complete', true
  )$$,
  'zero-attendee lesson completes'
);
select is((select attendee_count from public.teacher_payroll_entries where lesson_session_id = '91000000-0000-4000-8000-000000000060'), 0, 'snapshot keeps zero attendees');
select is((select pay_mode from public.teacher_payroll_entries where lesson_session_id = '91000000-0000-4000-8000-000000000060'), 'per_lesson', 'snapshot keeps fixed mode');
select is((select amount from public.teacher_payroll_entries where lesson_session_id = '91000000-0000-4000-8000-000000000060'), 1500.00::numeric, 'fixed mode pays a completed lesson with zero attendees');
select public.transition_lesson_session(
  '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000060',
  '91000000-0000-4000-8000-000000000001', 'complete', true
);
select is((select count(*)::integer from public.teacher_payroll_entries where lesson_session_id = '91000000-0000-4000-8000-000000000060'), 1, 'duplicate completion keeps one payroll snapshot');

insert into public.lesson_sessions (
  id, organization_id, group_id, course_id, teacher_id, starts_at, ends_at, lesson_date, status, session_kind
) values
  ('91000000-0000-4000-8000-000000000061', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000001', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', current_date - 2, 'completed', 'regular'),
  ('91000000-0000-4000-8000-000000000062', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000001', now() - interval '1 day', now() - interval '1 day' + interval '1 hour', current_date - 1, 'completed', 'regular');
insert into public.teacher_payroll_entries (
  organization_id, lesson_session_id, teacher_id, attendee_count, rate_snapshot, amount
) values
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000061', '91000000-0000-4000-8000-000000000001', 1, 0, 0),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000062', '91000000-0000-4000-8000-000000000001', 8, 0, 0);
select is((select amount from public.teacher_payroll_entries where lesson_session_id = '91000000-0000-4000-8000-000000000061'), 1500.00::numeric, 'fixed mode pays the same with one attendee');
select is((select amount from public.teacher_payroll_entries where lesson_session_id = '91000000-0000-4000-8000-000000000062'), 1500.00::numeric, 'fixed mode pays the same with eight attendees');
select lives_ok(
  $$select public.set_teacher_pay_rate(
    '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000001',
    'per_lesson', current_date + 1, 2200, '91000000-0000-4000-8000-000000000001'
  )$$,
  'a future fixed rate is accepted'
);
select is((select amount from public.teacher_payroll_entries where lesson_session_id = '91000000-0000-4000-8000-000000000060'), 1500.00::numeric, 'new rate does not recalculate completed history');

select lives_ok(
  $$select public.set_teacher_pay_rate(
    '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000001',
    'per_attendee', current_date - 10, 500, '91000000-0000-4000-8000-000000000001'
  )$$,
  'per-attendee rate is accepted'
);
insert into public.lesson_sessions (
  id, organization_id, group_id, course_id, teacher_id, starts_at, ends_at, lesson_date, status, session_kind
) values (
  '91000000-0000-4000-8000-000000000063', '91000000-0000-4000-8000-000000000010',
  '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000012',
  '91000000-0000-4000-8000-000000000001', now() - interval '3 days', now() - interval '3 days' + interval '1 hour',
  current_date - 3, 'completed', 'regular'
);
insert into public.teacher_payroll_entries (
  organization_id, lesson_session_id, teacher_id, attendee_count, rate_snapshot, amount
) values (
  '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000063',
  '91000000-0000-4000-8000-000000000001', 6, 0, 0
);
select is((select amount from public.teacher_payroll_entries where lesson_session_id = '91000000-0000-4000-8000-000000000063'), 3000.00::numeric, 'per-attendee mode pays six times 500');

insert into public.group_schedule_rules (id, organization_id, group_id, weekday, starts_at, ends_at)
values (
  '91000000-0000-4000-8000-000000000070', '91000000-0000-4000-8000-000000000010',
  '91000000-0000-4000-8000-000000000020', 2, '01:00', '02:00'
);
insert into public.lesson_sessions (
  id, organization_id, group_id, course_id, teacher_id, schedule_rule_id,
  starts_at, ends_at, lesson_date, status, session_kind, rescheduled_from_session_id
) values
  ('91000000-0000-4000-8000-000000000071', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000070', (current_date + 15 + time '01:00') at time zone 'Europe/Moscow', (current_date + 15 + time '02:00') at time zone 'Europe/Moscow', current_date + 15, 'completed', 'regular', null),
  ('91000000-0000-4000-8000-000000000072', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000070', (current_date + 16 + time '01:00') at time zone 'Europe/Moscow', (current_date + 16 + time '02:00') at time zone 'Europe/Moscow', current_date + 16, 'moved', 'regular', null),
  ('91000000-0000-4000-8000-000000000073', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000070', (current_date + 17 + time '01:00') at time zone 'Europe/Moscow', (current_date + 17 + time '02:00') at time zone 'Europe/Moscow', current_date + 17, 'cancelled', 'regular', null),
  ('91000000-0000-4000-8000-000000000074', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000070', (current_date + 18 + time '01:00') at time zone 'Europe/Moscow', (current_date + 18 + time '02:00') at time zone 'Europe/Moscow', current_date + 18, 'planned', 'extra', null),
  ('91000000-0000-4000-8000-000000000075', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000070', (current_date + 19 + time '01:00') at time zone 'Europe/Moscow', (current_date + 19 + time '02:00') at time zone 'Europe/Moscow', current_date + 19, 'planned', 'trial', null),
  ('91000000-0000-4000-8000-000000000076', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000070', (current_date + 20 + time '01:00') at time zone 'Europe/Moscow', (current_date + 20 + time '02:00') at time zone 'Europe/Moscow', current_date + 20, 'planned', 'makeup', null),
  ('91000000-0000-4000-8000-000000000077', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000070', (current_date + 21 + time '01:00') at time zone 'Europe/Moscow', (current_date + 21 + time '02:00') at time zone 'Europe/Moscow', current_date + 21, 'planned', 'regular', null);

select lives_ok(
  $$select public.replace_group_schedule(
    '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020',
    jsonb_build_array(jsonb_build_object('weekday', 1, 'starts_at', '10:00', 'ends_at', '11:00')), true
  )$$,
  'bounded schedule is generated'
);
select ok(
  not exists (
    select 1 from public.lesson_sessions
    where group_id = '91000000-0000-4000-8000-000000000020'
      and schedule_rule_id is not null
      and lesson_date not between current_date + 14 and current_date + 28
  ),
  'generated lessons stay inside group dates'
);
select is(
  (select count(*)::integer from public.lesson_sessions where id between '91000000-0000-4000-8000-000000000071' and '91000000-0000-4000-8000-000000000076'),
  6,
  'rebuild preserves completed, moved, cancelled, extra, trial and makeup sessions'
);
select is(
  (select count(*)::integer from public.lesson_sessions where id = '91000000-0000-4000-8000-000000000077'),
  0,
  'rebuild removes only the safe future rule-owned regular lesson'
);

select * from finish();
rollback;
