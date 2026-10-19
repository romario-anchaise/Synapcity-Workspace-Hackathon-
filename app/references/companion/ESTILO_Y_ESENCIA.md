# Rapicostura · Estilo y esencia compartida

Este documento es el contrato visual de la sección Envíos / Recepción. Fuente de verdad implementada: `styles.css` (variables `:root`). Fecha: 17/10/2026. Conservar el sistema de GastosClaros como referencia de estructura; aplicar estos tokens para integrar la nueva marca.

## Esencia

**Cada puntada une. Cada entrega nos conecta.**

Una herramienta cálida entre compañeras de costura, clara y confiable. Cada encargo representa trabajo compartido entre sedes. El cuidado se expresa en superficies suaves, violeta textil, líneas de puntada y mensajes cercanos. La interfaz debe ayudar a saber qué salió, hacia dónde va y si ya llegó.

Usar lenguaje corto y humano: «Tu trabajo sigue su camino», «Ya está en tus manos», «Confirmar recepción y finalizar». Sin vocabulario financiero, bot IA, rankings ni presión comercial. Las habilidades y el mensaje de reclutamiento aportan contexto de marca; no forman un flujo de contratación en esta sección.

## Paleta implementada

| Token CSS | HEX | Función |
| --- | --- | --- |
| `--bg` | `#20152C` | Fondo principal de aplicación y formulario |
| `--surface` | `#2C2039` | Tarjetas, campos, paneles |
| `--raised` | `#372846` | Acciones secundarias y relieve |
| `--brand` | `#B88BDD` | Acento lavanda, iconos, selección |
| `--brand-deep` | `#633383` | Violeta de marca de referencia |
| `--text` | `#FAF6FF` | Texto principal |
| `--muted` | `#C0ADC9` | Texto secundario |
| `--line` | `#FFFFFF15` | Separadores y bordes discretos |
| `--green` | `#81D3B0` | Recibido, check, confirmaciones |
| `--amber` | `#EFC479` | En camino |
| `--danger` | `#FFA0AE` | Validación y errores |

Fondos adicionales exactos: escritorio `#EEE8F1`, halo `#E1D3E9`; navegación `#2A1E36`; splash `#48236B`. Hero con gradiente `125deg, #593373 → #422652`. CTA `#BD92DC` con texto `#261332`; botón + `135deg, #C59BE1 → #9564B5`. El morado del archivo original no se altera: el logo se incluye como imagen, completo y sin recortar.

El fondo claro exterior es el escenario de presentación del prototipo en escritorio. Las pantallas reales de aplicación mantienen el tema oscuro. No copiar el marco de teléfono ni la composición editorial al unir secciones de la app.

## Tipografía

Sin fuentes remotas. UI: `Trebuchet MS, Arial, sans-serif`; marca y frase editorial: `Georgia, serif`, cursiva solo donde aporta identidad. En Android se usa la alternativa disponible del sistema. Si el equipo añade una fuente compartida después, acordar y empaquetar sus archivos antes de sustituir la familia.

| Uso | Tamaño | Tratamiento |
| --- | --- | --- |
| Título de pantalla | 25 px | Peso 500, tracking -0.8 px |
| Título de formulario | 23 px | Peso 500 |
| Hero | 24 px | Interlínea 1.2 |
| Títulos de tarjeta / formulario | 12 px | Claros y compactos |
| Cuerpo de modal | 12 px | Interlínea 1.6 |
| Descripción de hero | 11 px | Interlínea 1.6 |
| Metadatos | 9–10 px | Texto secundario |
| Etiqueta de navegación | 9 px | Icono encima |
| Frase editorial de escritorio | 40–64 px | Serif; no se usa dentro del móvil |

El prototipo prioriza densidad similar al referente. Para producto final, revisar escalado de texto del sistema y elevar metadatos pequeños si las pruebas con usuarias lo requieren.

## Formas, composición y espacio

- Módulo de espaciado: 4 px. Gaps habituales 8, 10, 12, 16, 20 y 24 px.
- Tarjetas: radio 20 px, padding 16 px, borde fino `--line`.
- Campos y botones: radio 12 px; altura mínima 46–47 px.
- Dialog: radio 26 px, padding 24 px, ancho máximo 410 px; móvil pegado abajo, esquinas superiores redondeadas.
- Evidencia: radio 14 px y borde discontinuo violeta.
- Tipo Encargo / Trabajo: dos columnas iguales, altura 146 px, giro de tarjeta; check y selección explícita al dorso.
- Navegación inferior fija, dos secciones y botón circular central + de 57 px elevado 19 px.
- Contenido con scroll independiente; cabecera y navegación visibles. Respetar `safe-area-inset-*`.
- Ancho de demostración: 430 px, marco de 8 px. En móvil ≤480 px usar 100 % del ancho y `100dvh` sin marco.

## Iconografía y recursos

SVG lineal local, grosor 1.5, extremos y uniones redondeados. Caja para Encargo; aguja e hilo para Trabajo; flecha hacia bandeja para Recepción; pin para sede. No depender del color por sí solo: acompañar con texto, checks y posición. Evitar mezclar bibliotecas de iconos al integrar.

El logo original vive en `assets/rapicostura-logo.png`; se muestra en splash sobre violeta. La cabecera compacta usa el nombre en texto y una R con borde de puntada; no pretende reemplazar el logo oficial.

## Movimiento

| Elemento | Duración | Comportamiento |
| --- | --- | --- |
| Splash | 1350 ms + fundido 500 ms | Logo y línea de hilo pulsante |
| Apertura de tarjeta/panel | 300–400 ms | Opacidad y subida 16 px |
| Selección del tipo | 550 ms | Giro en Y, perspectiva 700 px |
| Botón | 200 ms | Escala .97; + mantiene elevación |
| Paquete | 1800 ms, repetido | Tapa se desplaza 7 px |
| Camión | 1000 ms, repetido | Desplazamiento 3 px y salto 2 px |
| Ruedas / humo | 1500 / 1200 ms | Giro y disipación |
| Check recibido | 3000 ms, repetido | Trazo se marca y desmarca |

Curva compartida `cubic-bezier(.22,1,.36,1)`. Sin librerías de animación. Implementar `prefers-reduced-motion: reduce` para desactivar movimiento y mostrar el check completo.

## Componentes para integrar

Reutilizar `.shipment-card`, `.route`, `.badge`, `.progress`, `.sheet`, `.upload`, `.primary`, `.secondary`, `.context` y `.bottom-nav`. Los estados de proceso son `.sent`, `.transit`, `.received`; «Finalizado» corresponde a `received`. No introducir un nuevo nombre de estado en la otra sección sin acordarlo.

Los estilos actuales son globales dentro de una página independiente. Al unir aplicaciones, cargar un único `:root`, normalizar el reset y encapsular reglas globales (`body`, `button`, `h2`, `main`, etc.) bajo un contenedor de app si existen otros estilos. No concatenar sin revisar ambos CSS.

## Checklist de integración

1. Usar la misma paleta, familias, radios y escala de espacio.
2. Compartir un catálogo de sedes, zona `America/Lima` y etiquetas de estado.
3. Conservar una única navegación y un único punto de apertura del botón +.
4. Acordar el modelo de datos antes de conectar servicios; no reutilizar campos monetarios del sistema original.
5. Probar registro → en camino automático → recepción → finalizado, en las dos secciones.
6. Verificar en móvil estrecho, teclado, textos largos, cámara denegada, almacenamiento lleno y movimiento reducido.

## Actualización: perfiles y supervisión unificada

El avatar muestra DO, SX, CC, YA o CA según el perfil de sede; la dueña usa AD. La cabecera indica el perfil activo. En el selector de perfil, `.profile-summary` muestra identificador estable y cantidad de envíos por recibir, con superficie y radio compartidos. El formulario fija el origen para costureras.

La costurera mantiene dos accesos (Envíos y Recepción). La dueña usa una sola sección Envíos del equipo; `.admin-nav` conserva Envíos y el botón + sin el acceso redundante a Finalizados. El selector `#team-site-filter` aparece debajo de los chips de estado. Usa el mismo tratamiento de campos y una etiqueta Sede involucrada. Camión, barra y check están presentes en tarjetas de ambos roles. Los formularios de envío y recepción comparten dos columnas de fecha y hora, autocompletadas, editables y localizadas a Perú.
