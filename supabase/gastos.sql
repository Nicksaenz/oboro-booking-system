create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  categoria text not null default 'General',
  descripcion text not null,
  monto numeric(12, 2) not null check (monto > 0),
  created_at timestamptz not null default now()
);

create index if not exists gastos_usuario_fecha_idx
  on public.gastos (usuario_id, fecha desc);

alter table public.gastos enable row level security;

drop policy if exists "gastos_select_owner" on public.gastos;
create policy "gastos_select_owner"
  on public.gastos
  for select
  using (auth.uid() = usuario_id);

drop policy if exists "gastos_insert_owner" on public.gastos;
create policy "gastos_insert_owner"
  on public.gastos
  for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "gastos_update_owner" on public.gastos;
create policy "gastos_update_owner"
  on public.gastos
  for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

drop policy if exists "gastos_delete_owner" on public.gastos;
create policy "gastos_delete_owner"
  on public.gastos
  for delete
  using (auth.uid() = usuario_id);
