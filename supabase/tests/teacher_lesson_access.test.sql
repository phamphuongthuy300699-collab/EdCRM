begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('93000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','manager@trial.test','',now(),'{}','{}',now(),now()),
  ('93000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','teacher-one@trial.test','',now(),'{}','{}',now(),now()),
  ('93000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','teacher-two@trial.test','',now(),'{}','{}',now(),now()),
  ('93000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-manager@trial.test','',now(),'{}','{}',now(),now()),
  ('93000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@trial.test','',now(),'{}','{}',now(),now());

insert into public.organizations (id, name, slug) values
  ('93000000-0000-4000-8000-000000000010','Trial tenant','trial-tenant'),
  ('93000000-0000-4000-8000-000000000011','Other trial tenant','other-trial-tenant');
insert into public.profiles (id, full_name) values
  ('93000000-0000-4000-8000-000000000001','Trial manager'),
  ('93000000-0000-4000-8000-000000000002','Teacher One'),
  ('93000000-0000-4000-8000-000000000003','Teacher Two'),
  ('93000000-0000-4000-8000-000000000004','Other manager'),
  ('93000000-0000-4000-8000-000000000005','Trial admin');
insert into public.org_memberships (organization_id, user_id, role) values
  ('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','manager'),
  ('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000002','teacher'),
  ('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000003','teacher'),
  ('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000005','admin'),
  ('93000000-0000-4000-8000-000000000011','93000000-0000-4000-8000-000000000004','manager');

insert into public.branches (id, organization_id, name) values
  ('93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000010','Main branch'),
  ('93000000-0000-4000-8000-000000000021','93000000-0000-4000-8000-000000000010','Second branch'),
  ('93000000-0000-4000-8000-000000000022','93000000-0000-4000-8000-000000000011','Other branch');
insert into public.rooms (id, organization_id, branch_id, name, capacity) values
  ('93000000-0000-4000-8000-000000000030','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000020','Main room',4),
  ('93000000-0000-4000-8000-000000000031','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000020','Small room',1),
  ('93000000-0000-4000-8000-000000000032','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000020','No canonical limit',null),
  ('93000000-0000-4000-8000-000000000033','93000000-0000-4000-8000-000000000011','93000000-0000-4000-8000-000000000022','Other room',8);
insert into public.courses (id, organization_id, title, slug) values
  ('93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000010','Trial course','trial-course'),
  ('93000000-0000-4000-8000-000000000041','93000000-0000-4000-8000-000000000011','Other course','other-trial-course');
insert into public.groups (id, organization_id, course_id, branch_id, room_id, teacher_id, title, status, capacity) values
  ('93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000030','93000000-0000-4000-8000-000000000002','Capacity three','active',3),
  ('93000000-0000-4000-8000-000000000051','93000000-0000-4000-8000-000000000011','93000000-0000-4000-8000-000000000041','93000000-0000-4000-8000-000000000022','93000000-0000-4000-8000-000000000033',null,'Other group','active',8);

insert into public.students (id, organization_id, full_name, status) values
  ('93000000-0000-4000-8000-000000000060','93000000-0000-4000-8000-000000000010','Enrolled Student','active'),
  ('93000000-0000-4000-8000-000000000061','93000000-0000-4000-8000-000000000010','Makeup Student','active'),
  ('93000000-0000-4000-8000-000000000062','93000000-0000-4000-8000-000000000010','Trial Student','prospect'),
  ('93000000-0000-4000-8000-000000000063','93000000-0000-4000-8000-000000000011','Other Student','active');
insert into public.leads (id, organization_id, parent_name, parent_phone, child_name, status) values
  ('93000000-0000-4000-8000-000000000070','93000000-0000-4000-8000-000000000010','Lead One Parent','+70000000001','Lead One','contacted'),
  ('93000000-0000-4000-8000-000000000071','93000000-0000-4000-8000-000000000010','Lead Two Parent','+70000000002','Lead Two','lost'),
  ('93000000-0000-4000-8000-000000000072','93000000-0000-4000-8000-000000000010','Converted Parent','+70000000003','Converted Lead','converted'),
  ('93000000-0000-4000-8000-000000000073','93000000-0000-4000-8000-000000000011','Other Parent','+70000000004','Other Lead','new');
update public.leads
set student_id = '93000000-0000-4000-8000-000000000062'
where id = '93000000-0000-4000-8000-000000000072';
insert into public.enrollments (organization_id, student_id, group_id, status, started_on)
values ('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000060','93000000-0000-4000-8000-000000000050','active',current_date);

insert into public.lesson_sessions (id, organization_id, group_id, course_id, teacher_id, room_id, starts_at, ends_at, lesson_date, status, session_kind) values
  ('93000000-0000-4000-8000-000000000080','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000030','2099-09-01 09:00+03','2099-09-01 10:00+03','2099-09-01','planned','regular'),
  ('93000000-0000-4000-8000-000000000081','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000030','2099-09-01 12:00+03','2099-09-01 13:00+03','2099-09-01','planned','regular'),
  ('93000000-0000-4000-8000-000000000082','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000030','2099-09-02 14:00+03','2099-09-02 15:00+03','2099-09-02','planned','regular'),
  ('93000000-0000-4000-8000-000000000083','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000030','2020-08-20 09:00+03','2020-08-20 10:00+03','2020-08-20','completed','regular');
insert into public.attendance (id, organization_id, group_id, student_id, lesson_session_id, lesson_date, is_present, attendance_status)
values ('93000000-0000-4000-8000-000000000084','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000061','93000000-0000-4000-8000-000000000083','2020-08-20',false,'absent_excused');
insert into public.makeup_assignments (id, organization_id, source_attendance_id, student_id, target_session_id, status)
values ('93000000-0000-4000-8000-000000000085','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000084','93000000-0000-4000-8000-000000000061','93000000-0000-4000-8000-000000000080','scheduled');
insert into public.attendance (id, organization_id, group_id, student_id, lesson_session_id, lesson_date, is_present, attendance_status)
values ('93000000-0000-4000-8000-000000000090','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000062','93000000-0000-4000-8000-000000000083','2020-08-20',false,'absent_excused');
insert into public.makeup_assignments (id, organization_id, source_attendance_id, student_id, status)
values ('93000000-0000-4000-8000-000000000091','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000090','93000000-0000-4000-8000-000000000062','requested');

create temporary table trial_side_effect_baseline as
select
  (select count(*) from public.enrollments) enrollments,
  (select count(*) from public.attendance) attendance,
  (select count(*) from public.invoices) invoices,
  (select count(*) from public.payments) payments,
  (select count(*) from public.billing_accounts) billing_accounts,
  (select count(*) from public.teacher_payroll_entries) payroll,
  (select count(*) from public.homework_assignments) homework;

select lives_ok($$select crm_create_trial_event('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000002','attached_session','93000000-0000-4000-8000-000000000081',null,null,null,null,null,'[{"lead_id":"93000000-0000-4000-8000-000000000070"}]')$$,'teacher adds a lead to own lesson using canonical trial algorithm');
select throws_ok($$select crm_create_trial_event('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000003','attached_session','93000000-0000-4000-8000-000000000081',null,null,null,null,null,'[{"lead_id":"93000000-0000-4000-8000-000000000071"}]')$$,'P0001','trial_actor_forbidden','teacher cannot add to another teacher lesson');
select throws_ok($$select crm_create_trial_event('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000002','standalone',null,'93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000020',null,now(),now()+interval '1 hour','[{"lead_id":"93000000-0000-4000-8000-000000000071"}]')$$,'P0001','trial_actor_forbidden','teacher does not receive standalone scheduling privileges');
update lesson_sessions set starts_at=now()-interval '2 days',ends_at=now()-interval '2 days'+interval '1 hour',lesson_date=current_date-2 where id='93000000-0000-4000-8000-000000000082';
select lives_ok($$select save_lesson_attendance('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000082','93000000-0000-4000-8000-000000000002',false,'[{"student_id":"93000000-0000-4000-8000-000000000060","status":"present"}]')$$,'unstarted past lesson accepts own attendance');
select is((select status::text from lesson_sessions where id='93000000-0000-4000-8000-000000000082'),'live','explicit attendance starts the forgotten lesson atomically');
select throws_ok($$select save_lesson_attendance('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000081','93000000-0000-4000-8000-000000000002',false,'[]')$$,'P0001','session_not_started_yet','future lesson cannot be marked early');
select is((select count(*)::int from teacher_payroll_entries where organization_id='93000000-0000-4000-8000-000000000010'),0,'attendance does not create salary');
select is((select count(*)::int from billing_ledger_entries where organization_id='93000000-0000-4000-8000-000000000010'),0,'attendance does not charge parents');
insert into teacher_payroll_entries(organization_id,lesson_session_id,teacher_id,attendee_count,rate_snapshot,amount,status)
values('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000083','93000000-0000-4000-8000-000000000002',1,2500,2500,'paid');
create temporary table payroll_before as select to_jsonb(p) row from teacher_payroll_entries p where organization_id='93000000-0000-4000-8000-000000000010';
select lives_ok($$select save_lesson_attendance('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000083','93000000-0000-4000-8000-000000000002',false,'[{"student_id":"93000000-0000-4000-8000-000000000061","status":"present"}]')$$,'completed history accepts correction for its historical student');
select is((select attendance_status from attendance where id='93000000-0000-4000-8000-000000000084'),'present','historical attendance changes');
select is((select status::text from lesson_sessions where id='93000000-0000-4000-8000-000000000083'),'completed','correction never reopens completed lesson');
select is((select count(*)::int from audit_log where entity_id='93000000-0000-4000-8000-000000000083' and action='correct_completed_attendance'),1,'completed correction is audited');
select is((select count(*)::int from teacher_payroll_entries where organization_id='93000000-0000-4000-8000-000000000010'),1,'correction does not create payroll');
select is((select count(*)::int from billing_ledger_entries where organization_id='93000000-0000-4000-8000-000000000010'),0,'correction does not create debits');
select throws_ok($$select save_lesson_attendance('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000083','93000000-0000-4000-8000-000000000003',false,'[]')$$,'P0001','foreign_teacher_session','another teacher cannot correct history');
select lives_ok($$select crm_add_teacher_walkin('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000081','93000000-0000-4000-8000-000000000099','Walk In','','')$$,'new child is recorded atomically as trial lead');
select lives_ok($$select crm_add_teacher_walkin('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000081','93000000-0000-4000-8000-000000000099','Walk In','','')$$,'retry does not duplicate a walk-in');
select is((select count(*)::int from trial_participants where lead_id='93000000-0000-4000-8000-000000000099'),1,'one participant after retry');
select throws_like($$select crm_add_teacher_walkin('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000081','93000000-0000-4000-8000-000000000098','Over Capacity','','')$$,'%trial_capacity_exceeded%','walk-in respects capacity');
select is((select count(*)::int from leads where id='93000000-0000-4000-8000-000000000098'),0,'capacity error leaves no orphan lead');
update lesson_sessions set starts_at=now()-interval '15 minutes',ends_at=now()+interval '45 minutes',lesson_date=current_date where id='93000000-0000-4000-8000-000000000080';
select lives_ok($$select crm_start_due_lessons()$$,'timer starts due lessons');
select is((select status::text from lesson_sessions where id='93000000-0000-4000-8000-000000000080'),'live','due lesson starts automatically');
select ok((select started_at=starts_at and materials_unlocked from lesson_sessions where id='93000000-0000-4000-8000-000000000080'),'scheduled start time and material unlock recorded');
select is((select status::text from lesson_sessions where id='93000000-0000-4000-8000-000000000081'),'planned','future lesson is not started');
select is(crm_start_due_lessons(),0,'second timer call is idempotent');
select ok(not has_function_privilege('authenticated','public.crm_start_due_lessons()','execute'),'browser cannot invoke global timer');
select is((select count(*)::int from teacher_payroll_entries where organization_id='93000000-0000-4000-8000-000000000010'),1,'timer does not create salary');
select is((select count(*)::int from billing_ledger_entries where organization_id='93000000-0000-4000-8000-000000000010'),0,'timer does not charge parents');
select is((select to_jsonb(p) from teacher_payroll_entries p where organization_id='93000000-0000-4000-8000-000000000010'),(select row from payroll_before),'paid salary record is byte-for-byte unchanged');
select * from finish();
rollback;
