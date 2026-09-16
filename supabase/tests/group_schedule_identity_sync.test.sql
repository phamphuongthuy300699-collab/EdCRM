begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into public.organizations(id,name,slug) values ('96000000-0000-4000-8000-000000000001','Schedule sync regression','schedule-sync-regression');
insert into public.profiles(id,full_name) values
 ('96000000-0000-4000-8000-000000000002','Teacher A'),
 ('96000000-0000-4000-8000-000000000003','Teacher B');
insert into public.org_memberships(organization_id,user_id,role) values
 ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000002','teacher'),
 ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000003','teacher');
insert into public.courses(id,organization_id,title,slug) values ('96000000-0000-4000-8000-000000000004','96000000-0000-4000-8000-000000000001','Sync course','sync-course');
insert into public.groups(id,organization_id,course_id,teacher_id,title,status,starts_on,ends_on) values
 ('96000000-0000-4000-8000-000000000005','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000004','96000000-0000-4000-8000-000000000002','Sync group','active',current_date-30,current_date-1);
insert into public.group_schedule_rules(organization_id,group_id,weekday,starts_at,ends_at) values
 ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000005',6,'15:00','16:00');
insert into public.lesson_sessions(id,organization_id,group_id,course_id,teacher_id,starts_at,ends_at,lesson_date,status) values
 ('96000000-0000-4000-8000-000000000006','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000005','96000000-0000-4000-8000-000000000004','96000000-0000-4000-8000-000000000002',now()-interval '7 days',now()-interval '7 days'+interval '1 hour',current_date-7,'completed');
select throws_ok($$select replace_group_schedule('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000005','[{"weekday":6,"starts_at":"13:30","ends_at":"14:30"}]',true)$$,'P0001','group_schedule_expired','expired active group cannot silently save an empty future schedule');
select is((select starts_at::text from group_schedule_rules where group_id='96000000-0000-4000-8000-000000000005'),'15:00:00','rejected save preserves original rules');
select lives_ok($$select save_group_with_schedule('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000005','{"ends_on":null}',null,true)$$,'clearing the expired end date regenerates unchanged weekly rules');
select ok((select count(*)>0 from lesson_sessions where group_id='96000000-0000-4000-8000-000000000005' and starts_at>now()),'future lessons exist after date-only update');
select lives_ok($$select save_group_with_schedule('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000005','{"teacher_id":"96000000-0000-4000-8000-000000000003"}',null,true)$$,'teacher-only edit synchronizes generated lessons');
select ok((select count(*)>0 from lesson_sessions where group_id='96000000-0000-4000-8000-000000000005' and starts_at>now() and teacher_id='96000000-0000-4000-8000-000000000003'),'new teacher has future lessons');
select is((select count(*)::int from lesson_sessions where group_id='96000000-0000-4000-8000-000000000005' and starts_at>now() and teacher_id='96000000-0000-4000-8000-000000000002'),0,'old teacher no longer has generated future lessons');
select is((select teacher_id::text from lesson_sessions where id='96000000-0000-4000-8000-000000000006'),'96000000-0000-4000-8000-000000000002','completed history keeps its teacher and ID');
create temporary table before_metadata_edit as select id from lesson_sessions where group_id='96000000-0000-4000-8000-000000000005';
select lives_ok($$select save_group_with_schedule('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000005','{"title":"Renamed only"}',null,true)$$,'unrelated metadata can be saved');
select is((select count(*)::int from before_metadata_edit b left join lesson_sessions s on s.id=b.id where s.id is null),0,'metadata-only save preserves lesson IDs');
select throws_ok($$select save_group_with_schedule('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000005',jsonb_build_object('starts_on',current_date+10,'ends_on',current_date+1),null,true)$$,'P0001','group_date_range_invalid','reversed bounds are rejected atomically');
select lives_ok($$select save_group_with_schedule('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000005','{}','[{"weekday":3,"starts_at":"18:00","ends_at":"19:00"},{"weekday":6,"starts_at":"11:30","ends_at":"13:00"}]',true)$$,'admin can change weekly times after teacher/date edits');
select ok((select count(*)>0 and bool_and(teacher_id='96000000-0000-4000-8000-000000000003' and case extract(isodow from starts_at at time zone 'Europe/Moscow') when 3 then (starts_at at time zone 'Europe/Moscow')::time='18:00'::time and ends_at-starts_at=interval '1 hour' when 6 then (starts_at at time zone 'Europe/Moscow')::time='11:30'::time and ends_at-starts_at=interval '90 minutes' else false end) from lesson_sessions where group_id='96000000-0000-4000-8000-000000000005' and starts_at>now()),'new times and durations remain linked to the assigned teacher');
-- Explicit opt-out must not silently change individual lessons.
select lives_ok($$select save_group_with_schedule('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000005','{"teacher_id":"96000000-0000-4000-8000-000000000002"}',null,false)$$,'explicit no-rebuild remains supported');
select ok((select count(*)>0 from lesson_sessions where group_id='96000000-0000-4000-8000-000000000005' and starts_at>now() and teacher_id='96000000-0000-4000-8000-000000000003'),'no-rebuild preserves previously scheduled teacher');
select * from finish();
rollback;
