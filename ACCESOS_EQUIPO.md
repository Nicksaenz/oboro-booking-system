# Accesos por plan en Oboro Booking

## Regla comercial

Cada suscripcion pertenece a un negocio y tiene un administrador principal.

- Basico: 1 administrador principal.
- Pro: 1 administrador principal.
- Business: 1 administrador principal con permiso financiero.

Los usuarios adicionales deben entrar con permisos limitados, no como administradores.

## Como debe funcionar

1. El cliente compra un plan con Wompi.
2. El correo que pago queda como administrador principal del negocio.
3. El administrador puede crear o solicitar accesos para su equipo.
4. Cada persona del equipo entra con su propio correo.
5. El sistema identifica a que negocio pertenece esa persona.
6. Si es administrador, puede crear, editar y eliminar.
7. Si es lectura, puede ver dashboard, clientes, citas, servicios y empleados, pero no modificar.
8. Si es operativo, puede crear o actualizar citas, pero no tocar pagos, suscripcion ni finanzas.
9. En Business, finanzas queda protegido para el administrador financiero.

## Roles recomendados

### Administrador

Puede hacer todo:

- Gestionar clientes.
- Gestionar servicios.
- Gestionar empleados.
- Crear, editar y eliminar citas.
- Ver QR y automatizaciones.
- Ver y editar finanzas si el plan es Business.
- Cambiar configuracion del negocio.

### Operativo

Pensado para recepcion o personal que agenda:

- Ver dashboard.
- Ver clientes.
- Crear citas.
- Editar estados de citas.
- Enviar WhatsApp manual desde citas.
- No puede editar servicios, empleados, suscripcion ni finanzas.

### Solo lectura

Pensado para contador, socio o supervisor:

- Ver dashboard.
- Ver agenda.
- Ver clientes, servicios y empleados.
- Ver finanzas si el administrador lo permite.
- No puede crear, editar ni eliminar.

## Implementacion tecnica implementada

El sistema usa una tabla de accesos de equipo para conectar usuarios invitados
al negocio del administrador principal.

Tabla: `equipo_accesos`

Campos:

- `id`
- `negocio_id`: usuario administrador principal.
- `usuario_id`: usuario invitado.
- `email`
- `rol`: `admin`, `operativo`, `lectura`
- `activo`
- `created_at`

Cada modulo lee el `negocio_id` real:

- Si el usuario es administrador, usa su propio `usuario_id`.
- Si el usuario es invitado, usa el `negocio_id` del administrador.

Cada accion valida permisos:

- Crear/editar/eliminar: solo `admin` u `operativo` donde aplique.
- Finanzas: solo `admin` Business.
- Lectura: todos los roles activos.

## Estado actual

Oboro Booking ya maneja un administrador principal por negocio y accesos
adicionales por rol.

Para invitar a alguien, el administrador entra a `Equipo`, registra el correo
exacto de la persona y selecciona su rol. La persona invitada debe crear su
cuenta con ese mismo correo; al entrar, el sistema la conecta automaticamente
con el negocio correspondiente.

Antes de vender a negocios grandes, conviene probar un correo invitado real en
cada rol para validar el flujo completo en produccion.
