# Checklist de venta de Oboro Booking

Usa esta lista antes de vender o activar una cuenta nueva.

## 1. Estado de produccion

- [ ] Dominio activo: `https://booking.oborolab.com`
- [ ] `NEXT_PUBLIC_APP_URL` en Vercel apunta a `https://booking.oborolab.com`
- [ ] Ultimo deploy de Vercel aparece como `Ready`
- [ ] `npm.cmd run build` pasa localmente
- [ ] `npm.cmd run lint` pasa localmente

## 2. Pagos con Wompi

- [ ] Wompi aprobo el comercio para produccion
- [ ] `WOMPI_PUBLIC_KEY` es llave de produccion
- [ ] `WOMPI_INTEGRITY_SECRET` es secreto de integridad de produccion
- [ ] `WOMPI_EVENT_SECRET` es secreto de eventos de produccion
- [ ] Webhook configurado en Wompi:
  `https://booking.oborolab.com/api/wompi/webhook`
- [ ] Se hizo un pago real de prueba y la suscripcion cambio a `activa`

## 3. WhatsApp automatico de Oboro Lab

- [ ] Meta aprobo la cuenta de WhatsApp Business
- [ ] El numero de Oboro Lab esta aprobado y operativo
- [ ] Plantilla `recordatorio_negocio` aprobada en Meta
- [ ] `META_WHATSAPP_PHONE_NUMBER_ID` configurado en Vercel
- [ ] `META_WHATSAPP_ACCESS_TOKEN` configurado en Vercel
- [ ] `META_WHATSAPP_TEMPLATE_RECORDATORIO_NEGOCIO` configurado en Vercel
- [ ] `META_WHATSAPP_TEMPLATE_LANGUAGE=es_CO` configurado en Vercel
- [ ] `CRON_SECRET` configurado en Vercel

## 4. Prueba de cuenta cliente

- [ ] Crear una cuenta nueva desde `/login`
- [ ] Guardar nombre del negocio y WhatsApp real
- [ ] Activar plan Basico, Pro o Business
- [ ] Crear minimo 2 servicios
- [ ] Crear minimo 1 empleado activo
- [ ] Crear minimo 2 clientes
- [ ] Crear una cita manual
- [ ] Probar boton `Avisar cliente`
- [ ] Probar boton `Avisar negocio`
- [ ] Abrir `Manual admin` y verificar que solo el administrador lo puede ver
- [ ] Crear un acceso de prueba desde `Equipo`
- [ ] En Pro o Business, abrir el QR publico y crear una reserva
- [ ] Confirmar y cancelar una reserva desde los links publicos
- [ ] En Business, probar finanzas con el PIN admin

## 5. Entrega al cliente

- [ ] Enviar URL de acceso: `https://booking.oborolab.com/login`
- [ ] Explicar que puede instalarlo en el celular desde el navegador
- [ ] Cargar sus primeros servicios o acompanarlo en una videollamada
- [ ] Confirmar que entiende como crear citas y avisar por WhatsApp
- [ ] Confirmar fecha de renovacion mensual
- [ ] Enviar volante comercial o QR de acceso si el cliente necesita compartir la app
