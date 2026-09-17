# Prueba de conteo en campo

## Preparacion

- Iniciar sesion y abrir Conteo Movil con conexion; seleccionar finca y fecha.
- Comprobar que las cintas y saldos se hayan cargado antes de desconectarse.
- Esta version usa marcas manuales sobre la foto; no reconoce racimos automaticamente.
- La foto y sus marcas no se conservan al cerrar la pagina. Aplicar al conteo primero.
- Las cantidades aplicadas se guardan como borrador local. No borrar los datos del navegador.
- La aplicacion aun necesita conexion para abrir/cargar una finca desde cero; no es una PWA offline completa.

## Recorrido

1. Tomar o elegir una foto y marcar unos pocos racimos cuyo total se conozca.
2. Ampliar, mover una marca, eliminar otra y probar Deshacer.
3. Repartir el total entre cinta y semana. Un total distinto o superior al saldo debe bloquear Aplicar.
4. Aplicar y verificar que Digitado aumenta exactamente lo repartido. Repetir con otra foto diferente.
5. Con la pantalla cargada, desactivar la conexion y enviar un conteo pequeno. Debe aparecer en Pendientes y desaparecer de Digitado.
6. Recuperar la conexion y comprobar que el pendiente se sincroniza una sola vez.
7. Si se anotan nuevas cantidades durante la sincronizacion, deben permanecer en pantalla.

No reutilizar una fotografia de racimos ya registrados: el sistema no identifica fotos duplicadas.

## Validacion realizada

- Frontend: 15 pruebas locales, comprobacion TypeScript y compilacion de produccion.
- Backend: 21 pruebas aprobadas; una prueba E2E de aislamiento por finca omitida por falta de credenciales dedicadas.
- Navegador: foto, marcas, arrastre, deshacer, zoom, reparto, borrador tras recarga y envio a cola offline, en escritorio y emulacion movil.
- Las pruebas de interfaz usaron datos simulados y no enviaron cosechas reales al servidor.
- Pendiente: probar la camara y gestos en el telefono fisico, y verificar el flujo contra el backend desplegado.

## Carga estimada de enfunde

Se registraron 9 semanas (29 a 37/2026) en Finca Limon El Paraiso: 194 fundas por semana, 1746 en total. Estan identificadas con `[ESTIMADO_PROMEDIO_V1]` en observaciones.

El script en `docs/sql/completar_enfunde_estimado.sql` queda en modo de previsualizacion. No es una migracion ni debe ejecutarse automaticamente al desplegar.
El comprobante JSON de ejecucion permanece local y esta excluido de Git.

## Comandos

Con Node.js 22 o posterior, en frontend: `npm run verify:release`.
En backen: `npm run lint` y `npm test`.
Estas correcciones de codigo no requieren una nueva migracion.
