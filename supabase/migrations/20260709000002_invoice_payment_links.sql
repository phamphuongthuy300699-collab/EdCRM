create table if not exists public.invoice_payment_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  guardian_id uuid references public.guardians(id) on delete set null,
  token_hash text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_invoice_payment_links_invoice_id
  on public.invoice_payment_links (invoice_id);

create index if not exists idx_invoice_payment_links_guardian_id
  on public.invoice_payment_links (guardian_id);

create index if not exists idx_invoice_payment_links_status
  on public.invoice_payment_links (status);

alter table public.invoice_payment_links enable row level security;
