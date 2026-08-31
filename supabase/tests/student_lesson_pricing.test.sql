begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

select has_column('public', 'students', 'lesson_price', 'students store a personal lesson price');
select col_type_is('public', 'students', 'lesson_price', 'numeric(12,2)', 'personal lesson price has money precision');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '98000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'pricing-admin@test.invalid', '', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.organizations (id, name, slug)
values ('98000000-0000-4000-8000-000000000010', 'Pricing test', 'pricing-test');
insert into public.profiles (id, full_name)
values ('98000000-0000-4000-8000-000000000001', 'Pricing admin');
insert into public.org_memberships (organization_id, user_id, role)
values ('98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000001', 'admin');
insert into public.branches (id, organization_id, name)
values ('98000000-0000-4000-8000-000000000011', '98000000-0000-4000-8000-000000000010', 'Pricing branch');
insert into public.courses (id, organization_id, title, slug)
values ('98000000-0000-4000-8000-000000000012', '98000000-0000-4000-8000-000000000010', 'Pricing course', 'pricing-course');
insert into public.groups (
  id, organization_id, course_id, branch_id, title, status,
  billing_enabled, lesson_price, charge_absent_excused, charge_absent_unexcused
) values (
  '98000000-0000-4000-8000-000000000020',
  '98000000-0000-4000-8000-000000000010',
  '98000000-0000-4000-8000-000000000012',
  '98000000-0000-4000-8000-000000000011',
  'One group, different prices', 'active', true, 500, false, true
);
insert into public.guardians (id, organization_id, full_name, status)
values ('98000000-0000-4000-8000-000000000030', '98000000-0000-4000-8000-000000000010', 'Pricing guardian', 'active');
insert into public.students (id, organization_id, full_name, status, lesson_price) values
  ('98000000-0000-4000-8000-000000000040', '98000000-0000-4000-8000-000000000010', 'Student 700', 'active', 700),
  ('98000000-0000-4000-8000-000000000041', '98000000-0000-4000-8000-000000000010', 'Student 900', 'active', 900),
  ('98000000-0000-4000-8000-000000000042', '98000000-0000-4000-8000-000000000010', 'Student missing price', 'active', null);
insert into public.student_guardians (
  organization_id, student_id, guardian_id, relation, is_primary, is_billing_contact
) values
  ('98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000040', '98000000-0000-4000-8000-000000000030', 'Родитель', true, true),
  ('98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000041', '98000000-0000-4000-8000-000000000030', 'Родитель', true, true),
  ('98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000042', '98000000-0000-4000-8000-000000000030', 'Родитель', true, true);
insert into public.enrollments (organization_id, student_id, group_id, status, started_on) values
  ('98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000040', '98000000-0000-4000-8000-000000000020', 'active', current_date),
  ('98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000041', '98000000-0000-4000-8000-000000000020', 'active', current_date),
  ('98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000042', '98000000-0000-4000-8000-000000000020', 'active', current_date);
insert into public.lesson_sessions (
  id, organization_id, group_id, course_id, starts_at, ends_at, lesson_date, status, session_kind
) values
  ('98000000-0000-4000-8000-000000000060', '98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000020', '98000000-0000-4000-8000-000000000012', '2026-09-01 10:00+03', '2026-09-01 11:00+03', '2026-09-01', 'live', 'regular'),
  ('98000000-0000-4000-8000-000000000061', '98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000020', '98000000-0000-4000-8000-000000000012', '2026-09-08 10:00+03', '2026-09-08 11:00+03', '2026-09-08', 'completed', 'regular');
insert into public.attendance (
  id, organization_id, group_id, lesson_session_id, student_id, lesson_date, attendance_status, is_present
) values
  ('98000000-0000-4000-8000-000000000070', '98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000020', '98000000-0000-4000-8000-000000000060', '98000000-0000-4000-8000-000000000040', '2026-09-01', 'present', true),
  ('98000000-0000-4000-8000-000000000071', '98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000020', '98000000-0000-4000-8000-000000000060', '98000000-0000-4000-8000-000000000041', '2026-09-01', 'present', true),
  ('98000000-0000-4000-8000-000000000072', '98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000020', '98000000-0000-4000-8000-000000000060', '98000000-0000-4000-8000-000000000042', '2026-09-01', 'present', true),
  ('98000000-0000-4000-8000-000000000073', '98000000-0000-4000-8000-000000000010', '98000000-0000-4000-8000-000000000020', '98000000-0000-4000-8000-000000000061', '98000000-0000-4000-8000-000000000040', '2026-09-08', 'present', true);

select throws_ok(
  $$update public.students set lesson_price = 0 where id = '98000000-0000-4000-8000-000000000040'$$,
  '23514', null, 'zero personal price is rejected'
);
select throws_ok(
  $$update public.students set lesson_price = -1 where id = '98000000-0000-4000-8000-000000000040'$$,
  '23514', null, 'negative personal price is rejected'
);

select lives_ok(
  $$select public.transition_lesson_session('98000000-0000-4000-8000-000000000010','98000000-0000-4000-8000-000000000060','98000000-0000-4000-8000-000000000001','complete',true)$$,
  'completion accepts different personal prices in one group'
);
select is((select amount from public.billing_ledger_entries where lesson_session_id='98000000-0000-4000-8000-000000000060' and student_id='98000000-0000-4000-8000-000000000040'), -700.00::numeric, 'first student is charged 700');
select is((select amount from public.billing_ledger_entries where lesson_session_id='98000000-0000-4000-8000-000000000060' and student_id='98000000-0000-4000-8000-000000000041'), -900.00::numeric, 'second student is charged 900');
select is((select count(*)::integer from public.billing_ledger_entries where lesson_session_id='98000000-0000-4000-8000-000000000060' and student_id='98000000-0000-4000-8000-000000000042'), 0, 'student without price is not charged');
select ok((select resolved_at is null from public.finance_warnings where warning_key='lesson-price:98000000-0000-4000-8000-000000000060:98000000-0000-4000-8000-000000000042'), 'missing personal price creates a student warning');
select is((select student_id from public.finance_warnings where warning_key='lesson-price:98000000-0000-4000-8000-000000000060:98000000-0000-4000-8000-000000000042'), '98000000-0000-4000-8000-000000000042'::uuid, 'price warning identifies the student');

update public.students set lesson_price=650 where id='98000000-0000-4000-8000-000000000042';
select lives_ok(
  $$select public.reconcile_lesson_finance('98000000-0000-4000-8000-000000000010','98000000-0000-4000-8000-000000000060','98000000-0000-4000-8000-000000000001')$$,
  'reconciliation repairs a missing personal price'
);
select is((select amount from public.billing_ledger_entries where lesson_session_id='98000000-0000-4000-8000-000000000060' and student_id='98000000-0000-4000-8000-000000000042'), -650.00::numeric, 'reconciliation uses the repaired personal price');
select ok((select resolved_at is not null from public.finance_warnings where warning_key='lesson-price:98000000-0000-4000-8000-000000000060:98000000-0000-4000-8000-000000000042'), 'reconciliation resolves the student warning');

update public.students set lesson_price=800 where id='98000000-0000-4000-8000-000000000040';
select lives_ok(
  $$select public.reconcile_lesson_finance('98000000-0000-4000-8000-000000000010','98000000-0000-4000-8000-000000000061','98000000-0000-4000-8000-000000000001')$$,
  'new lessons use an edited personal price'
);
select is((select amount from public.billing_ledger_entries where lesson_session_id='98000000-0000-4000-8000-000000000061' and student_id='98000000-0000-4000-8000-000000000040'), -800.00::numeric, 'edited price applies to the next lesson');
select is((select amount from public.billing_ledger_entries where lesson_session_id='98000000-0000-4000-8000-000000000060' and student_id='98000000-0000-4000-8000-000000000040'), -700.00::numeric, 'historical debit remains immutable');

select lives_ok(
  $$select public.crm_create_student_with_guardians(
    '98000000-0000-4000-8000-000000000010',
    jsonb_build_object('full_name','Created with price','status','prospect','lesson_price',725),
    jsonb_build_array(jsonb_build_object('guardian_id','98000000-0000-4000-8000-000000000030','relation','Родитель')),
    null
  )$$,
  'student creation accepts a personal price without a group'
);
select is((select lesson_price from public.students where full_name='Created with price' and organization_id='98000000-0000-4000-8000-000000000010'), 725.00::numeric, 'creation stores the personal price');
select throws_ok(
  $$select public.crm_create_student_with_guardians(
    '98000000-0000-4000-8000-000000000010',
    jsonb_build_object('full_name','Missing price','status','prospect'),
    '[]'::jsonb,
    null
  )$$,
  'student_lesson_price_required',
  'interactive creation rejects a missing price'
);
select is((select count(*)::integer from public.students where full_name='Missing price' and organization_id='98000000-0000-4000-8000-000000000010'), 0, 'invalid creation leaves no partial student');

select * from finish();
rollback;
