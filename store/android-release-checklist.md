# Checklist Android / Play Store

## Herramientas necesarias en este PC

- JDK 17 o superior.
- Android Studio.
- Android SDK + Build Tools.
- Bubblewrap CLI o PWA Builder.
- Cuenta Google Play Developer.

## Datos de la app

- App name: `Oboro Booking`
- Package ID: `com.oborolab.booking`
- Start URL: `https://booking.oborolab.com/login`
- Host: `booking.oborolab.com`
- Icon 1024: `public/icons/icon-1024.png`
- Manifest: `https://booking.oborolab.com/manifest.webmanifest`

## Pasos de build sugeridos con Bubblewrap

1. Instalar JDK y Android Studio.
2. Instalar Bubblewrap:

```powershell
npm.cmd install -g @bubblewrap/cli
```

3. Inicializar TWA:

```powershell
bubblewrap init --manifest=https://booking.oborolab.com/manifest.webmanifest
```

4. Usar estos valores:

- Package ID: `com.oborolab.booking`
- App name: `Oboro Booking`
- Launcher name: `Oboro Booking`
- Host: `booking.oborolab.com`
- Start URL: `/login`
- Theme color: `#ea580c`
- Navigation color: `#000000`

5. Generar bundle:

```powershell
bubblewrap build
```

6. Subir el `.aab` a Play Console.

## Digital Asset Links

Para que la TWA sea confiable y abra sin barra del navegador, Android debe verificar que la app y el dominio pertenecen al mismo dueño.

Despues de generar la llave de firma y subir el primer release a Play Console:

1. Abrir Play Console.
2. Ir a `Release > Setup > App signing`.
3. Copiar el snippet de Digital Asset Links.
4. Publicarlo en:

```text
https://booking.oborolab.com/.well-known/assetlinks.json
```

## Pendientes antes de enviar

- Crear screenshots verticales de:
  - Login/landing mobile.
  - Dashboard.
  - Citas.
  - QR publico.
  - Automatizaciones WhatsApp.
  - Finanzas.
- Confirmar que `CRON_SECRET` esta configurado en GitHub Actions.
- Probar registro nuevo desde celular.
- Probar reserva publica por QR.
- Probar recordatorio WhatsApp.
- Probar recuperacion de contrasena por WhatsApp.
