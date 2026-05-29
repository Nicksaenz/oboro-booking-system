alter table public.suscripciones
  add column if not exists direccion_negocio text,
  add column if not exists google_maps_url text,
  add column if not exists google_reviews_url text;

comment on column public.suscripciones.direccion_negocio is
  'Direccion visible del negocio para mostrar en el QR publico de reservas.';

comment on column public.suscripciones.google_maps_url is
  'Link publico de Google Maps del negocio.';

comment on column public.suscripciones.google_reviews_url is
  'Link publico de resenas de Google del negocio.';
