create or replace function public.suscripcion_vigente_negocio(negocio uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.suscripciones s
    where s.usuario_id = negocio
      and lower(coalesce(s.plan, '')) in ('basico', 'pro', 'business', 'premium')
      and lower(coalesce(s.estado, '')) in ('activa', 'activo', 'pagada', 'paid')
      and s.fecha_vencimiento is not null
      and s.fecha_vencimiento >= now()
  );
$$;

create or replace function public.tiene_acceso_negocio_vigente(negocio uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.suscripcion_vigente_negocio(negocio)
    and public.tiene_acceso_negocio(negocio);
$$;

create or replace function public.puede_operar_negocio_vigente(negocio uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.suscripcion_vigente_negocio(negocio)
    and public.puede_operar_negocio(negocio);
$$;

create or replace function public.puede_admin_negocio_vigente(negocio uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.suscripcion_vigente_negocio(negocio)
    and public.puede_admin_negocio(negocio);
$$;

drop policy if exists "clientes_select_equipo" on public."Clientes";
create policy "clientes_select_equipo"
  on public."Clientes"
  for select
  using (public.tiene_acceso_negocio_vigente(usuario_id));

drop policy if exists "clientes_insert_equipo" on public."Clientes";
create policy "clientes_insert_equipo"
  on public."Clientes"
  for insert
  with check (public.puede_operar_negocio_vigente(usuario_id));

drop policy if exists "clientes_update_equipo" on public."Clientes";
create policy "clientes_update_equipo"
  on public."Clientes"
  for update
  using (public.puede_operar_negocio_vigente(usuario_id))
  with check (public.puede_operar_negocio_vigente(usuario_id));

drop policy if exists "clientes_delete_admin" on public."Clientes";
create policy "clientes_delete_admin"
  on public."Clientes"
  for delete
  using (public.puede_admin_negocio_vigente(usuario_id));

drop policy if exists "servicios_select_equipo" on public."SERVICIOS";
create policy "servicios_select_equipo"
  on public."SERVICIOS"
  for select
  using (public.tiene_acceso_negocio_vigente("ID DE USUARIO"));

drop policy if exists "servicios_insert_admin" on public."SERVICIOS";
create policy "servicios_insert_admin"
  on public."SERVICIOS"
  for insert
  with check (public.puede_admin_negocio_vigente("ID DE USUARIO"));

drop policy if exists "servicios_update_admin" on public."SERVICIOS";
create policy "servicios_update_admin"
  on public."SERVICIOS"
  for update
  using (public.puede_admin_negocio_vigente("ID DE USUARIO"))
  with check (public.puede_admin_negocio_vigente("ID DE USUARIO"));

drop policy if exists "servicios_delete_admin" on public."SERVICIOS";
create policy "servicios_delete_admin"
  on public."SERVICIOS"
  for delete
  using (public.puede_admin_negocio_vigente("ID DE USUARIO"));

drop policy if exists "empleados_select_equipo" on public."Empleados";
create policy "empleados_select_equipo"
  on public."Empleados"
  for select
  using (public.tiene_acceso_negocio_vigente("ID de Usuario"));

drop policy if exists "empleados_insert_admin" on public."Empleados";
create policy "empleados_insert_admin"
  on public."Empleados"
  for insert
  with check (public.puede_admin_negocio_vigente("ID de Usuario"));

drop policy if exists "empleados_update_admin" on public."Empleados";
create policy "empleados_update_admin"
  on public."Empleados"
  for update
  using (public.puede_admin_negocio_vigente("ID de Usuario"))
  with check (public.puede_admin_negocio_vigente("ID de Usuario"));

drop policy if exists "empleados_delete_admin" on public."Empleados";
create policy "empleados_delete_admin"
  on public."Empleados"
  for delete
  using (public.puede_admin_negocio_vigente("ID de Usuario"));

drop policy if exists "citas_select_equipo" on public."Citas";
create policy "citas_select_equipo"
  on public."Citas"
  for select
  using (public.tiene_acceso_negocio_vigente("ID_Usuario"));

drop policy if exists "citas_insert_equipo" on public."Citas";
create policy "citas_insert_equipo"
  on public."Citas"
  for insert
  with check (public.puede_operar_negocio_vigente("ID_Usuario"));

drop policy if exists "citas_update_equipo" on public."Citas";
create policy "citas_update_equipo"
  on public."Citas"
  for update
  using (public.puede_operar_negocio_vigente("ID_Usuario"))
  with check (public.puede_operar_negocio_vigente("ID_Usuario"));

drop policy if exists "citas_delete_admin" on public."Citas";
create policy "citas_delete_admin"
  on public."Citas"
  for delete
  using (public.puede_admin_negocio_vigente("ID_Usuario"));

drop policy if exists "gastos_select_equipo_admin" on public.gastos;
create policy "gastos_select_equipo_admin"
  on public.gastos
  for select
  using (public.puede_admin_negocio_vigente(usuario_id));

drop policy if exists "gastos_insert_equipo_admin" on public.gastos;
create policy "gastos_insert_equipo_admin"
  on public.gastos
  for insert
  with check (public.puede_admin_negocio_vigente(usuario_id));

drop policy if exists "gastos_update_equipo_admin" on public.gastos;
create policy "gastos_update_equipo_admin"
  on public.gastos
  for update
  using (public.puede_admin_negocio_vigente(usuario_id))
  with check (public.puede_admin_negocio_vigente(usuario_id));

drop policy if exists "gastos_delete_equipo_admin" on public.gastos;
create policy "gastos_delete_equipo_admin"
  on public.gastos
  for delete
  using (public.puede_admin_negocio_vigente(usuario_id));
