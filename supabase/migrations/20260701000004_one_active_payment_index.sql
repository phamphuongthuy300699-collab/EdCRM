-- Ensure only one active Alfabank payment (pending, redirected, or authorized) can exist for any invoice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_active_alfabank 
ON public.payments (invoice_id) 
WHERE provider = 'alfabank' AND status IN ('pending', 'redirected', 'authorized');
