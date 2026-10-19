# Rapicostura para Android

APK nativo ligero que muestra https://rapicostura-romario.web.app/ dentro de WebView. Requiere Android 8 o posterior y conexión a internet. Los cambios de la web se ven al iniciar y al regresar después de al menos cinco segundos en segundo plano, siempre que no haya un formulario abierto, cámara, selector de archivos o video a pantalla completa. No descarga ni instala código nativo nuevo.

El APK no lleva una copia congelada de los archivos HTML. Respeta la política `Cache-Control: no-cache` de Firebase; no borra localStorage ni IndexedDB al actualizar la página. Cámara únicamente después de conceder el permiso de Android y solo para el origen autorizado. La galería usa el selector del sistema, sin acceso amplio a todos los archivos. Audio, ubicación y acceso a archivos locales de la web no están habilitados.

Dentro de la app, el botón Trabajadora ▾ / Dueña ▾ permite cambiar de vista y recuerda la elección. Mantener pulsado el icono también ofrece los accesos Trabajadora y Dueña. Son vistas del prototipo, no autenticación ni control de acceso de producción.

El APK y el navegador guardan sus datos por separado. No se ha añadido una base de datos compartida: los registros siguen siendo locales. No se importan automáticamente los del navegador, y desinstalar o borrar los datos de la app elimina su almacenamiento local.

## Compilar y distribuir

```powershell
./scripts/build-android.ps1
node scripts/build-web.cjs
firebase deploy --only hosting --project rapicostura-romario
```

El script usa las herramientas Android SDK 36.1.0, plataforma 36 y el JDK de Android Studio instalados en esta computadora. Las rutas son configurables mediante `-Sdk` y `-Jdk`. Compila, empaqueta, alinea y firma el APK, verifica su firma y copia el resultado a la carpeta padre del proyecto. `android/build/` no forma parte del código fuente. El plan gratuito Spark de Firebase rechazó el alojamiento de APK; Hosting excluye estos archivos. El APK se entrega localmente para transferirlo al celular.

La clave privada y contraseña quedan en `android/signing/`, excluidas de Git y Hosting. Conservar esta carpeta de forma privada: para actualizar el contenedor nativo se necesita la misma clave, además de incrementar `versionCode` y `versionName` en AndroidManifest.xml. Para cambios de pantallas y flujo web solo hace falta publicar Firebase; no se recompila el APK.

Validación actual: compilación Java, DEX, manifest y recursos, alineación y firmas APK v2/v3. Pendiente validar cámara y galería en un dispositivo físico; no se ha instalado en un teléfono del usuario.

Referencias de implementación: [WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview), [permisos de cámara de WebView](https://developer.android.com/reference/android/webkit/PermissionRequest), [compilación y firma](https://developer.android.com/build/building-cmdline), [bordes y barras del sistema](https://developer.android.com/develop/ui/views/layout/edge-to-edge).

