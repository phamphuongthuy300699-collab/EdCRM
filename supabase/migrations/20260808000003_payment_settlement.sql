alter table public.payment_events drop constraint if exists payment_events_provider_check;
alter table public.payment_events add constraint payment_events_provider_check
  check (provider in ('manual','alfabank','cash','bank_transfer','yookassa','robokassa'));

create or replace function public.settle_paid_payment(
  p_organization_id uuid,p_payment_id uuid,p_paid_at timestamptz default now(),p_raw_response jsonb default null,p_event_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare target_payment public.payments%rowtype; target_invoice public.invoices%rowtype; target_account public.billing_accounts%rowtype; saved_entry uuid;
begin
  select * into target_payment from public.payments where id=p_payment_id and organization_id=p_organization_id for update;
  if not found then raise exception 'payment_not_found'; end if;
  if target_payment.invoice_id is null then raise exception 'payment_invoice_required'; end if;
  select * into target_invoice from public.invoices where id=target_payment.invoice_id and organization_id=p_organization_id for update;
  if not found then raise exception 'invoice_not_found'; end if;
  if target_invoice.guardian_id is null then raise exception 'invoice_guardian_required'; end if;
  insert into public.billing_accounts(organization_id,guardian_id) values(p_organization_id,target_invoice.guardian_id)
    on conflict(organization_id,guardian_id) do nothing;
  select * into target_account from public.billing_accounts where organization_id=p_organization_id and guardian_id=target_invoice.guardian_id for update;
  update public.payments set status='paid',paid_at=coalesce(paid_at,p_paid_at),guardian_id=target_invoice.guardian_id,
    raw_response=coalesce(p_raw_response,raw_response),updated_at=now() where id=target_payment.id;
  update public.invoices set status=public.calculate_invoice_status(target_invoice.id),
    paid_at=case when public.calculate_invoice_status(target_invoice.id)='paid' then coalesce(paid_at,p_paid_at) else paid_at end,updated_at=now()
    where id=target_invoice.id;
  insert into public.billing_ledger_entries(organization_id,account_id,guardian_id,student_id,entry_type,amount,payment_id,invoice_id,reason)
    values(p_organization_id,target_account.id,target_invoice.guardian_id,target_invoice.student_id,'payment',target_payment.amount,target_payment.id,target_invoice.id,'Оплата счёта '||target_invoice.number)
    on conflict (organization_id, payment_id) where payment_id is not null and entry_type='payment' do nothing
    returning id into saved_entry;
  if saved_entry is not null then
    update public.billing_accounts set balance=balance+target_payment.amount,updated_at=now() where id=target_account.id;
    insert into public.payment_events(organization_id,payment_id,invoice_id,provider,event_type,payload)
      values(p_organization_id,target_payment.id,target_invoice.id,target_payment.provider::text,'payment_paid',coalesce(p_event_payload,'{}'::jsonb));
  end if;
  return jsonb_build_object('paymentId',target_payment.id,'invoiceId',target_invoice.id,'ledgerEntryId',saved_entry,'unchanged',saved_entry is null);
end; $$;
revoke all on function public.settle_paid_payment(uuid,uuid,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.settle_paid_payment(uuid,uuid,timestamptz,jsonb,jsonb) to service_role;

create or replace function public.settle_manual_invoice(p_organization_id uuid,p_invoice_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare target_invoice public.invoices%rowtype; saved_payment uuid; result jsonb; paid_total numeric(14,2); outstanding numeric(14,2);
begin
  select * into target_invoice from public.invoices where id=p_invoice_id and organization_id=p_organization_id for update;
  if not found then raise exception 'invoice_not_found'; end if;
  if target_invoice.guardian_id is null then raise exception 'invoice_guardian_required'; end if;
  if target_invoice.status='paid' then return jsonb_build_object('invoiceId',target_invoice.id,'unchanged',true); end if;
  select coalesce(sum(amount),0) into paid_total from public.payments
    where organization_id=p_organization_id and invoice_id=target_invoice.id and status::text in ('paid','succeeded');
  outstanding:=target_invoice.amount-paid_total;
  if outstanding<=0 then
    update public.invoices set status='paid',paid_at=coalesce(paid_at,now()),updated_at=now() where id=target_invoice.id;
    return jsonb_build_object('invoiceId',target_invoice.id,'unchanged',true);
  end if;
  insert into public.payments(organization_id,invoice_id,student_id,guardian_id,provider,status,amount,currency)
    values(p_organization_id,target_invoice.id,target_invoice.student_id,target_invoice.guardian_id,'manual','pending',outstanding,target_invoice.currency)
    returning id into saved_payment;
  result:=public.settle_paid_payment(p_organization_id,saved_payment,now(),null,jsonb_build_object('source','crm_manual','actorId',p_actor_id));
  return result;
end; $$;
revoke all on function public.settle_manual_invoice(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.settle_manual_invoice(uuid,uuid,uuid) to service_role;

create or replace function public.reconcile_paid_payment(p_organization_id uuid,p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare current_status public.payment_status;
begin
  select status into current_status from public.payments where id=p_payment_id and organization_id=p_organization_id;
  if current_status is null then raise exception 'payment_not_found'; end if;
  if current_status::text not in ('paid','succeeded') then raise exception 'payment_is_not_paid'; end if;
  return public.settle_paid_payment(p_organization_id,p_payment_id,now(),null,jsonb_build_object('source','manual_reconciliation'));
end; $$;
revoke all on function public.reconcile_paid_payment(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reconcile_paid_payment(uuid,uuid) to service_role;

create or replace function public.settle_refunded_payment(
  p_organization_id uuid,p_payment_id uuid,p_raw_response jsonb default null,p_event_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare target_payment public.payments%rowtype; target_invoice public.invoices%rowtype; target_account public.billing_accounts%rowtype; saved_entry uuid;
begin
  select * into target_payment from public.payments where id=p_payment_id and organization_id=p_organization_id for update;
  if not found then raise exception 'payment_not_found'; end if;
  select * into target_invoice from public.invoices where id=target_payment.invoice_id and organization_id=p_organization_id for update;
  if not found then raise exception 'invoice_not_found'; end if;
  if target_invoice.guardian_id is null then raise exception 'invoice_guardian_required'; end if;
  insert into public.billing_accounts(organization_id,guardian_id) values(p_organization_id,target_invoice.guardian_id) on conflict(organization_id,guardian_id) do nothing;
  select * into target_account from public.billing_accounts where organization_id=p_organization_id and guardian_id=target_invoice.guardian_id for update;
  update public.payments set status='refunded',raw_response=coalesce(p_raw_response,raw_response),updated_at=now() where id=target_payment.id;
  if exists(select 1 from public.billing_ledger_entries where organization_id=p_organization_id and payment_id=target_payment.id and entry_type='payment') then
    insert into public.billing_ledger_entries(organization_id,account_id,guardian_id,student_id,entry_type,amount,payment_id,invoice_id,reason)
      values(p_organization_id,target_account.id,target_invoice.guardian_id,target_invoice.student_id,'refund',-target_payment.amount,target_payment.id,target_invoice.id,'Возврат по счёту '||target_invoice.number)
      on conflict (organization_id,payment_id) where payment_id is not null and entry_type='refund' do nothing returning id into saved_entry;
  end if;
  if saved_entry is not null then
    update public.billing_accounts set balance=balance-target_payment.amount,updated_at=now() where id=target_account.id;
    insert into public.payment_events(organization_id,payment_id,invoice_id,provider,event_type,payload)
      values(p_organization_id,target_payment.id,target_invoice.id,target_payment.provider::text,'payment_refunded',coalesce(p_event_payload,'{}'::jsonb));
  end if;
  update public.invoices set status=public.calculate_invoice_status(target_invoice.id),
    paid_at=case when public.calculate_invoice_status(target_invoice.id)='paid' then paid_at else null end,updated_at=now() where id=target_invoice.id;
  return jsonb_build_object('paymentId',target_payment.id,'ledgerEntryId',saved_entry,'unchanged',saved_entry is null);
end; $$;
revoke all on function public.settle_refunded_payment(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.settle_refunded_payment(uuid,uuid,jsonb,jsonb) to service_role;
