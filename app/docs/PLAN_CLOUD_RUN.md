# Plan de integración del chatbot con Firebase y Cloud Run

Estado: propuesta previa al despliegue del servidor. Se leyó references/chatbot/AGENTS.md. El acceso visual al panel ya está publicado, pero no hay bot remoto conectado. La copia de integración está en integrations/chatbot-server; el original se conserva en references/chatbot.

## Arquitectura

Firebase Hosting sirve la app y una página pública de consultas/postulación. POST /api/chat y /webhook/meta se reenvían al servicio rapicostura-bot, región us-central1, en el proyecto rapicostura-romario. Las rutas administrativas nuevas se ubican bajo /api/admin para aprovechar el mismo rewrite. El selector Dueña es solo una vista del prototipo: no autoriza solicitudes. El servidor verificará Firebase ID tokens y una claim de administradora. /setup sigue local y se bloquea expresamente en modo nube, incluso si llega desde un proxy de loopback.

## Archivos previstos

Rutas del bot relativas a integrations/chatbot-server/:

- src/rapicostura/server.js: configuración PORT/0.0.0.0 en nube, cookie __session, modo de almacenamiento, montaje de rutas y cierre limpio; conservar webhook antes del parser JSON.
- src/rapicostura/web-routes.js (nuevo): router comprobable de chat web, cookie y validación de Origin contra dominios explícitos. No confiar ciegamente en X-Forwarded-Host.
- src/rapicostura/firestore-store.js y turn-store.js (nuevos): persistencia compartida y adaptador por turno para conservar el contrato síncrono del Bot. Estado + respuesta por deliveryId se guardan en una transacción con control de versión; exclusión por sesión entre instancias y recuperación de turnos interrumpidos. Las llamadas externas a IA no se ejecutan dentro de una transacción reintentable. Conservar get, commit, delivery, sentDelivery, save/saveDelivery, savePoll/latestPoll/clearPolls, logQuestion/recentQuestions, seen/mark y purge.
- src/rapicostura/store.js: conservar SQLite para local/pruebas; no retirar compatibilidad existente. Sustituir acceso directo store.db de /admin/requests por una operación del repositorio.
- src/rapicostura/meta.js y task-routes.js (nuevo): validar firma con cuerpo original; persistir/encolar la recepción antes de responder 200. Procesar mediante Cloud Tasks con endpoint interno autenticado OIDC, reintentos e idempotencia por mensaje. No prometer entrega exactamente una vez ante un fallo entre enviar a Meta y registrar el envío: ese intervalo requiere reconciliación.
- src/rapicostura/admin-auth.js (nuevo), app-admin-routes.js: verificar Firebase Auth y claim admin; 401/403 para solicitudes no autorizadas. No usar el modo visual Dueña como permiso ni guardar ADMIN_TOKEN en el celular. El puente Bearer preparado anteriormente no será el mecanismo público de administración en la nube.
- src/rapicostura/settings.js: en nube leer secretos de entorno/Secret Manager y no crear settings.json. No sobrescribir secretos desde la interfaz ni presentarlos como guardados. Modelos y opciones no secretas tendrán configuración persistente separada.
- src/rapicostura/knowledge.js y ai.js: información de empresa/FAQ en Firestore en modo nube, con invalidación de caché entre instancias; archivos locales conservados para local/pruebas. No dejar empresa.json en disco efímero.
- Dockerfile, .dockerignore, package.json, package-lock.json y .env.example: Node compatible (>=22.13), npm ci --omit=dev, arranque del bot, firebase-admin y dependencias de tareas; COOKIE_SECURE=true y WHATSAPP_ENABLED=false en nube. No copiar secretos, bases locales ni sesiones de WhatsApp a la imagen.
- test/: cookies/origen, Firestore/transacciones, carreras entre instancias, recepción duplicada y fallos/reintentos, permisos admin, persistencia de FAQ y modo nube. Red/IA simuladas y Firestore Emulator para validar transacciones reales antes del despliegue.

En la app:

- firebase.json: rewrites /api/** y /webhook/meta antes del comodín de index.html; mantener videos y cabeceras. Incorporarlos solo al publicar un servicio comprobado.
- dist/chatbot-panel.js, dist/chatbot-panel.css y scripts/build-chatbot-panel.cjs: mismo dominio, login Firebase para administradoras, eliminar formulario de URL/clave en modo nube. Meta como canal disponible; QR/Ollama local deshabilitados con explicación. Los secretos se administran fuera del panel en esta primera fase.
- dist/bot/index.html (nuevo, basado en public/index.html): interfaz pública de consultas/postulación sin sustituir la aplicación de trabajadoras. fetch relativo /api/chat y cookie HttpOnly.
- scripts/build-web.cjs y README.md: empaquetado y documentación de rutas, configuración y despliegue.

flow.js y dates.js permanecen intactos. El adaptador por turno mantiene la API que utilizan. Ningún texto del guion ni criterio de fechas se cambia.

## Orden y criterios de cierre

1. Separar routers y adaptar sesiones; pruebas del flujo original sin cambios.
2. Implementar persistencia y concurrencia; probar reinicio y dos instancias con Emulator.
3. Persistencia de FAQ, secretos de entorno y autorización real de administradoras.
4. Cola durable Meta, contenedor y configuración de nube.
5. Integrar chat público/panel bajo Hosting y probar en web y APK.
6. Ejecutar npm test completo en Node/Linux y Windows, corrigiendo la aserción POSIX de permisos para que compruebe 0600 solo en sistemas que lo soportan. Mantener las pruebas de enmascarado y persistencia. Hoy: 33/34 pasan en Windows; las tres pruebas nuevas de acceso pasan.
7. Antes de crear recursos: comprobar proyecto, Firestore, Firebase Auth, facturación y permisos disponibles. Cloud Run requiere facturación habilitada; no se habilitará ni contratará nada como parte de la propuesta.
8. Desplegar servicio, comprobar salud/sesión/firma Meta/autorización y después Hosting con rewrites. Preparar rollback de ambas revisiones. No enviar mensajes reales de WhatsApp durante pruebas sin instrucción explícita.

## Referencias oficiales verificadas

- https://firebase.google.com/docs/hosting/cloud-run
- https://firebase.google.com/docs/hosting/manage-cache (__session)
- https://docs.cloud.google.com/run/docs/container-contract (puerto y disco efímero)

Esta propuesta no ha desplegado Cloud Run, creado Firestore ni conectado WhatsApp. El ZIP rapicostura-chatbot-integrado.zip es la integración preliminar del panel, no una migración a Cloud Run terminada.


## Avance del 18/10/2026 tras recibir respuestas del equipo

- Confirmado: empezar sin datos privados; usar empresa.default.json como información inicial a revisar; credenciales fuera de la app; Meta no está configurada; Gemini requiere una nueva clave para el proyecto.
- Verificado por API de solo lectura: rapicostura-romario tiene billingEnabled=false. Cloud Run y Firestore devuelven HTTP 403 PERMISSION_DENIED (no distingue servicio deshabilitado de permisos insuficientes). No se modificaron cuentas ni recursos.
- Implementado en la copia de integración: web-routes.js, __session, dominios permitidos, cookie Secure en Cloud Run, validación de puerto y enlace 0.0.0.0 con K_SERVICE. El servidor usa el nuevo router. flow.js y dates.js verificados idénticos al original.
- npm test: 38/38 aprobadas en Windows. Aserción POSIX 0600 limitada a plataformas que soportan esos modos; quedan activas las otras comprobaciones de configuración.
- Pendiente de implementar: Firestore con concurrencia, config persistente, Firebase Auth y claims, panel sin secretos/QR, cola durable de Meta, contenedor, rewrites y publicación del chat público. No se publicó ningún cambio adicional en Hosting en este paso.
- Pendiente del equipo: correo(s) de administradoras, administrador de facturación, nueva clave configurada en privado, confirmar ubicación del chat y alcance de revisión/incorporación de postulaciones.
- No activar trust proxy=true sin determinar la cadena de proxies y bloquear el origen falsificado. No registrar Authorization, Cookie, texto de conversaciones ni cuerpos del webhook para depurar el despliegue.


## Cambio de método solicitado por Romario: WhatsApp por QR

El usuario eligió Baileys por QR en lugar de Meta/Cloud Run. El plan Cloud Run anterior queda como alternativa futura. Se inició una instancia aislada local en 127.0.0.1:8091, con la app servida en /app/ y el panel enlazado a /setup usando CSRF y las restricciones locales existentes. Se verificó estado qr y una imagen real; no se considera vinculada hasta que la dueña escanee. La sesión de esta instancia se guarda en .local-data/chatbot-qr/whatsapp-auth, fuera de dist y Git. No se enviaron mensajes de prueba. El backend no es accesible desde otros celulares ni la APK remota: esa parte requiere un servidor persistente y HTTPS. Para arrancar esta misma instalación: node scripts/start-local-qr.cjs. npm test: 38/38.
