# Rapicostura chatbot: guía para asistentes de código

Lee este archivo antes de abrir el código: resume todo lo necesario para modificar o integrar el bot sin recorrer el proyecto entero.

## Qué es

Un chatbot de reclutamiento de costureras para Rapicostura (Arequipa, Perú). Empieza con un menú: **Quiero postular 🧵** o **Hacer consultas 💬**. La postulación sigue un guion fijo, que es el prototipo de `docs/prototipo.html`: experiencia, nombre, edad, distrito, 8 habilidades, local, cita y fecha. Guarda la postulación. En cualquier momento responde preguntas libres ("¿cuánto pagan?") con IA, usando solo la información de la empresa, y luego vuelve a la pregunta pendiente.

Un mismo proceso Node sirve los cuatro canales:
- **Web**: `public/index.html` imita WhatsApp y llama a `POST /api/chat`.
- **WhatsApp por QR** (Baileys, no oficial): las opciones se envían como encuestas.
- **WhatsApp oficial** (Meta Cloud API): webhook con botones y listas reales.
- **Panel local** `/setup/`: IA, información de la empresa, registro de preguntas, QR y Meta.

## Ejecutar y probar

```bash
npm ci
npm test          # node --test, ~30 pruebas, sin red (todo con mocks)
npm run bot       # http://localhost:8090  y  http://localhost:8090/setup/
```

Requiere **Node ≥ 22.13** (usa `node:sqlite`). Módulos ES. No hay build ni framework de frontend: el HTML y el JS van inline.

## Mapa de archivos (solo `src/rapicostura/` es el bot)

| Archivo | Qué hace |
|---|---|
| `server.js` | Punto de entrada. Express: `/api/chat` (web, sesión por cookie `rapi_session`), `/setup` (panel), `/webhook/meta`, `/health`, `/admin/requests` (Bearer `ADMIN_TOKEN`) y estáticos `public/`. Reconecta WhatsApp al arrancar si hay una sesión guardada. |
| `flow.js` | **El cerebro.** Clase `Bot` con el guion (`questions`), una máquina de estados y la detección de preguntas libres. Aquí se cambian textos y pasos. |
| `ai.js` | IA: `askCompany()` responde con las preguntas frecuentes primero (sin IA), luego Gemini u Ollama y, si no sabe, da el contacto humano. Incluye `geminiChat`, `ollamaChat`, `companyPrompt`, `aiProvider`. |
| `knowledge.js` | Información de la empresa: nombre, contacto, instrucciones, contexto y FAQ. `loadKnowledge`/`saveKnowledge` y `findFaq` (coincidencia por palabras, sin IA). |
| `empresa.default.json` | Contenido de ejemplo hasta que se guarde uno desde `/setup/`. |
| `dates.js` | Fechas: `parsePieces` (regex en español; saca día, hora y "en la tarde" aunque vengan por separado: "el lunes", "a las 10", "mañana 4pm", "el 20", "10 y media", "mediodía"; de 1 a 6 sin periodo = tarde), `validateDate` (lunes a sábado, 9:00 a 18:00, futura, zona Lima; si no se puede, devuelve `suggestion` con la alternativa más cercana), `naturalDate` ("mañana, lunes 19 de octubre, a las 9 de la mañana") e `interpretDate(texto, now, config, request, known)` (local primero; si falta algo, IA; une con lo ya sabido en `known`). Devuelve fecha completa, `{error, suggestion}`, `{partial}` o `{none}`. |
| `store.js` | SQLite. Tablas: `sessions` (estado por usuario), `deliveries` (respuesta pendiente y enviada, para idempotencia), `incoming`, `polls` (clave de cada encuesta), `questions` (registro de preguntas libres). Purga: 30 días para sesiones y preguntas, 7 para el resto. |
| `transport.js` | Adaptador de WhatsApp/Baileys: filtra (solo chats individuales y números autorizados), aplica ritmo humano, envía encuestas y descifra votos (`votoDe`). |
| `meta.js` | Adaptador de la Meta Cloud API: verificación del webhook, firma HMAC `X-Hub-Signature-256` y `metaPayload` (botones si hay ≤3 opciones de ≤20 caracteres, lista si hay ≤10, texto en otro caso). |
| `settings.js` | Configuración guardada desde el panel en `~/.local/share/rapicostura-bot/settings.json` (permisos 600). **Prevalece sobre `.env`** para las claves que guarda. |
| `setup-routes.js` / `setup.html` | Panel. Solo acepta conexiones locales (`localRequest`) y usa un token CSRF en la cabecera `X-Setup-Token`. |
| `../whatsapp.js` | Conexión Baileys: QR, reconexión y caché de mensajes enviados. Compartido con el servicio antiguo. |
| `../index.js`, `../queue.js`, `../routes/enviar.js` | **Legado**: microservicio de envíos (`/enviar`, campañas) en el puerto 3000 para un backend Flask antiguo. El bot no lo usa; se puede borrar si no se necesita. |

## Contrato central

Todos los canales llaman a lo mismo:

```js
const reply = await bot.message(sessionId, text, deliveryId?)
// sessionId: 'web:<uuid>' | 'wa:<jid>' | 'meta:<telefono>'  (el prefijo es el canal en el registro)
// reply = { message: string, options: string[], status: string, input?: 'text'|'number'|'date' }
```

- `options` son los botones. El canal decide cómo mostrarlos: botones en la web, encuesta en Baileys, botones o lista en Meta. Elegir una opción equivale a enviar su texto exacto, y escribir su número también funciona.
- `input:'date'` hace que la web muestre un selector que envía `"AAAA-MM-DD HH:mm"`. Ese formato exacto va directo al resumen, sin paso de confirmación.
- `bot.resume(sessionId)` devuelve lo pendiente sin avanzar (se usa al recargar la web).
- `deliveryId` hace atómico guardar el estado y la respuesta (`store.commit`). Así los reintentos de WhatsApp o Meta no responden dos veces.

### Estados (`state.status`)

`questions[0]` (`start`) es el menú; también entiende la intención escrita ("quiero trabajar", "tengo una duda"). `consultando` = modo consultas: todo mensaje va a `askCompany` sin pedir datos, con las opciones `Quiero postular 🧵` (salta a `step=1`) y `Volver al menú`.
`conversando` (sigue `questions[state.step]`) → `confirmando_fecha` (solo si la fecha vino escrita: "¿Te agendamos para…?"; también acepta otra fecha escrita en vez de "sí"; si la fecha no se puede, propone la alternativa y entra aquí; si llega solo el día o solo la hora, se guarda en `profile.pendingDate` y se pregunta lo que falta) → `revisando` (resumen) → `pendiente_confirmacion` (fin; el equipo confirma a mano).
Otras salidas: `sin_experiencia`, `consentimiento` → `finalizado` (cuando no quiere cita) y `borrado`. `state.paused` vale true después de "ayuda".
Comandos globales: `reiniciar` / `volver a empezar` / `empezar de nuevo`, `borrar mis datos`, `ayuda` / `necesito ayuda`, `continuar` / `volver a la pregunta`.

### Preguntas libres

`isQuestion(text)` detecta "¿", "?" o un inicio interrogativo (qué, cuánto, dónde…). En pasos con opciones también cuenta un texto de más de 3 palabras que no sea una opción. En esos casos se llama a `askCompany` y se responde con `respuesta + "\n\n" + pregunta pendiente`, sin avanzar de paso, y se registra en la tabla `questions`.
**Privacidad:** a la IA solo se le envía el texto de la pregunta, nunca el perfil.

## IA

- `aiProvider()`: usa `DATE_AI_PROVIDER` (`gemini` | `ollama`); si no está, Gemini cuando hay `GEMINI_API_KEY` y Ollama en otro caso. La misma IA responde preguntas y fechas. Groq existe solo para fechas.
- El prompt (`companyPrompt`) junta las instrucciones de la empresa, el contexto y las FAQ, y pide JSON `{conoce, respuesta}`. Si `conoce=false`, se responde con el contacto humano. La IA no debe inventar sueldos ni direcciones.
- Gemini: `generativelanguage.googleapis.com/v1beta/models/<modelo>:generateContent`, con la clave en la cabecera `x-goog-api-key`. Modelo predeterminado: `gemini-3.5-flash-lite`.
- Ollama: `OLLAMA_URL` (por defecto `127.0.0.1:11434`), modelo `qwen2.5:1.5b` (liviano, funciona con CPU). `OLLAMA_MODEL=''` desactiva la IA local.
- Las FAQ con coincidencia alta (`score ≥ 0.6`) se responden sin llamar a la IA.

## WhatsApp por QR (Baileys): detalles que se rompen con facilidad

- Solo responde a `WHATSAPP_ALLOWED_JIDS`. Resuelve contactos `@lid` con `senderPn` o `onWhatsApp`.
- **Encuestas:** con 2 a 12 opciones se envía el texto y luego una encuesta de selección única. Con 1 opción se agrega "Necesito ayuda" (o "Volver a empezar") porque WhatsApp exige al menos 2. El voto llega cifrado (`pollUpdateMessage`) y esta versión de Baileys (6.7.x) no lo descifra sola: `votoDe` usa `decryptPollVote` con la `messageSecret` guardada en `polls` y prueba combinaciones de jid/lid del bot y de quien vota. Solo vale la última encuesta de cada chat, y se borra al enviar una respuesta sin opciones.
- Varias personas a la vez: cada chat tiene su sesión, su cola y su candado, y `gap` reparte los envíos. Por Baileys solo responde a los números autorizados; en la web y en Meta responde a cualquiera.
- **Ritmo humano** (`PACES` en `transport.js`, `WHATSAPP_PACE` = `normal` | `lenta` | `muy_lenta`): espera, marca como leído, piensa, muestra "escribiendo…" proporcional al largo, deja un espacio global entre envíos y frena a quien manda más de 15 mensajes en 5 minutos. El parámetro `pause(ms)` se inyecta, y en las pruebas es `async()=>{}`.
- La sesión se guarda en `~/.local/share/rapicostura-bot/whatsapp-auth/`. Si existe `creds.json`, el bot se reconecta solo al arrancar (`WHATSAPP_ENABLED=false` lo impide).

## Panel `/setup/`

Cinco secciones en `setup.html`: 1) IA (proveedor, clave y modelo de Gemini, modelo local, botón "Probar IA"); 2) información de la empresa (nombre, contacto humano, instrucciones, contexto y FAQ → `empresa.json`); 3) preguntas que hicieron (tabla `questions`); 4) WhatsApp por QR (números autorizados, QR y velocidad de respuesta); 5) Meta (phone number ID, token, app secret, URL del webhook y token de verificación).
Rutas en `setup-routes.js`: `GET /setup/status` (configuración pública + estado de WhatsApp + token CSRF), `POST /setup/settings`, `GET|POST /setup/knowledge`, `GET /setup/questions`, `GET /setup/ai`, `POST /setup/test-ai`, `POST /setup/test-date`, `POST /setup/connect` (pide el QR), `POST /setup/greet` `{phone}` (saludo de prueba: agrega el número a los autorizados y el bot le escribe primero con el menú; usa `saludar()` → `handler.greet` en `transport.js`, solo Baileys). Todo `POST` exige `X-Setup-Token`. Las claves secretas nunca vuelven al navegador: solo se indica si están guardadas.
Si se expone el panel fuera de `localhost`, hay que ponerle autenticación antes: hoy la única protección es `localRequest`.

## Meta Cloud API

- La ruta `/webhook/meta` se monta **antes** de `express.json()` porque necesita el cuerpo sin procesar para la firma. No cambies ese orden.
- Requiere `META_PHONE_NUMBER_ID`, `META_ACCESS_TOKEN` y `META_APP_SECRET`. `META_VERIFY_TOKEN` se genera al guardar en el panel. `META_GRAPH_VERSION` vale `v23.0` por defecto.
- El webhook responde 200 de inmediato y procesa en segundo plano. El id de cada botón o fila es el texto de la opción.
- Necesita una URL pública con HTTPS (proxy o túnel). Responde a cualquier número; la lista de autorizados aplica solo a Baileys.

## Configuración y datos

- Carpeta privada: `BOT_STATE_DIR` (por defecto `~/.local/share/rapicostura-bot/`) con `settings.json`, `empresa.json`, `rapicostura.sqlite` y `whatsapp-auth/`. **Nunca la subas a Git ni la sirvas por web.**
- Variables: ver `.env.example`. Las importantes: `BOT_PORT` (8090), `BOT_HOST` (127.0.0.1), `COOKIE_SECURE`, `ADMIN_TOKEN`, `GEMINI_API_KEY`, `OLLAMA_MODEL`, `WHATSAPP_ALLOWED_JIDS`, `WHATSAPP_PACE` y `META_*`.

## Convenciones del código

- Estilo **compacto**: funciones en una o pocas líneas y pocos comentarios, que explican el *porqué* y van en español. Imita el estilo del archivo que edites.
- Textos para usuarias: español de Perú, cálido, trato de "tú", con emojis 💜🧵😊, igual que el prototipo.
- Cada cambio de comportamiento lleva una prueba en `test/` (`node:test`, con `Store(':memory:')`, IA y red simuladas mediante parámetros inyectados: `new Bot(store, parse, ask)`, `request`, `pause`, `getSocket`).
- Las fechas siempre se validan en el servidor (`validateDate`), aunque vengan de la IA o del selector.

## Recetas rápidas

- **Cambiar o agregar una pregunta del guion:** edita `questions` en `flow.js`. Si agregas una clave al perfil, actualiza `summary()` y la prueba `prepared()` en `test/bot.test.js`, que avanza paso a paso.
- **Cambiar lo que sabe la IA:** desde `/setup/` (se guarda en `empresa.json`) o con los valores por defecto en `empresa.default.json`.
- **Nuevo canal:** llama a `bot.message('<canal>:<id>', texto, idDeEntrega)` y renderiza `reply.options`. Toma `meta.js` como plantilla.
- **Ver postulaciones:** `GET /admin/requests` con `Authorization: Bearer $ADMIN_TOKEN`, o abre la tabla `sessions` en SQLite.

## Diagnóstico rápido

- **"Se demora en responder" por WhatsApp:** casi siempre es el ritmo humano, no la IA. La IA tarda menos de 1 s (Gemini) y el flujo sin IA unos 40 ms. Con `lenta` cada respuesta tarda unos 35 s, con `normal` entre 5 y 15 s. Si `WHATSAPP_PACE` no está definido, el código usa `lenta`. Se cambia en el panel (sección 4).
- **Un voto de encuesta no avanza:** el log dice `Mensaje ignorado (no es texto ni un voto vigente)`, precedido por `Voto descartado: …` con la causa (encuesta anterior, sin encuesta guardada o descifrado fallido, con los jid probados).
- **Logs de Baileys** `stream errored out` código 515 justo después de escanear el QR, o `Timed Out` en `init queries`: son normales y la conexión se recupera sola.
- Mide la web con `curl -w '%{time_total}' -b c.txt -c c.txt -H 'Content-Type: application/json' -d '{"text":"¿cuánto pagan?"}' localhost:8090/api/chat` y revisa `GET /health`.

## Traspaso e integración en otro proyecto

- Copia el repositorio sin `node_modules/` y haz `npm ci`. La carpeta de datos (`BOT_STATE_DIR`) **no** viaja con el código: el equipo nuevo configura su propia IA, empresa y QR desde `/setup/`. Si se copia a propósito para conservar la sesión de WhatsApp, el bot anterior debe apagarse: una misma sesión de Baileys en dos máquinas se desconecta mutuamente.
- Se puede montar como servicio aparte (recomendado: proceso propio en `BOT_PORT`, detrás de un proxy para `/webhook/meta` y `/api/chat`) o incrustar el `Bot` en otra app Node: `new Bot(new Store(ruta))` y llamar a `bot.message`. El frontend web es `public/index.html` y solo necesita `POST /api/chat` con cookie.
- Las postulaciones terminadas se leen con `GET /admin/requests` (requiere `ADMIN_TOKEN`). Para enviarlas a otro sistema, el punto natural es el cambio a `pendiente_confirmacion` en `flow.js`.
- `.claude/launch.json` define el servidor `bot` (`npm run bot`, puerto 8090) para la vista previa de Claude Code.

## Pendiente o conocido

- No hay calendario de cupos: la cita es una solicitud que el equipo confirma a mano.
- No hay cola de reintentos automática si un envío falla y WhatsApp no repite el mensaje.
- Baileys puede desconectarse o recibir restricciones de Meta. Para producción se recomienda la Cloud API.
