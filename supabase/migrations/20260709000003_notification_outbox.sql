create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  guardian_id uuid references public.guardians(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  channel text not null,
  destination text,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_notification_outbox_status
  on public.notification_outbox (status, created_at);

create index if not exists idx_notification_outbox_invoice_id
  on public.notification_outbox (invoice_id);

create index if not exists idx_notification_outbox_guardian_id
  on public.notification_outbox (guardian_id);

alter table public.notification_outbox enable row level security;
