create table if not exists public.equipo_accesos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references auth.users(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  email text not null,
  rol text not null check (rol in ('admin', 'operativo', 'lectura')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (negocio_id, email)
);

create index if not exists equipo_accesos_negocio_idx
  on public.equipo_accesos (negocio_id);

create index if not exists equipo_accesos_usuario_idx
  on public.equipo_accesos (usuario_id);

create index if not exists equipo_accesos_email_idx
  on public.equipo_accesos (lower(email));

alter table public.equipo_accesos enable row level security;

create or replace function public.rol_en_negocio(negocio uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when auth.uid() = negocio then 'admin'
    else (
      select ea.rol
      from public.equipo_accesos ea
      where ea.negocio_id = negocio
        and ea.activo = true
        and (
          ea.usuario_id = auth.uid()
          or lower(ea.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      order by
        case ea.rol
          when 'admin' then 1
          when 'operativo' then 2
          else 3
        end
      limit 1
    )
  end;
$$;

create or replace function public.tiene_acceso_negocio(negocio uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.rol_en_negocio(negocio) is not null;
$$;

create or replace function public.puede_operar_negocio(negocio uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.rol_en_negocio(negocio) in ('admin', 'operativo');
$$;

create or replace function public.puede_admin_negocio(negocio uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.rol_en_negocio(negocio) = 'admin';
$$;

drop policy if exists "equipo_select_related" on public.equipo_accesos;
create policy "equipo_select_related"
  on public.equipo_accesos
  for select
  using (
    negocio_id = auth.uid()
    or usuario_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "equipo_insert_owner" on public.equipo_accesos;
create policy "equipo_insert_owner"
  on public.equipo_accesos
  for insert
  with check (negocio_id = auth.uid());

drop policy if exists "equipo_update_owner_or_link" on public.equipo_accesos;
create policy "equipo_update_owner_or_link"
  on public.equipo_accesos
  for update
  using (
    negocio_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    negocio_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "equipo_delete_owner" on public.equipo_accesos;
create policy "equipo_delete_owner"
  on public.equipo_accesos
  for delete
  using (negocio_id = auth.uid());

drop policy if exists "clientes_select_equipo" on public."Clientes";
create policy "clientes_select_equipo"
  on public."Clientes"
  for select
  using (public.tiene_acceso_negocio(usuario_id));

drop policy if exists "clientes_insert_equipo" on public."Clientes";
create policy "clientes_insert_equipo"
  on public."Clientes"
  for insert
  with check (public.puede_operar_negocio(usuario_id));

drop policy if exists "clientes_update_equipo" on public."Clientes";
create policy "clientes_update_equipo"
  on public."Clientes"
  for update
  using (public.puede_operar_negocio(usuario_id))
  with check (public.puede_operar_negocio(usuario_id));

drop policy if exists "clientes_delete_admin" on public."Clientes";
create policy "clientes_delete_admin"
  on public."Clientes"
  for delete
  using (public.puede_admin_negocio(usuario_id));

drop policy if exists "servicios_select_equipo" on public."SERVICIOS";
create policy "servicios_select_equipo"
  on public."SERVICIOS"
  for select
  using (public.tiene_acceso_negocio("ID DE USUARIO"));

drop policy if exists "servicios_insert_admin" on public."SERVICIOS";
create policy "servicios_insert_admin"
  on public."SERVICIOS"
  for insert
  with check (public.puede_admin_negocio("ID DE USUARIO"));

drop policy if exists "servicios_update_admin" on public."SERVICIOS";
create policy "servicios_update_admin"
  on public."SERVICIOS"
  for update
  using (public.puede_admin_negocio("ID DE USUARIO"))
  with check (public.puede_admin_negocio("ID DE USUARIO"));

drop policy if exists "servicios_delete_admin" on public."SERVICIOS";
create policy "servicios_delete_admin"
  on public."SERVICIOS"
  for delete
  using (public.puede_admin_negocio("ID DE USUARIO"));

drop policy if exists "empleados_select_equipo" on public."Empleados";
create policy "empleados_select_equipo"
  on public."Empleados"
  for select
  using (public.tiene_acceso_negocio("ID de Usuario"));

drop policy if exists "empleados_insert_admin" on public."Empleados";
create policy "empleados_insert_admin"
  on public."Empleados"
  for insert
  with check (public.puede_admin_negocio("ID de Usuario"));

drop policy if exists "empleados_update_admin" on public."Empleados";
create policy "empleados_update_admin"
  on public."Empleados"
  for update
  using (public.puede_admin_negocio("ID de Usuario"))
  with check (public.puede_admin_negocio("ID de Usuario"));

drop policy if exists "empleados_delete_admin" on public."Empleados";
create policy "empleados_delete_admin"
  on public."Empleados"
  for delete
  using (public.puede_admin_negocio("ID de Usuario"));

drop policy if exists "citas_select_equipo" on public."Citas";
create policy "citas_select_equipo"
  on public."Citas"
  for select
  using (public.tiene_acceso_negocio("ID_Usuario"));

drop policy if exists "citas_insert_equipo" on public."Citas";
create policy "citas_insert_equipo"
  on public."Citas"
  for insert
  with check (public.puede_operar_negocio("ID_Usuario"));

drop policy if exists "citas_update_equipo" on public."Citas";
create policy "citas_update_equipo"
  on public."Citas"
  for update
  using (public.puede_operar_negocio("ID_Usuario"))
  with check (public.puede_operar_negocio("ID_Usuario"));

drop policy if exists "citas_delete_admin" on public."Citas";
create policy "citas_delete_admin"
  on public."Citas"
  for delete
  using (public.puede_admin_negocio("ID_Usuario"));

drop policy if exists "gastos_select_equipo_admin" on public.gastos;
create policy "gastos_select_equipo_admin"
  on public.gastos
  for select
  using (public.puede_admin_negocio(usuario_id));

drop policy if exists "gastos_insert_equipo_admin" on public.gastos;
create policy "gastos_insert_equipo_admin"
  on public.gastos
  for insert
  with check (public.puede_admin_negocio(usuario_id));

drop policy if exists "gastos_update_equipo_admin" on public.gastos;
create policy "gastos_update_equipo_admin"
  on public.gastos
  for update
  using (public.puede_admin_negocio(usuario_id))
  with check (public.puede_admin_negocio(usuario_id));

drop policy if exists "gastos_delete_equipo_admin" on public.gastos;
create policy "gastos_delete_equipo_admin"
  on public.gastos
  for delete
  using (public.puede_admin_negocio(usuario_id));
