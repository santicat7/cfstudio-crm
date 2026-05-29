-- Ejecutar en el SQL Editor de Supabase
create table if not exists message_templates (
  id         uuid primary key default gen_random_uuid(),
  stage      text,
  title      text not null,
  body       text not null,
  created_at timestamptz default now()
);

alter table message_templates enable row level security;

create policy "auth_all" on message_templates
  for all using (auth.role() = 'authenticated');
