# Requisitos y decisiones funcionales

## Alcance aceptado

HTML/CSS/JS puro, prototipo local navegable, datos de ejemplo y persistencia en navegador. Marca Rapicostura y morado del logo, con la estructura de GastosClaros. No incorpora dinero, ventas ni asistente IA en este prototipo; los archivos del proyecto financiero original permanecen como referencia.

## Roles

| Rol | Envíos | Recepción / Finalizados | Registrar | Finalizar |
| --- | --- | --- | --- | --- |
| Costurera | Salidas desde su sede | Entradas hacia su sede, filtrables por estado | Sí | Solo hacia su sede |
| Dueña / Admin | Una única sección para todas las sedes; filtros por estado y sede involucrada | Sin sección separada | Sí, eligiendo origen | No; solo la sede de destino |

Roles y sede son controles de simulación, no permisos de seguridad. Cada punto operativo tiene un perfil local estable (`sede-0` a `sede-4`), nombre de sede e iniciales propias. El origen de la costurera se fija a su perfil. Cambiar de perfil abre Recepción con los envíos entrantes de esa sede. Las salidas se consultan en Envíos. Los archivos se comparten por registro, no se duplican al cambiar de perfil. Los nuevos registros incluyen `createdByProfile`; al recibir se conserva `receivedByProfile`. No son cuentas remotas ni identidades de personas reales.

## Sedes

La empresa tiene cuatro distritos y cinco puntos operativos seleccionables:

1. José Luis Bustamante y Rivero (Av. Dolores).
2. José Luis Bustamante y Rivero (Siglo XX).
3. Cerro Colorado.
4. Yanahuara.
5. Cayma.

El destino excluye el origen y se reconstruye cuando cambia el origen. Los nombres se abrevian únicamente en tarjetas; los formularios conservan los nombres completos.

## Registro

- Evidencia requerida: una foto o video por envío. Al pulsar Subir evidencia se intenta abrir la cámara directamente; debajo aparece acceso a galería.
- Selector de dos tarjetas con giro: Encargo (materiales) y Trabajo (paquete de cliente para arreglo/costura). Solo una selección activa.
- Descripción opcional, máximo 500 caracteres. La primera línea aporta el título resumido; sin descripción se usa un título según tipo.
- Origen y destino obligatorios y diferentes.
- Fecha y hora de envío requeridas, autocompletadas en la zona de Perú y editables. Determinan `createdAt`. `registeredAt` conserva el instante real de guardado; no se pierde la distinción cuando se edita la fecha. Los registros anteriores conservan cualquier `plannedAt` existente para consulta.
- Guardado explícito de evidencia y registro; se comunica cualquier fallo de almacenamiento.

## Estados

La última aclaración del usuario determina el flujo: **registrar → En camino automático → confirmar recepción → Finalizado**. No hay botón manual para activar «En camino» ni seguimiento del transportista.

1. **Enviado**: hito completado en verde y empaquetado en la confirmación inicial. Es un evento, no un estado pendiente persistido.
2. **En camino**: barra hasta el punto central ámbar y camión blanco animado con humo. Empieza inmediatamente al registrar, con independencia de la fecha de envío editada.
3. **Recibido**: tres hitos verdes y check en el último, texto Recibido destacado y animación del check. El estado del registro se presenta como **Finalizado**.

## Recepción

Se precargan el destino y la evidencia original (solo lectura). Se permite una nueva evidencia opcional y observación de hasta 500 caracteres. La fecha y hora de recepción se autocompletan y pueden editarse; no se acepta una recepción anterior al envío. El botón **Confirmar recepción y finalizar ✓** conserva `receivedAt`, el instante real de confirmación `confirmedAt`, perfil de destino, evidencia adicional y observación. Solo una costurera cuyo perfil sea el destino puede abrir esta acción; la dueña supervisa sin finalizar. El detalle queda consultable y ya no ofrece el botón para finalizar nuevamente. La evidencia original se conserva.

## Esquema orientativo

```js
{
  id: 'RC-…',
  type: 'package' | 'work',
  title: 'Título resumido',
  description: '',
  origin: 0,                // índice del catálogo SITES
  destination: 2,
  createdAt: 'ISO-8601',
  registeredAt: 'ISO-8601', // instante real de guardado
  createdByProfile: 'sede-0',
  // plannedAt opcional: conservado únicamente para datos de versiones anteriores
  status: 'transit' | 'received',
  evidence: 'clave-IndexedDB',
  receivedAt: undefined,    // ISO-8601 al finalizar
  confirmedAt: undefined,
  receivedByProfile: undefined,
  receiptEvidence: undefined,
  receiptNote: undefined
}
// media[key] = { blob: Blob, type: 'image/jpeg', name: 'foto.jpg' }
```

Las fechas se muestran con `Intl.DateTimeFormat('es-PE')` y zona `America/Lima`. Para una integración real: migrar índices de sede a identificadores estables; definir usuarios y permisos desde servidor; sustituir almacenamiento local; gestionar concurrencia y archivos; acordar agenda operativa y recogidas. Este prototipo cubre entrega y recepción sin inventar un flujo adicional de transportista.

## Accesibilidad e interacción

Diálogos nativos con foco, Escape y cierre fuera del panel; etiquetas de formulario; estado de selección con `aria-pressed`; mensajes de error y confirmación; controles de video nativos; `prefers-reduced-motion`; adaptación móvil y áreas de desplazamiento separadas. Al cerrar la cámara se detienen sus pistas. El video no solicita micrófono.

## Filtro de supervisión

Debajo de Todos / En camino / Finalizados, el selector Sede involucrada incluye un envío cuando `origin === sede` **o** `destination === sede`. Se combina con el filtro de estado y actualiza también los contadores. Todas las sedes elimina la restricción. La navegación de la dueña muestra solo Envíos; la de costurera mantiene Envíos / Recepción. El mismo proceso animado se muestra para ambos roles.
