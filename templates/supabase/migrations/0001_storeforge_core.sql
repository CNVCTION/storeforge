create extension if not exists pgcrypto;

create table if not exists public.store_specs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  schema_version text not null default '1.0',
  status text not null default 'draft' check (status in ('draft', 'needs_review', 'approved', 'published')),
  document jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_spec_id uuid not null references public.store_specs(id) on delete cascade,
  external_id text not null,
  name text not null,
  description text,
  price numeric(12, 2),
  currency text,
  inventory integer,
  status text not null default 'draft' check (status in ('draft', 'needs_review', 'approved', 'published')),
  document jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_spec_id, external_id)
);

create table if not exists public.store_assets (
  id uuid primary key default gen_random_uuid(),
  store_spec_id uuid not null references public.store_specs(id) on delete cascade,
  path text not null,
  kind text not null,
  synthetic boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (store_spec_id, path)
);

create table if not exists public.approval_gates (
  id uuid primary key default gen_random_uuid(),
  store_spec_id uuid not null references public.store_specs(id) on delete cascade,
  gate text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text,
  decided_at timestamptz,
  unique (store_spec_id, gate)
);

alter table public.store_specs enable row level security;
alter table public.products enable row level security;
alter table public.store_assets enable row level security;
alter table public.approval_gates enable row level security;

-- Draft records are server-managed by default. Add storefront-specific policies only after
-- deciding whether the store is public, private, or multi-tenant.
create policy "published store specs are publicly readable"
  on public.store_specs for select
  using (status = 'published');

create policy "published products are publicly readable"
  on public.products for select
  using (status = 'published');

create policy "published assets are publicly readable"
  on public.store_assets for select
  using (exists (
    select 1 from public.store_specs s
    where s.id = store_spec_id and s.status = 'published'
  ));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists store_specs_touch_updated_at on public.store_specs;
create trigger store_specs_touch_updated_at
before update on public.store_specs
for each row execute function public.touch_updated_at();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();
