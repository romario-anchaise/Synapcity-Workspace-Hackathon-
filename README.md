# Rapicostura · Synapcity

Código fuente de la app móvil/web para coordinar el taller, recepción de prendas, envíos, equipo y tutoriales. Incluye el servidor del chatbot por QR y el instalador Android.

[App web publicada](https://rapicostura-romario.web.app/)

## Carpetas

- `app/`: aplicación web, videos de tutoriales, código Android, scripts y pruebas.
- `app/integrations/chatbot-server/`: servidor de WhatsApp y panel de configuración.
- `Rapicostura.apk`: instalador Android que muestra la web publicada.
- `presentacion-parche/`: corrección del puntero de presentación. No contiene los recursos multimedia del sitio original del compañero; conservar su carpeta `assets/` al republicarlo.
- `LEEME-PRIMERO.txt`: instrucciones y estado de la entrega.

## Ejecutar el bot por QR

Requiere Node.js 24 LTS (mínimo 22.13). Desde la raíz del repositorio:

```sh
cd app/integrations/chatbot-server
npm ci
cd ../..
node scripts/start-local-qr.cjs
```

Abrir `http://127.0.0.1:8091/app/?vista=duena&seccion=chatbot`. La dueña escanea el QR desde WhatsApp → Dispositivos vinculados. Autorizar los números de prueba en el panel. El servidor debe permanecer encendido.

## Estado de la integración

El chatbot funciona como servidor local. Todavía falta publicarlo con HTTPS para conectarlo desde la APK y otros celulares, vincular la cuenta y comprobar una conversación real. No se incluyen claves de Gemini. La app conserva registros en el almacenamiento local de cada dispositivo y sus vistas Dueña/Trabajadora no son autenticación de producción. El chat público `/postula` sigue pendiente. La corrección de la presentación todavía debe publicarla su propietario en Netlify.

## Preparar la web

Desde `app/`:

```sh
node scripts/build-shipping.cjs
node scripts/build-chatbot-panel.cjs
node scripts/build-web.cjs
```

Publicar con acceso al proyecto Firebase:

```sh
firebase deploy --only hosting --project rapicostura-romario
```

Las actualizaciones web se reflejan en el APK al volver a abrir la app. Para cambios nativos consultar `app/android/README.md`; la clave privada de firma se conserva fuera del repositorio.

## Pruebas

```sh
node --test app/tests/*.cjs
node --test presentacion-parche/presenter-navigation.test.cjs
```

Dentro de `app/integrations/chatbot-server`, ejecutar `npm test` después de `npm ci`.

No se publican claves privadas, credenciales de WhatsApp, bases de datos de la instalación, dependencias descargadas ni cachés.
