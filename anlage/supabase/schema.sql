create table if not exists public.companies (
  id text primary key,
  company_id text not null unique,
  display_name text not null,
  legal_name text not null,
  owner_name text,
  street text not null,
  postal_code text not null,
  city text not null,
  phone text not null,
  email text not null,
  website text not null default '',
  vat_id text not null default '',
  tax_number text not null default '',
  finance_office text not null default '',
  bank_name text not null default '',
  account_holder text not null default '',
  iban text not null default '',
  bic text not null default '',
  logo_path text not null default '',
  brand_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  company_id text not null references public.companies(company_id) on delete cascade,
  name text not null,
  street text not null default '',
  postal_code text not null default '',
  city text not null default '',
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id text primary key,
  company_id text not null references public.companies(company_id) on delete cascade,
  customer_id text references public.customers(id) on delete set null,
  job_type text not null default 'umzug',
  pickup_address jsonb not null default '{}'::jsonb,
  delivery_address jsonb not null default '{}'::jsonb,
  service_date date,
  description text not null default '',
  items jsonb not null default '[]'::jsonb,
  price_net integer not null default 0,
  vat_rate numeric(5, 4) not null default 0.19,
  price_gross integer not null default 0,
  status text not null default 'entwurf',
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id text primary key,
  company_id text not null references public.companies(company_id) on delete cascade,
  customer_id text references public.customers(id) on delete set null,
  job_id text references public.jobs(id) on delete cascade,
  document_type text not null,
  document_number text not null,
  document_date date not null default current_date,
  pdf_path text not null default '',
  total_net integer not null default 0,
  vat_amount integer not null default 0,
  total_gross integer not null default 0,
  status text not null default 'erstellt',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, document_type, document_number)
);

create table if not exists public.document_counters (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(company_id) on delete cascade,
  document_type text not null,
  year integer not null,
  current_number integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, document_type, year)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists document_counters_set_updated_at on public.document_counters;
create trigger document_counters_set_updated_at
before update on public.document_counters
for each row execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.documents enable row level security;
alter table public.document_counters enable row level security;

drop policy if exists "Temporary app access companies" on public.companies;
drop policy if exists "Temporary app access customers" on public.customers;
drop policy if exists "Temporary app access jobs" on public.jobs;
drop policy if exists "Temporary app access documents" on public.documents;
drop policy if exists "Temporary app access document counters" on public.document_counters;

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public
revoke all on tables from anon, authenticated;
