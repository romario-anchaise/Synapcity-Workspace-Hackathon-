# Rapicostura · Prototipo móvil HTML

Prototipo navegable en español de Perú, hecho con HTML, CSS y JavaScript sin dependencias, compilación ni Flutter. Referencia: estructura de `frontend/lib/features/dashboard/dashboard_screen.dart`, tema de GastosClaros y logo proporcionado por el usuario. No reemplaza la aplicación Flutter ni el backend.

## Probar inmediatamente

Abre `index.html` con tu navegador. La cámara integrada requiere un contexto seguro y permiso del dispositivo. Para una experiencia consistente de cámara y almacenamiento, desde la raíz del repositorio:

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory rapicostura
```

Visita `http://127.0.0.1:4173`. Para detener el servidor usa Ctrl+C. En Android, abre la carpeta desde un servidor HTTPS accesible por el teléfono: `localhost` en el teléfono representa al propio teléfono. Un servidor HTTP en una dirección de red local normalmente no habilita `getUserMedia`; la galería y la cámara nativa mediante selector son alternativas sujetas al navegador. El prototipo no necesita acceso a Internet para sus recursos.

## Recorrido recomendado

1. Espera la carga con el logo. Empiezas como Costurera en Av. Dolores.
2. Pulsa **+**, sube una foto/video, elige Encargo o Trabajo y destino. La descripción es opcional; fecha y hora del envío se completan automáticamente y puedes editarlas. El origen queda fijado al perfil de sede activo.
3. Al registrar, verás el empaquetado y la confirmación del paso automático a **En camino**.
4. Abre el avatar o el selector superior. Cambia al perfil de la sede de destino: se abrirá **Recepción** automáticamente.
5. Pulsa **Recibir**. La evidencia original y destino están precargados; puedes añadir otra evidencia y una observación. Revisa o edita la fecha y hora de recepción, y confirma para finalizar. Solo el perfil de destino puede hacerlo.
6. Cambia a **Dueña / Admin** para ver todos los envíos y sus barras de tres estados. La dueña tiene una única sección **Envíos del equipo**. Usa los filtros de estado y el selector de sede involucrada (origen o destino) para consultar entregas en camino y finalizadas.

En escritorio se presenta un teléfono simulado junto a una composición de marca; en pantallas de hasta 480 px, la aplicación ocupa toda la pantalla. No es un emulador del sistema Android ni una APK: reproduce la interfaz y los flujos en el navegador.

## Archivos

- `index.html`: estructura, navegación, splash y diálogos.
- `styles.css`: tokens visuales, responsive, animaciones y movimiento reducido.
- `app.js`: roles, sedes, registro, cámara, galería, persistencia y recepción.
- `assets/rapicostura-logo.png`: imagen original suministrada.
- `ESTILO_Y_ESENCIA.md`: contrato visual para el compañero que integra la otra sección.
- `REQUISITOS_Y_FLUJOS.md`: decisiones funcionales y modelo de datos.
- `VERIFICACION.md`: cobertura y límites de las verificaciones.
- `tests/flujo.html`: prueba funcional aislada en navegador, disponible mediante el servidor local.

## Persistencia y límites

Los registros y preferencias se guardan en `localStorage` con clave `rapicostura-prototype-v1`. Las fotos/videos se guardan como Blob en IndexedDB `rapicostura-evidence-v1`, store `media`. Se conserva el archivo original, hasta 25 MB por evidencia; las capturas se reducen a 1600 px de ancho y JPEG al 85 %. Videos de cámara: hasta 30 segundos, sin audio. Los ejemplos usan ilustraciones explícitamente identificadas como demostración.

No hay autenticación, servidor, notificaciones, mensajería ni sincronización entre dispositivos. El cambio de roles sirve para explorar el prototipo. Dos pestañas del mismo origen reciben actualizaciones de registros mediante `storage`; no es control de concurrencia para producción. Cambiar de navegador, puerto, origen o abrir con `file://` puede crear un almacenamiento diferente. El navegador puede restringir o borrar los datos locales. No debe usarse como registro operativo real.

En **Tu espacio → Restablecer datos de demostración**, una confirmación permite borrar registros y evidencias locales y recuperar los ejemplos. Las fuentes son locales del sistema para permitir la apertura inmediata sin descargas.

## Perfiles locales por sede

Hay cinco perfiles estables (`sede-0` a `sede-4`), uno por punto operativo, y un modo de supervisión para la dueña. Comparten el registro de envíos y los archivos en el mismo navegador; las vistas de salidas y entradas se separan por origen/destino. Las recepciones ajenas no se pueden abrir desde otro perfil. La dueña consulta todos los envíos y no confirma recepciones. El perfil seleccionado se conserva al recargar. Los camiones y checks animados se muestran también para costureras.

Ejemplo: cambia a Yanahuara, registra un video hacia Cayma y cambia al perfil Cayma. En Recepción aparece En camino y el video original se puede reproducir desde el detalle. Tras confirmar, ambas sedes ven Finalizado en su historial correspondiente. Todo sigue siendo una simulación local sin cuentas remotas.
