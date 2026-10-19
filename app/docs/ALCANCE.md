# Alcance de la app unificada

La sección de trabajo y la de envíos del compañero están unidas en una sola interfaz. Trabajadora, sede y navegación son compartidas. Recepción tiene dos entradas: prendas de clientes y paquetes de otras sedes.

Cada envío de trabajo referencia `repairIds`. Confirmar su llegada actualiza `repair.logistics` y `currentLocation`, sin modificar responsable, acuerdo de apoyo ni etapa del arreglo. Marcar el arreglo terminado abre la revisión de calidad; no registra transporte. Solo el perfil de la sede destino confirma un paquete pendiente. Los permisos son simulados en el navegador y requieren un backend para producción.

El original del compañero se conserva en `references/companion/`. Su módulo adaptado se genera con `scripts/build-shipping.cjs`. Comparte `state.shipments` y almacenamiento `hilando-v1` con el resto de la app. La importación de registros del compañero ocurre una vez si su clave existe en el mismo origen. No puede leer datos de Netlify desde Firebase.

La migración anterior de paquetes de apoyo a `supportRequests` permanece. Los registros históricos no se borran. Datos y evidencias son locales; falta implementar cuentas y sincronización entre dispositivos.
