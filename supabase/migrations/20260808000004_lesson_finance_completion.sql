-- Extend the existing lifecycle boundary: attendance, makeup, lesson debits,
-- guardian balances, payroll snapshots and final status commit together.
create or replace function public.transition_lesson_session(
  p_organization_id uuid,
  p_session_id uuid,
  p_actor_id uuid,
  p_action text,
  p_is_admin boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  target_session public.lesson_sessions%rowtype;
  target_group public.groups%rowtype;
  attendance_row record;
  billing_guardian uuid;
  target_account public.billing_accounts%rowtype;
  saved_entry uuid;
  should_charge boolean;
  is_makeup boolean;
  source_attendance_id uuid;
  debit_count integer := 0;
  warning_count integer := 0;
  attendee_count integer := 0;
  teacher_rate numeric(12,2);
begin
  select * into target_session from public.lesson_sessions
    where id=p_session_id and organization_id=p_organization_id for update;
  if not found then raise exception 'session_not_found'; end if;
  if not p_is_admin and (target_session.teacher_id is null or target_session.teacher_id<>p_actor_id) then raise exception 'foreign_teacher_session'; end if;

  if p_action='start' then
    if target_session.status='live' then return jsonb_build_object('id',target_session.id,'status',target_session.status,'unchanged',true); end if;
    if target_session.status<>'planned' then raise exception 'session_cannot_start'; end if;
    update public.lesson_sessions set status='live',started_at=coalesce(started_at,now()),materials_unlocked=true where id=target_session.id;
    return jsonb_build_object('id',target_session.id,'status','live');
  end if;

  if p_action='complete' then
    if target_session.status = 'completed' then
      return jsonb_build_object('id',target_session.id,'status',target_session.status,'unchanged',true);
    end if;
    if target_session.status<>'live' then raise exception 'session_must_be_live'; end if;
    select * into target_group from public.groups where id=target_session.group_id and organization_id=p_organization_id for update;
    if not found then raise exception 'group_not_found'; end if;

    if exists(
      with expected_students as (
        select student_id from public.enrollments where organization_id=p_organization_id and group_id=target_session.group_id and status='active'
        union select student_id from public.makeup_assignments where organization_id=p_organization_id and target_session_id=target_session.id and status='scheduled'
      )
      select 1 from expected_students expected left join public.attendance a
        on a.lesson_session_id=target_session.id and a.student_id=expected.student_id
      where a.id is null or a.attendance_status='unmarked'
    ) then raise exception 'attendance_incomplete'; end if;

    update public.makeup_assignments makeup set status='completed',completed_at=coalesce(makeup.completed_at,now()),updated_at=now()
      where makeup.organization_id=p_organization_id and makeup.target_session_id=target_session.id and makeup.status='scheduled'
      and exists(select 1 from public.attendance a where a.lesson_session_id=target_session.id and a.student_id=makeup.student_id and a.attendance_status in ('present', 'late'));

    select count(*) into attendee_count from public.attendance
      where organization_id=p_organization_id and lesson_session_id=target_session.id and attendance_status in ('present', 'late');

    if target_group.billing_enabled and target_session.session_kind <> 'trial' then
      if target_group.lesson_price is null or target_group.lesson_price <= 0 then
        insert into public.finance_warnings(organization_id,warning_key,warning_type,lesson_session_id,details)
        values(p_organization_id,'lesson-price:'||target_session.id,'missing_lesson_price',target_session.id,jsonb_build_object('groupId',target_group.id,'groupTitle',target_group.title))
        on conflict(organization_id,warning_key) do update set resolved_at=null,details=excluded.details;
        warning_count:=warning_count+1;
      else
        for attendance_row in select * from public.attendance where organization_id=p_organization_id and lesson_session_id=target_session.id loop
          select ma.source_attendance_id into source_attendance_id from public.makeup_assignments ma
            where ma.organization_id=p_organization_id and ma.target_session_id=target_session.id and ma.student_id=attendance_row.student_id
              and ma.status in ('scheduled','completed')
            order by ma.created_at desc limit 1;
          is_makeup:=source_attendance_id is not null;
          should_charge:=false;
          if is_makeup then
            should_charge:=attendance_row.attendance_status in ('present','late') and not exists(
              select 1 from public.billing_ledger_entries le join public.attendance source_a on source_a.lesson_session_id=le.lesson_session_id and source_a.student_id=le.student_id
              where le.organization_id=p_organization_id and le.entry_type='lesson_debit' and source_a.id=source_attendance_id
            );
          else
            should_charge:=attendance_row.attendance_status in ('present','late')
              or (attendance_row.attendance_status='absent_excused' and target_group.charge_absent_excused)
              or (attendance_row.attendance_status='absent_unexcused' and target_group.charge_absent_unexcused);
          end if;
          if should_charge then
            select sg.guardian_id into billing_guardian from public.student_guardians sg
              where sg.organization_id=p_organization_id and sg.student_id=attendance_row.student_id and sg.is_billing_contact = true limit 1;
            if billing_guardian is null then
              insert into public.finance_warnings(organization_id,warning_key,warning_type,lesson_session_id,student_id,details)
              values(p_organization_id,'billing-contact:'||target_session.id||':'||attendance_row.student_id,'missing_billing_contact',target_session.id,attendance_row.student_id,jsonb_build_object('groupId',target_group.id))
              on conflict(organization_id,warning_key) do update set resolved_at=null,details=excluded.details;
              warning_count:=warning_count+1;
            else
              insert into public.billing_accounts(organization_id,guardian_id) values(p_organization_id,billing_guardian)
                on conflict(organization_id,guardian_id) do nothing;
              select * into target_account from public.billing_accounts where organization_id=p_organization_id and guardian_id=billing_guardian for update;
              saved_entry:=null;
              insert into public.billing_ledger_entries(organization_id,account_id,guardian_id,student_id,entry_type,amount,lesson_session_id,attendance_id,reason)
                values(p_organization_id,target_account.id,billing_guardian,attendance_row.student_id,'lesson_debit',-target_group.lesson_price,target_session.id,attendance_row.id,'Занятие '||target_session.lesson_date::text)
                on conflict (organization_id, lesson_session_id, student_id) where lesson_session_id is not null and student_id is not null and entry_type='lesson_debit' do nothing
                returning id into saved_entry;
              if saved_entry is not null then
                update public.billing_accounts set balance=balance-target_group.lesson_price,updated_at=now() where id=target_account.id;
                debit_count:=debit_count+1;
              end if;
            end if;
          end if;
        end loop;
      end if;
    end if;

    if target_session.teacher_id is not null then
      select rate_per_attendee into teacher_rate from public.teacher_pay_rules
        where organization_id=p_organization_id and teacher_id=target_session.teacher_id and effective_from<=target_session.lesson_date
        order by effective_from desc limit 1;
      if teacher_rate is null then
        teacher_rate:=0;
        insert into public.finance_warnings(organization_id,warning_key,warning_type,lesson_session_id,teacher_id,details)
        values(p_organization_id,'teacher-rate:'||target_session.id,'missing_teacher_rate',target_session.id,target_session.teacher_id,jsonb_build_object('lessonDate',target_session.lesson_date))
        on conflict(organization_id,warning_key) do update set resolved_at=null,details=excluded.details;
        warning_count:=warning_count+1;
      end if;
      insert into public.teacher_payroll_entries(organization_id,lesson_session_id,teacher_id,attendee_count,rate_snapshot,amount)
        values(p_organization_id,target_session.id,target_session.teacher_id,attendee_count,teacher_rate,attendee_count*teacher_rate)
        on conflict (organization_id, lesson_session_id, teacher_id) do nothing;
    end if;

    update public.lesson_sessions set status='completed',completed_at=coalesce(completed_at,now()) where id=target_session.id;
    return jsonb_build_object('id',target_session.id,'status','completed','lessonDebits',debit_count,'attendees',attendee_count,'warnings',warning_count);
  end if;
  raise exception 'unsupported_session_action';
end;
$$;
revoke all on function public.transition_lesson_session(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.transition_lesson_session(uuid,uuid,uuid,text,boolean) to service_role;
