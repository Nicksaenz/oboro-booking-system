create extension if not exists pgcrypto;

create table if not exists public.whatsapp_configuraciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references auth.users(id) on delete cascade,
  telefono_negocio text not null,
  phone_number_id text not null,
  access_token text not null,
  template_recordatorio text not null default 'recordatorio_cita',
  template_language text not null default 'es_CO',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_configuraciones enable row level security;

drop policy if exists "whatsapp_configuraciones_select_owner"
  on public.whatsapp_configuraciones;
drop policy if exists "whatsapp_configuraciones_insert_owner"
  on public.whatsapp_configuraciones;
drop policy if exists "whatsapp_configuraciones_update_owner"
  on public.whatsapp_configuraciones;

create policy "whatsapp_configuraciones_select_owner"
  on public.whatsapp_configuraciones
  for select
  using (auth.uid() = usuario_id);

create policy "whatsapp_configuraciones_insert_owner"
  on public.whatsapp_configuraciones
  for insert
  with check (auth.uid() = usuario_id);

create policy "whatsapp_configuraciones_update_owner"
  on public.whatsapp_configuraciones
  for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);
