# Rapicostura unificada

Una aplicación móvil web con Trabajos, Recepción, Envíos, Compañeras y Videos. La dueña consulta el equipo, los arreglos y los envíos desde su vista.

Recepción diferencia prendas de clientes y paquetes de otra sede. Una trabajadora habilitada registra el cliente, sus prendas e indicaciones. El módulo de envíos del compañero conserva cámara, galería, videos, rutas y confirmación de llegada. Ambos módulos comparten persona, sede, navegación y registros; no se abren como páginas independientes.

## Implementación

`dist/` contiene la aplicación estática publicada. `references/companion/` conserva el código original del ZIP. `node scripts/build-shipping.cjs` genera el módulo adaptado, aislando sus estilos mediante Shadow DOM. `integrated.js` une la navegación y `integration-model.js` conecta paquetes con identificadores de prendas. Para ajustes móviles originales: `node scripts/phone-layout.cjs`.

Los envíos de trabajo requieren prendas registradas. No pueden estar en dos envíos pendientes a la vez. Al recibir, se marca cada prenda y se actualiza su ubicación; esto no cambia su responsable ni termina el arreglo. Los acuerdos de apoyo, la revisión de calidad y la entrega al cliente conservan su flujo propio. La calidad y entrega se bloquean mientras una prenda está en tránsito.

## Publicación y pruebas

Firebase Hosting, proyecto `rapicostura-romario`, publica únicamente `dist/`:

```powershell
firebase deploy --only hosting --project rapicostura-romario
node --test tests/work-section.cjs tests/integration.cjs
```

Rutas: `?vista=duena`, `?vista=recepcion`, `?recepcion=paquetes`, `?seccion=envios`. El selector de personajes de prueba aparece con `?modo=demo`.

## Alcance actual

Es un prototipo local. Los registros se guardan juntos en `hilando-v1` (localStorage); archivos en IndexedDB. Firebase Hosting aloja la web; todavía no hay autenticación ni sincronización entre celulares. Los datos de otro dominio no se trasladan automáticamente. Los registros locales anteriores se conservan. No hay integración con empresas de transporte.

En escritorio conserva el marco móvil 430 × 870 px y hasta 480 px ocupa la pantalla. Los botones y textos priorizan el uso sencillo. Se recomienda validar el flujo con las trabajadoras.

## Preparar actualizaciones

Después de editar los archivos fuente de dist, ejecuta primero node scripts/build-shipping.cjs y luego node scripts/build-web.cjs antes de publicar. El segundo paso genera un CSS y un JS con nombre según su contenido, retira dibujos iniciales intermedios y evita depender de fuentes externas. Los estilos de envíos se incluyen en su módulo para evitar destellos sin formato. Conserva los archivos fuente para las siguientes ediciones.

Las sedes de perfiles, recepción y envíos comparten branch-catalog.js, incluido Avelino Cáceres. Las sedes históricas se agregan al final y su orden se conserva en branchCatalog para no cambiar los índices de envíos. Registrar una prenda desde Trabajos abre directamente el formulario del cliente y selecciona esa pestaña de Recepción.

## APK para Android

El instalador está en la carpeta padre como Rapicostura.apk. Carga la web de Firebase y revisa sus actualizaciones al abrir o volver a la aplicación, sin recargar formularios abiertos. Requiere Android 8 o posterior e internet. Para reconstruir: ./scripts/build-android.ps1. Las instrucciones, firma y límites de validación están en android/README.md. El APK no se publica en Hosting Spark porque el servicio lo rechazó; la web sigue publicándose normalmente.

El selector de vista está visible junto a la sede y recuerda Trabajadora o Dueña. Avelino Cáceres (Siglo XX) es una sola sede; el catálogo versión 2 convierte los nombres e índices anteriores sin borrar registros ni cambiar el estado del trabajo. La APK existente recibe estos cambios desde la web.

Los tutoriales incluidos en published-guides.js usan videos públicos de dist/videos y están disponibles en todos los dispositivos. Los archivos tienen nombre según su contenido y caché inmutable. Los videos subidos mediante el formulario de la dueña siguen guardándose localmente en IndexedDB.

Catálogo vigente (versión 3): nombres tomados del selector del chatbot: Siglo XX · José Luis Bustamante y Rivero; Cerro Colorado; Yanahuara; Cayma; Dolores · José Luis Bustamante y Rivero. Los nombres anteriores de Avelino y Av. Dolores se convierten a estos nombres en perfiles, prendas y envíos.

## Panel del chatbot

Acceso: Dueña → Equipo → Configurar chatbot, o `?vista=duena&seccion=chatbot`. Conserva los cinco apartados del panel original. Antes de `build-web.cjs`, ejecuta también `node scripts/build-chatbot-panel.cjs`.

La interfaz necesita la URL HTTPS del servidor y una clave de administración. Sin ellas permanece sin conectar: no guarda cambios en un bot real. La copia del backend con el puente autenticado y las instrucciones está en `integrations/chatbot-server/INTEGRACION_APP.md`. La clave no se guarda en localStorage ni se incluye en la web publicada.

## Bot de WhatsApp por QR: instalación local

Ejecuta `node scripts/start-local-qr.cjs`. Abre `http://127.0.0.1:8091/app/?vista=duena&seccion=chatbot`. El panel se conecta al bot de la misma computadora mediante /setup y su token CSRF. El servidor solo escucha en loopback y la ruta /app también comprueba Host y origen locales. El puerto 8090 estaba ocupado por otro programa; esta instalación usa 8091.

Pulsa Mostrar QR de WhatsApp. La dueña escanea desde Dispositivos vinculados en el WhatsApp 957536688. El QR caduca y se renueva mientras el servidor está activo. Escanear es una acción de la persona; el sistema no vincula el número por escribirlo. Los datos de esta instalación están en .local-data/chatbot-qr (ignorado por Git); no compartir whatsapp-auth ni copiarlo al ZIP. Para reiniciar, ejecuta el mismo script y pulsa Mostrar QR: usará la sesión guardada si sigue vigente. No conectar la misma sesión desde dos máquinas.

Solo los números autorizados en el panel pueden probar el bot. No se ha enviado ningún saludo de prueba ni configurado Gemini. Sin clave de IA, el bot mantiene su flujo y respuestas de FAQ; las consultas que no conoce se derivan al contacto humano.

Este panel local aún no está conectado al dominio Firebase ni a la APK en otros celulares. Para eso hace falta publicar el proceso en un servidor persistente con HTTPS y configurar su URL y autenticación en el panel remoto. La conexión QR no requiere Facebook/Meta ni facturación de Firebase para esta prueba local.

Corrección del panel QR: el código y su estado se muestran en una tarjeta al principio. Mostrar QR no guarda ajustes de IA y, si ya existe uno, lo muestra sin reiniciar la conexión. En Firebase, sin servidor conectado, los controles se ocultan y aparece Abrir bot de esta computadora. La prueba de vinculación y respuesta real sigue pendiente hasta escanear y autorizar un número de prueba. Pruebas de regresión: node --test tests/chatbot-qr.cjs.
