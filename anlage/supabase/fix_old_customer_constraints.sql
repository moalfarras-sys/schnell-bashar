alter table public.customers
drop constraint if exists customers_email_key;

drop index if exists public.customers_email_key;

notify pgrst, 'reload schema';
