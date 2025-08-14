-- Extensiones necesarias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Tabla de configuración (singleton)
create table if not exists public.pricing_config (
  id text primary key default 'singleton',
  base_entre_semana numeric not null,
  base_fin_de_semana numeric not null,
  precio_por_persona_entre_semana numeric not null,
  precio_por_persona_fin_de_semana numeric not null,
  costo_limpieza_fijo numeric not null,
  extras_fijos jsonb not null default '[]',
  items_por_cantidad jsonb not null default '[]'
);

-- Reservas
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  nombre_cliente text not null,
  fecha date not null,
  cantidad_personas integer not null default 0,
  extras_fijos_seleccionados jsonb not null default '[]',
  cantidades jsonb not null default '{}',
  estado text not null check (estado in ('interesado','señado','confirmado')),
  es_fin_de_semana boolean not null default false,
  total numeric not null default 0,
  notas text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_reservations_fecha on public.reservations (fecha);

-- Gastos
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  monto numeric not null,
  fecha date not null,
  creado_en timestamptz not null default now()
);

-- Habilitar RLS (puedes reforzar luego)
alter table public.pricing_config enable row level security;
alter table public.reservations enable row level security;
alter table public.expenses enable row level security;

-- Políticas abiertas (para demo/interno). Ajusta si usarás Auth.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'pricing_config' and policyname = 'allow all pricing') then
    create policy "allow all pricing" on public.pricing_config for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'reservations' and policyname = 'allow all reservations') then
    create policy "allow all reservations" on public.reservations for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'expenses' and policyname = 'allow all expenses') then
    create policy "allow all expenses" on public.expenses for all using (true) with check (true);
  end if;
end $$;
