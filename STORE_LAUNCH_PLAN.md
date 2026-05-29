# Oboro Booking - plan de tiendas

## Decision de producto

La app principal debe seguir siendo **Oboro Booking para negocios**. Esta es la que se vende primero y la que debe llegar a Play Store. La experiencia tipo marketplace para clientes debe hacerse despues, cuando ya existan negocios suficientes para mostrar cerca del usuario.

## Fase 1 - Play Store

- Nombre publico: `Oboro Booking`
- Package sugerido: `com.oborolab.booking`
- Categoria: Business / Productivity
- URL base: `https://booking.oborolab.com`
- Icono: `public/icons/icon-1024.png`
- Politica de privacidad: `https://booking.oborolab.com/privacidad`
- Terminos: `https://booking.oborolab.com/terminos`
- Estado: PWA lista, falta empaquetar Android y subir a Google Play Console.

## Fase 2 - App Store

Apple suele revisar con mas dureza las apps que son solo una web en contenedor. Para iOS conviene agregar una experiencia mas app-like antes de enviar:

- Splash screen nativo.
- Login y recuperacion pulidos en mobile.
- Navegacion inferior o accesos rapidos adaptados a telefono.
- Camara/galeria para fotos de negocio o empleados.
- Notificaciones o recordatorios como valor movil claro.

## Fase 3 - App de clientes

Cuando haya negocios activos:

- Ruta o app separada: `Oboro Reservas`.
- Mapa de negocios cercanos.
- Perfil publico de negocio con fotos, servicios, reseñas y puntaje.
- Favoritos o negocios seguidos.
- Reservas del cliente y cancelacion/confirmacion.
- Ofertas y promociones.

## No hacer todavia

- No lanzar marketplace vacio.
- No mezclar demasiado el panel admin con la experiencia del cliente final.
- No prometer App Store antes de reforzar la experiencia movil.
