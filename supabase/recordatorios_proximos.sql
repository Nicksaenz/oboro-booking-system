alter table public.equipo_accesos
  add column if not exists empleado_id uuid references public."Empleados"("ID") on delete set null;

create index if not exists equipo_accesos_empleado_idx
  on public.equipo_accesos (empleado_id);

create table if not exists public.whatsapp_recordatorios_envios (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public."Citas"("ID") on delete cascade,
  destinatario text not null check (destinatario in ('cliente', 'negocio')),
  minutos_antes integer not null check (minutos_antes in (5, 20)),
  estado text not null default 'enviado' check (estado in ('pendiente', 'enviado', 'fallido')),
  intento_count integer not null default 1,
  enviado_at timestamptz not null default now(),
  ultimo_error text,
  proximo_reintento_at timestamptz,
  respuesta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cita_id, destinatario, minutos_antes)
);

alter table public.whatsapp_recordatorios_envios
  add column if not exists estado text not null default 'enviado';

alter table public.whatsapp_recordatorios_envios
  add column if not exists intento_count integer not null default 1;

alter table public.whatsapp_recordatorios_envios
  add column if not exists ultimo_error text;

alter table public.whatsapp_recordatorios_envios
  add column if not exists proximo_reintento_at timestamptz;

alter table public.whatsapp_recordatorios_envios
  add column if not exists updated_at timestamptz not null default now();

create index if not exists whatsapp_recordatorios_estado_idx
  on public.whatsapp_recordatorios_envios (estado, enviado_at desc);

alter table public.whatsapp_recordatorios_envios enable row level security;

drop policy if exists "recordatorios_envios_admin_select" on public.whatsapp_recordatorios_envios;
create policy "recordatorios_envios_admin_select"
  on public.whatsapp_recordatorios_envios
  for select
  using (
    exists (
      select 1
      from public."Citas" c
      where c."ID" = cita_id
        and public.puede_admin_negocio(c."ID_Usuario")
    )
  );

create table if not exists public.empleado_resenas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null,
  empleado_id uuid not null references public."Empleados"("ID") on delete cascade,
  cita_id uuid references public."Citas"("ID") on delete set null,
  cliente_nombre text not null,
  calificacion integer not null check (calificacion between 1 and 5),
  comentario text,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists empleado_resenas_empleado_idx
  on public.empleado_resenas (empleado_id, visible, created_at desc);

create unique index if not exists empleado_resenas_cita_unique
  on public.empleado_resenas (cita_id)
  where cita_id is not null;

alter table public.empleado_resenas enable row level security;

drop policy if exists "empleado_resenas_public_select" on public.empleado_resenas;
create policy "empleado_resenas_public_select"
  on public.empleado_resenas
  for select
  using (visible = true);

create or replace function public.puede_ver_cita(negocio uuid, empleado uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select case
    when auth.uid() = negocio then true
    else exists (
      select 1
      from public.equipo_accesos ea
      where ea.negocio_id = negocio
        and ea.activo = true
        and (
          ea.usuario_id = auth.uid()
          or lower(ea.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
        and (
          ea.rol = 'admin'
          or ea.empleado_id = empleado
        )
    )
  end;
$$;

create or replace function public.puede_operar_cita(negocio uuid, empleado uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select case
    when auth.uid() = negocio then true
    else exists (
      select 1
      from public.equipo_accesos ea
      where ea.negocio_id = negocio
        and ea.activo = true
        and ea.rol in ('admin', 'operativo')
        and (
          ea.usuario_id = auth.uid()
          or lower(ea.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
        and (
          ea.rol = 'admin'
          or ea.empleado_id = empleado
        )
    )
  end;
$$;

drop policy if exists "citas_select_equipo" on public."Citas";
create policy "citas_select_equipo"
  on public."Citas"
  for select
  using (public.puede_ver_cita("ID_Usuario", "ID_Empleado"));

drop policy if exists "citas_insert_equipo" on public."Citas";
create policy "citas_insert_equipo"
  on public."Citas"
  for insert
  with check (public.puede_operar_cita("ID_Usuario", "ID_Empleado"));

drop policy if exists "citas_update_equipo" on public."Citas";
create policy "citas_update_equipo"
  on public."Citas"
  for update
  using (public.puede_operar_cita("ID_Usuario", "ID_Empleado"))
  with check (public.puede_operar_cita("ID_Usuario", "ID_Empleado"));
