-- C&F Studio CRM — Schema Supabase
-- Ejecutar en el SQL Editor de tu proyecto Supabase

-- Habilitar extensión UUID
create extension if not exists "pgcrypto";

-- CLIENTES
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  email       text,
  instagram   text,
  event_type  text,          -- 'Boda' | 'Quinceañera' | 'Cumpleaños' | 'Otro'
  event_date  date,
  package     text,
  total_price numeric(10,2),
  notes       text,
  created_at  timestamptz default now()
);

-- LEADS
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id) on delete cascade,
  stage         text not null default 'consulta'
                  check (stage in ('consulta','cotizado','confirmado','cobrado','cancelado')),
  source        text default 'otro'
                  check (source in ('instagram','web','referido','otro')),
  amount_quoted numeric(10,2),
  created_at    timestamptz default now()
);

-- PAGOS
create table if not exists payments (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references clients(id) on delete cascade,
  type       text not null check (type in ('sena','cuota','saldo')),
  amount     numeric(10,2) not null,
  paid_at    timestamptz default now(),
  notes      text
);

-- TAREAS
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references clients(id) on delete set null,
  title        text not null,
  assigned_to  text check (assigned_to in ('santi','matias')),
  due_date     date,
  done         boolean default false,
  created_at   timestamptz default now()
);

-- ENTREGAS
create table if not exists deliveries (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references clients(id) on delete cascade,
  status       text not null default 'sin_editar'
                 check (status in ('sin_editar','editando','revision','entregado')),
  gallery_url  text,
  promised_at  date,
  created_at   timestamptz default now()
);

-- ROW LEVEL SECURITY
-- Ambos usuarios autenticados tienen acceso total
alter table clients   enable row level security;
alter table leads     enable row level security;
alter table payments  enable row level security;
alter table tasks     enable row level security;
alter table deliveries enable row level security;

create policy "Authenticated full access" on clients
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on leads
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on payments
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on tasks
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on deliveries
  for all using (auth.role() = 'authenticated');
