-- Additive client lifecycle and unified CRM follow-ups.

alter table public.guardians
  add column if not exists source text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists interest_notes text,
  add column if not exists responsible_manager_id uuid references public.profiles(id) on delete set null;
alter table public.guardians drop constraint if exists guardians_status_check;
alter table public.guardians add constraint guardians_status_check
  check (status in ('prospect','active','inactive','do_not_contact','archived'));

alter table public.students alter column status drop default;
alter table public.students alter column status type text using status::text;
alter table public.students alter column status set default 'active';
alter table public.students drop constraint if exists students_status_check;
alter table public.students add constraint students_status_check
  check (status in ('prospect','active','paused','inactive','archived'));

create unique index if not exists idx_student_guardians_one_primary
  on public.student_guardians (organization_id, student_id) where is_primary = true;

alter table public.lead_interactions alter column lead_id drop not null;
alter table public.lead_interactions
  add column if not exists guardian_id uuid references public.guardians(id) on delete set null,
  add column if not exists student_id uuid references public.students(id) on delete set null,
  add column if not exists next_action_completed_at timestamptz,
  add column if not exists completed_by uuid references public.profiles(id) on delete set null;
alter table public.lead_interactions drop constraint if exists lead_interactions_subject_required;
alter table public.lead_interactions add constraint lead_interactions_subject_required
  check (lead_id is not null or guardian_id is not null or student_id is not null);
create index if not exists idx_crm_interactions_org_next_action
  on public.lead_interactions (organization_id, next_action_at) where next_action_completed_at is null;
create index if not exists idx_crm_interactions_guardian_created
  on public.lead_interactions (organization_id, guardian_id, created_at desc) where guardian_id is not null;
create index if not exists idx_crm_interactions_student_created
  on public.lead_interactions (organization_id, student_id, created_at desc) where student_id is not null;

create or replace function public.enforce_crm_interaction_tenant()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.guardian_id is not null and not exists (
    select 1 from public.guardians where id=new.guardian_id and organization_id=new.organization_id
  ) then raise exception 'interaction_guardian_wrong_organization'; end if;
  if new.student_id is not null and not exists (
    select 1 from public.students where id=new.student_id and organization_id=new.organization_id
  ) then raise exception 'interaction_student_wrong_organization'; end if;
  if new.lead_id is not null and not exists (
    select 1 from public.leads where id=new.lead_id and organization_id=new.organization_id
  ) then raise exception 'interaction_lead_wrong_organization'; end if;
  return new;
end $$;
drop trigger if exists trg_enforce_crm_interaction_tenant on public.lead_interactions;
create trigger trg_enforce_crm_interaction_tenant
before insert or update of organization_id,guardian_id,student_id,lead_id on public.lead_interactions
for each row execute function public.enforce_crm_interaction_tenant();

create or replace function public.enforce_guardian_responsible_manager()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.responsible_manager_id is not null and not exists (
    select 1 from public.org_memberships
    where organization_id=new.organization_id
      and user_id=new.responsible_manager_id
      and is_active=true
      and role in ('owner','admin','manager')
  ) then raise exception 'guardian_responsible_manager_not_active_staff'; end if;
  return new;
end $$;
drop trigger if exists trg_enforce_guardian_responsible_manager on public.guardians;
create trigger trg_enforce_guardian_responsible_manager
before insert or update of organization_id,responsible_manager_id on public.guardians
for each row execute function public.enforce_guardian_responsible_manager();

alter table public.leads
  add column if not exists guardian_id uuid references public.guardians(id) on delete set null,
  add column if not exists student_id uuid references public.students(id) on delete set null;
update public.leads set guardian_id=converted_guardian_id where guardian_id is null and converted_guardian_id is not null;
update public.leads set student_id=converted_student_id where student_id is null and converted_student_id is not null;

create or replace function public.crm_create_student_with_guardians(
  p_organization_id uuid, p_student jsonb, p_guardians jsonb default '[]'::jsonb, p_group_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_student_id uuid; item jsonb; v_guardian_id uuid; v_link jsonb; links jsonb:='[]'; primary_count int; billing_count int;
begin
  if p_organization_id is null then raise exception 'organization_required'; end if;
  if nullif(trim(p_student->>'full_name'),'') is null then raise exception 'student_name_required'; end if;
  if jsonb_typeof(coalesce(p_guardians,'[]')) <> 'array' then raise exception 'guardians_must_be_array'; end if;
  select count(*) into primary_count from jsonb_array_elements(coalesce(p_guardians,'[]')) x where coalesce((x->>'is_primary')::boolean,false);
  select count(*) into billing_count from jsonb_array_elements(coalesce(p_guardians,'[]')) x where coalesce((x->>'is_billing_contact')::boolean,false);
  if primary_count > 1 then raise exception 'maximum_one_primary'; end if;
  if billing_count > 1 then raise exception 'maximum_one_billing_contact'; end if;
  if p_group_id is not null and not exists(select 1 from public.groups where id=p_group_id and organization_id=p_organization_id and status='active' and deleted_at is null) then raise exception 'group_not_found_or_inactive'; end if;
  insert into public.students(organization_id,full_name,birth_date,status,notes)
  values(p_organization_id,trim(p_student->>'full_name'),nullif(p_student->>'birth_date','')::date,coalesce(nullif(p_student->>'status',''),'prospect'),nullif(p_student->>'notes','')) returning id into v_student_id;
  for item in select value from jsonb_array_elements(coalesce(p_guardians,'[]')) loop
    v_guardian_id:=nullif(item->>'guardian_id','')::uuid;
    if v_guardian_id is null then
      if nullif(trim(item->>'full_name'),'') is null then raise exception 'guardian_name_required'; end if;
      insert into public.guardians(organization_id,full_name,phone,email,status)
      values(p_organization_id,trim(item->>'full_name'),nullif(item->>'phone',''),nullif(item->>'email',''),'prospect') returning id into v_guardian_id;
    end if;
    v_link:=public.crm_link_student_guardian(p_organization_id,v_student_id,v_guardian_id,coalesce(nullif(item->>'relation',''),'Родитель'),coalesce((item->>'is_primary')::boolean,false),coalesce((item->>'is_billing_contact')::boolean,false));
    links:=links||jsonb_build_object('guardian_id',v_guardian_id,'student_guardian_id',v_link->>'student_guardian_id');
  end loop;
  if p_group_id is not null then insert into public.enrollments(organization_id,student_id,group_id,status,started_on) values(p_organization_id,v_student_id,p_group_id,'active',current_date); end if;
  return jsonb_build_object('student_id',v_student_id,'guardians',links);
end $$;

create or replace function public.crm_link_student_guardian(
 p_organization_id uuid,p_student_id uuid,p_guardian_id uuid,p_relation text default 'Родитель',p_is_primary boolean default false,p_is_billing_contact boolean default false
) returns jsonb language plpgsql security definer set search_path=public as $$
declare link_id uuid;
begin
  perform 1 from public.students where id=p_student_id and organization_id=p_organization_id and deleted_at is null for update;
  if not found then raise exception 'student_not_found'; end if;
  perform 1 from public.guardians where id=p_guardian_id and organization_id=p_organization_id and deleted_at is null and anonymized_at is null and merged_into_guardian_id is null;
  if not found then raise exception 'guardian_not_found'; end if;
  if exists(select 1 from public.student_guardians where organization_id=p_organization_id and student_id=p_student_id and guardian_id=p_guardian_id) then raise exception 'student_guardian_already_exists'; end if;
  if p_is_primary then update public.student_guardians set is_primary=false where organization_id=p_organization_id and student_id=p_student_id and is_primary; end if;
  if p_is_billing_contact then update public.student_guardians set is_billing_contact=false where organization_id=p_organization_id and student_id=p_student_id and is_billing_contact; end if;
  insert into public.student_guardians(organization_id,student_id,guardian_id,relation,is_primary,is_billing_contact)
  values(p_organization_id,p_student_id,p_guardian_id,nullif(trim(p_relation),''),p_is_primary,p_is_billing_contact) returning id into link_id;
  return jsonb_build_object('student_guardian_id',link_id,'student_id',p_student_id,'guardian_id',p_guardian_id);
end $$;

create or replace function public.crm_create_guardian_and_link_student(
 p_organization_id uuid,p_student_id uuid,p_guardian jsonb,p_relation text default 'Родитель',p_is_primary boolean default false,p_is_billing_contact boolean default false
) returns jsonb language plpgsql security definer set search_path=public as $$
declare guardian_id uuid;
begin
  if nullif(trim(p_guardian->>'full_name'),'') is null then raise exception 'guardian_name_required'; end if;
  insert into public.guardians(organization_id,full_name,phone,email,status,source,interest_notes)
  values(p_organization_id,trim(p_guardian->>'full_name'),nullif(p_guardian->>'phone',''),nullif(p_guardian->>'email',''),coalesce(nullif(p_guardian->>'status',''),'prospect'),nullif(p_guardian->>'source',''),nullif(p_guardian->>'interest_notes',''))
  returning id into guardian_id;
  return public.crm_link_student_guardian(p_organization_id,p_student_id,guardian_id,p_relation,p_is_primary,p_is_billing_contact);
end $$;

create or replace function public.crm_complete_followup(p_organization_id uuid,p_interaction_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.lead_interactions%rowtype;
begin
 update public.lead_interactions set next_action_completed_at=coalesce(next_action_completed_at,now()),completed_by=p_actor_id
 where id=p_interaction_id and organization_id=p_organization_id returning * into saved;
 if not found then raise exception 'interaction_not_found'; end if;
 return jsonb_build_object('interaction_id',saved.id,'completed_at',saved.next_action_completed_at);
end $$;

create or replace function public.crm_record_interaction(
  p_organization_id uuid,
  p_guardian_id uuid,
  p_student_id uuid,
  p_lead_id uuid,
  p_actor_id uuid,
  p_type text,
  p_result text,
  p_summary text,
  p_next_action_at timestamptz,
  p_complete_interaction_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.lead_interactions%rowtype;
begin
  if p_complete_interaction_id is not null then
    update public.lead_interactions
       set next_action_completed_at=coalesce(next_action_completed_at,now()), completed_by=p_actor_id
     where id=p_complete_interaction_id and organization_id=p_organization_id and next_action_completed_at is null;
    if not found then raise exception 'followup_not_found_or_completed'; end if;
  end if;
  insert into public.lead_interactions(
    organization_id,guardian_id,student_id,lead_id,manager_id,type,result,summary,next_action_at
  ) values (
    p_organization_id,p_guardian_id,p_student_id,p_lead_id,p_actor_id,p_type::public.lead_interaction_type,p_result::public.lead_interaction_result,p_summary,p_next_action_at
  ) returning * into saved;
  return jsonb_build_object('interaction_id',saved.id,'completed_interaction_id',p_complete_interaction_id);
end $$;

create or replace function public.crm_followup_queue(p_organization_id uuid)
returns table(interaction_id uuid,guardian_id uuid,student_id uuid,lead_id uuid,next_action_at timestamptz,summary text) language sql stable security invoker set search_path=public as $$
 select i.id,i.guardian_id,i.student_id,i.lead_id,i.next_action_at,i.summary
 from public.lead_interactions i left join public.guardians g on g.id=i.guardian_id and g.organization_id=i.organization_id
 where i.organization_id=p_organization_id and i.next_action_at is not null and i.next_action_completed_at is null
   and coalesce(g.status,'active') not in ('do_not_contact','archived') and g.deleted_at is null
 order by i.next_action_at;
$$;

create or replace function public.move_merged_guardian_interactions() returns trigger language plpgsql set search_path=public as $$
begin
 if new.merged_into_guardian_id is not null and new.merged_into_guardian_id is distinct from old.merged_into_guardian_id then
   update public.lead_interactions set guardian_id=new.merged_into_guardian_id where organization_id=new.organization_id and guardian_id=new.id;
 end if;
 return new;
end $$;
drop trigger if exists trg_move_merged_guardian_interactions on public.guardians;
create trigger trg_move_merged_guardian_interactions before update of merged_into_guardian_id on public.guardians for each row execute function public.move_merged_guardian_interactions();

revoke all on function public.crm_create_student_with_guardians(uuid,jsonb,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.crm_link_student_guardian(uuid,uuid,uuid,text,boolean,boolean) from public,anon,authenticated;
revoke all on function public.crm_create_guardian_and_link_student(uuid,uuid,jsonb,text,boolean,boolean) from public,anon,authenticated;
revoke all on function public.crm_complete_followup(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.crm_record_interaction(uuid,uuid,uuid,uuid,uuid,text,text,text,timestamptz,uuid) from public,anon,authenticated;
revoke all on function public.crm_followup_queue(uuid) from public,anon,authenticated;
grant execute on function public.crm_create_student_with_guardians(uuid,jsonb,jsonb,uuid) to service_role;
grant execute on function public.crm_link_student_guardian(uuid,uuid,uuid,text,boolean,boolean) to service_role;
grant execute on function public.crm_create_guardian_and_link_student(uuid,uuid,jsonb,text,boolean,boolean) to service_role;
grant execute on function public.crm_complete_followup(uuid,uuid,uuid) to service_role;
grant execute on function public.crm_record_interaction(uuid,uuid,uuid,uuid,uuid,text,text,text,timestamptz,uuid) to service_role;
grant execute on function public.crm_followup_queue(uuid) to service_role;

create or replace function public.convert_lead_to_student(p_lead_id uuid,p_group_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_lead public.leads%rowtype;v_guardian_id uuid;v_student_id uuid;v_enrollment_id uuid;
begin
 perform pg_advisory_xact_lock(hashtext(p_lead_id::text));select * into v_lead from public.leads where id=p_lead_id for update;if not found then raise exception 'lead_not_found';end if;
 if v_lead.status='converted' and v_lead.converted_guardian_id is not null and v_lead.converted_student_id is not null then return jsonb_build_object('ok',true,'alreadyConverted',true,'guardianId',v_lead.converted_guardian_id,'studentId',v_lead.converted_student_id);end if;
 select id into v_guardian_id from public.guardians where organization_id=v_lead.organization_id and deleted_at is null and anonymized_at is null and merged_into_guardian_id is null and status<>'archived' and (
  (phone_normalized is not null and phone_normalized = public.normalize_ru_phone(v_lead.parent_phone)) or
  (email_normalized is not null and email_normalized = nullif(lower(trim(v_lead.parent_email)),''))) order by created_at limit 1 for update;
 if v_guardian_id is null then insert into public.guardians(organization_id,full_name,phone,email,status,source,interest_notes,notes) values(v_lead.organization_id,v_lead.parent_name,v_lead.parent_phone,v_lead.parent_email,'prospect',v_lead.source,v_lead.message,'Создан из заявки '||v_lead.id) returning id into v_guardian_id;end if;
 insert into public.students(organization_id,full_name,status,notes) values(v_lead.organization_id,coalesce(nullif(v_lead.child_name,''),v_lead.parent_name||' — ребёнок'),'prospect','Создан из заявки '||v_lead.id) returning id into v_student_id;
 perform public.crm_link_student_guardian(v_lead.organization_id,v_student_id,v_guardian_id,'Родитель',true,true);
 if p_group_id is not null then insert into public.enrollments(organization_id,student_id,group_id,status,started_on) values(v_lead.organization_id,v_student_id,p_group_id,'active',current_date) returning id into v_enrollment_id;end if;
 update public.leads set status='converted',converted_guardian_id=v_guardian_id,converted_student_id=v_student_id,guardian_id=v_guardian_id,student_id=v_student_id,updated_at=now() where id=p_lead_id;
 update public.lead_interactions set guardian_id=v_guardian_id,student_id=v_student_id where organization_id=v_lead.organization_id and lead_id=p_lead_id;
 return jsonb_build_object('ok',true,'alreadyConverted',false,'guardianId',v_guardian_id,'studentId',v_student_id,'enrollmentId',v_enrollment_id);
end $$;
revoke all on function public.convert_lead_to_student(uuid,uuid) from public,anon,authenticated;
grant execute on function public.convert_lead_to_student(uuid,uuid) to service_role;
