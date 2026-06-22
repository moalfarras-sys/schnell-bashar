alter table public.customers
add column if not exists company_id text,
add column if not exists street text not null default '',
add column if not exists postal_code text not null default '',
add column if not exists city text not null default '',
add column if not exists notes text not null default '';

update public.customers
set company_id = coalesce(company_id, company, 'punktlich-umzuege')
where company_id is null;

alter table public.customers
alter column company_id set not null;

alter table public.customers
alter column created_at set default now(),
alter column updated_at set default now();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

notify pgrst, 'reload schema';
