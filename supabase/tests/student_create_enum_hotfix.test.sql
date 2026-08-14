begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into public.organizations (id, name, slug)
values (
  '92000000-0000-4000-8000-000000000010',
  'Student create enum hotfix test',
  'student-create-enum-hotfix-test'
);

insert into public.guardians (id, organization_id, full_name, status)
values (
  '92000000-0000-4000-8000-000000000020',
  '92000000-0000-4000-8000-000000000010',
  'Existing guardian',
  'active'
);

select lives_ok(
  $$select public.crm_create_student_with_guardians(
    '92000000-0000-4000-8000-000000000010',
    '{"full_name":"Student with existing guardian","status":"active"}'::jsonb,
    '[{"guardian_id":"92000000-0000-4000-8000-000000000020","relation":"Родитель","is_primary":true,"is_billing_contact":true}]'::jsonb,
    null
  )$$,
  'student with explicit active status and an existing guardian is created'
);

select is(
  (select count(*)::integer from public.students where full_name = 'Student with existing guardian'),
  1,
  'student row is stored'
);
select is(
  (select status::text from public.students where full_name = 'Student with existing guardian'),
  'active',
  'student status is active'
);
select is(
  (select count(*)::integer from public.enrollments e join public.students s on s.id = e.student_id where s.full_name = 'Student with existing guardian'),
  0,
  'student can be created without a group'
);
select is(
  (
    select count(*)::integer
    from public.student_guardians sg
    join public.students s on s.id = sg.student_id
    where s.full_name = 'Student with existing guardian'
      and sg.guardian_id = '92000000-0000-4000-8000-000000000020'
      and sg.is_primary
      and sg.is_billing_contact
  ),
  1,
  'existing guardian is linked as primary and billing contact'
);

select lives_ok(
  $$select public.crm_create_student_with_guardians(
    '92000000-0000-4000-8000-000000000010',
    '{"full_name":"Student with new guardian","status":"active"}'::jsonb,
    '[{"full_name":"New guardian","relation":"Родитель","is_primary":true,"is_billing_contact":true}]'::jsonb,
    null
  )$$,
  'ordinary scenario creates a student and a new guardian'
);
select is(
  (select count(*)::integer from public.guardians where full_name = 'New guardian'),
  1,
  'new guardian row is stored'
);
select is(
  (
    select count(*)::integer
    from public.student_guardians sg
    join public.students s on s.id = sg.student_id
    join public.guardians g on g.id = sg.guardian_id
    where s.full_name = 'Student with new guardian'
      and g.full_name = 'New guardian'
      and sg.is_primary
      and sg.is_billing_contact
  ),
  1,
  'new guardian is linked as primary and billing contact'
);

select throws_ok(
  $$select public.crm_create_student_with_guardians(
    '92000000-0000-4000-8000-000000000010',
    '{"full_name":"Invalid status student","status":"not-a-status"}'::jsonb,
    '[{"full_name":"Invalid status guardian","relation":"Родитель","is_primary":true,"is_billing_contact":true}]'::jsonb,
    null
  )$$
);
select is(
  (select count(*)::integer from public.students where full_name = 'Invalid status student'),
  0,
  'invalid status leaves no student row'
);
select is(
  (select count(*)::integer from public.guardians where full_name = 'Invalid status guardian'),
  0,
  'invalid status leaves no guardian row'
);

select * from finish();
rollback;
