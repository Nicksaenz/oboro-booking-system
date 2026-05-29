alter table public.suscripciones
  add column if not exists ultimo_pago_at timestamptz,
  add column if not exists ultimo_pago_monto_centavos integer,
  add column if not exists ultimo_pago_moneda text,
  add column if not exists ultimo_pago_referencia text,
  add column if not exists ultimo_pago_transaccion_id text,
  add column if not exists origen_estado text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists suscripciones_estado_idx
  on public.suscripciones (estado);

create index if not exists suscripciones_plan_idx
  on public.suscripciones (plan);

create index if not exists suscripciones_ultimo_pago_at_idx
  on public.suscripciones (ultimo_pago_at desc);
