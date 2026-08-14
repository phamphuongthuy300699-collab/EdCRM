begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

select ok(
  exists(select 1 from public.profiles where id = 'a2222222-e222-3333-4444-555555555555'),
  'production legacy teacher profile exists with a PostgreSQL UUID'
);
select ok(
  exists(
    select 1 from public.org_memberships
    where organization_id = 'a3848a60-a292-491a-85eb-7f2824cf4e77'
      and user_id = 'a2222222-e222-3333-4444-555555555555'
      and role = 'teacher'
      and is_active
  ),
  'legacy teacher keeps the canonical active membership'
);
select is(
  (select count(*)::integer from auth.users where id = 'a2222222-e222-3333-4444-555555555555'),
  0,
  'legacy teacher profile does not require a same-id Auth row'
);

insert into public.courses (id, organization_id, title, slug)
values (
  '95000000-0000-4000-8000-000000000010',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Production-shape legacy course',
  'production-shape-legacy-course'
);
insert into public.groups (id, organization_id, course_id, teacher_id, title, status)
values (
  'fc65dfe3-934f-423f-a8f9-07319c37a0a1',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  '95000000-0000-4000-8000-000000000010',
  'a2222222-e222-3333-4444-555555555555',
  '1 группа (соревновательная)',
  'draft'
);

select is(
  (select teacher_id from public.groups where id = 'fc65dfe3-934f-423f-a8f9-07319c37a0a1'),
  'a2222222-e222-3333-4444-555555555555'::uuid,
  'draft group stores the legacy canonical teacher UUID'
);
select is(
  (select status::text from public.groups where id = 'fc65dfe3-934f-423f-a8f9-07319c37a0a1'),
  'draft',
  'production-shape group starts as draft'
);
select is(
  (select count(*)::integer from public.group_schedule_rules where group_id = 'fc65dfe3-934f-423f-a8f9-07319c37a0a1'),
  0,
  'production-shape group may start without schedule rules'
);

select lives_ok(
  $$select public.save_group_with_schedule(
    'a3848a60-a292-491a-85eb-7f2824cf4e77',
    'fc65dfe3-934f-423f-a8f9-07319c37a0a1',
    '{"title":"1 группа (соревновательная)","course_id":"95000000-0000-4000-8000-000000000010","status":"active"}'::jsonb,
    null,
    true
  )$$,
  'status-only save accepts an omitted schedule'
);
select is(
  (select status::text from public.groups where id = 'fc65dfe3-934f-423f-a8f9-07319c37a0a1'),
  'active',
  'status-only save updates the group'
);
select is(
  (select count(*)::integer from public.group_schedule_rules where group_id = 'fc65dfe3-934f-423f-a8f9-07319c37a0a1'),
  0,
  'status-only save leaves a zero-rule group without invented rules'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('95000000-0000-4000-8000-000000000020', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'modern-shape@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('95000000-0000-4000-8000-000000000021', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'legacy-shape-login@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
insert into public.profiles (id, full_name)
values ('95000000-0000-4000-8000-000000000020', 'Modern production-shape staff');
insert into public.org_memberships (organization_id, user_id, role, is_active)
values (
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  '95000000-0000-4000-8000-000000000020',
  'admin',
  true
);
insert into public.staff_auth_identities (organization_id, staff_profile_id, auth_user_id)
values
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', '95000000-0000-4000-8000-000000000020', '95000000-0000-4000-8000-000000000020'),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'a2222222-e222-3333-4444-555555555555', '95000000-0000-4000-8000-000000000021');

select is(
  (select staff_profile_id from public.staff_auth_identities where auth_user_id = '95000000-0000-4000-8000-000000000020'),
  '95000000-0000-4000-8000-000000000020'::uuid,
  'modern staff supports equal Auth and profile identifiers'
);
select isnt(
  (select auth_user_id from public.staff_auth_identities where staff_profile_id = 'a2222222-e222-3333-4444-555555555555'),
  'a2222222-e222-3333-4444-555555555555'::uuid,
  'mapped legacy staff uses a distinct Auth identifier'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-000000000021', true);
select is(
  public.current_staff_profile_id('a3848a60-a292-491a-85eb-7f2824cf4e77'),
  'a2222222-e222-3333-4444-555555555555'::uuid,
  'mapped production-shape login resolves the legacy canonical profile'
);
select ok(
  public.is_teacher_of_group('fc65dfe3-934f-423f-a8f9-07319c37a0a1'),
  'mapped legacy teacher is authorized for the production-shape group'
);

reset role;
select ok(
  pg_typeof((select status from public.students limit 1)) = 'text'::regtype,
  'post-client full chain uses the text student lifecycle status'
);
select ok(
  not exists(
    select 1 from public.group_schedule_rules
    where group_id = 'fc65dfe3-934f-423f-a8f9-07319c37a0a1'
  ),
  'identity mapping does not invent schedule rules for legacy groups'
);

select * from finish();
rollback;
