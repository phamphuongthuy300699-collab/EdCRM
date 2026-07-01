-- Secure payment_events RLS by dropping the manager-writable policy.
-- payment_events should only be managed by server-side code using service role.

drop policy if exists "payment_events_write_finance_members" on public.payment_events;
