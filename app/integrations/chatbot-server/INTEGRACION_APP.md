# Panel del chatbot dentro de Rapicostura

Esta copia incorpora el panel original a la aplicación en Firebase/APK. Conserva `/setup/` restringido a la computadora local y añade `/app-admin/` con autenticación Bearer, origen permitido, límite de intentos y respuestas sin caché. No arranca WhatsApp ni envía mensajes hasta que se ejecute/configure el servidor y una persona lo solicite.

## Para el compañero que mantiene el bot

1. Conserva la configuración y base de datos existentes fuera del código, como en el proyecto original. Usa esta copia o incorpora `src/rapicostura/app-admin-routes.js` y las dos adiciones a `src/rapicostura/server.js`.
2. En el entorno del servidor, configura `APP_ADMIN_TOKEN` con al menos 32 caracteres aleatorios. Ejemplo para generar una clave nueva: `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. No publiques esa clave ni la incluyas en el frontend.
3. `APP_PANEL_ORIGINS` admite por defecto `https://rapicostura-romario.web.app` y `https://rapicostura-romario.firebaseapp.com`. Si usas otro dominio, añádelo explícitamente separado por comas.
4. Instala dependencias con `npm ci` y publica el proceso `npm run bot` detrás de HTTPS. La URL pública debe dirigir a la raíz de este servidor; no cambies las restricciones de `/setup/` ni lo expongas mediante un proxy que haga pasar todas las conexiones por locales. La app usa únicamente `/app-admin/`.
5. Entrega a la dueña la dirección HTTPS y la clave por un medio privado. En la app: **Dueña → Equipo → Configurar chatbot**. Introducirlos conecta el panel al servidor real. No son la clave de Gemini ni el token de Meta.

El servidor necesita permanecer encendido. SQLite y los archivos de sesión deben tener disco persistente. Firebase Hosting por sí solo no ejecuta este proceso Node.js. No se ha contratado alojamiento ni configurado credenciales reales en esta integración.

La app conserva solo la dirección pública; la clave de administración vive en memoria y se elimina al cerrar la conexión o cambiar a Trabajadora. Las claves de IA y Meta se envían al servidor al guardar y se limpian de los campos. Los indicadores de conexión y guardado provienen de respuestas reales del servidor.

Pruebas: `node --test test/app-admin.test.js` y `npm test`. Se usan conexiones simuladas; no se envían mensajes reales de WhatsApp.

Validación actual en Windows: 38/38 pruebas pasan. La aserción de modo POSIX 0600 se aplica solo fuera de Windows; en Windows continúan las comprobaciones de enmascarado, guardado y validación. Los permisos/ACL del alojamiento definitivo requieren validación allí.

## Preparación para Cloud Run: estado real

Se extrajo web-routes.js y se implementaron __session, Secure en Cloud Run, ALLOWED_ORIGINS y PORT/0.0.0.0. flow.js y dates.js son idénticos al original. Estos cambios NO completan la migración: aún se usa SQLite y archivos locales, y el panel remoto preliminar usa Bearer en vez de Firebase Auth. No publicar esta copia en Cloud Run hasta completar el plan docs/PLAN_CLOUD_RUN.md de la app.

Consulta de solo lectura del proyecto rapicostura-romario el 18/10/2026: billingEnabled=false. Firestore y Cloud Run respondieron PERMISSION_DENIED; esa respuesta no permite concluir por sí sola si el servicio está deshabilitado o faltan permisos. No se vinculó facturación ni se crearon recursos. Meta oficial aún no está configurada, según el equipo.
