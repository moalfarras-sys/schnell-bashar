alter table public.customers
alter column created_at set default now(),
alter column updated_at set default now();

notify pgrst, 'reload schema';
