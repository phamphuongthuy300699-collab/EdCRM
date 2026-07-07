-- Preserve production edits while replacing the broken legacy Alfa-Bank test gateway.
update public.payment_provider_settings
set
  test_gateway_url = 'https://alfa.rbsuat.com/payment/rest/',
  updated_at = now()
where provider = 'alfabank'
  and test_gateway_url = 'https://web.rbsuat.com/ab/rest/';
