alter table public.invoice_payment_links
  add column if not exists public_id text;

update public.invoice_payment_links
set public_id = 'pl_' || replace(gen_random_uuid()::text, '-', '')
where public_id is null;

alter table public.invoice_payment_links
  alter column public_id set not null;

create unique index if not exists idx_invoice_payment_links_public_id
  on public.invoice_payment_links (public_id);
