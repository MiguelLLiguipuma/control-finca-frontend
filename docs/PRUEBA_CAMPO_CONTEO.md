# Prueba de conteo en campo

## Preparacion

- Iniciar sesion y abrir Conteo Movil con conexion; seleccionar finca y fecha.
- Comprobar que las cintas y saldos se hayan cargado antes de desconectarse.
- Al elegir una foto, solicita un borrador de marcas al backend con Gemini. Requiere internet y una clave configurada.
- Sin conexion o si falla la deteccion, se mantiene el marcado manual. La deteccion no registra una cosecha ni cambia inventario.
- La foto y sus marcas no se conservan al cerrar la pagina. Aplicar al conteo primero.
- Las cantidades aplicadas se guardan como borrador local. No borrar los datos del navegador.
- La aplicacion aun necesita conexion para abrir/cargar una finca desde cero; no es una PWA offline completa.

## Recorrido

1. Tomar o elegir una foto de pocos racimos cuyo total real se conozca. Esperar el borrador; comprobar cuantos faltan o sobran.
2. Ampliar, mover una marca, eliminar otra y probar Deshacer.
3. Repartir el total entre cinta y semana. Un total distinto o superior al saldo debe bloquear Aplicar.
4. Confirmar la casilla de revision, aplicar y verificar que Digitado aumenta exactamente lo repartido. Repetir con otra foto diferente. Cambiar marcas debe desmarcar la confirmacion.
5. Con la pantalla cargada, desactivar la conexion y enviar un conteo pequeno. Debe aparecer en Pendientes y desaparecer de Digitado.
6. Recuperar la conexion y comprobar que el pendiente se sincroniza una sola vez.
7. Si se anotan nuevas cantidades durante la sincronizacion, deben permanecer en pantalla.

No reutilizar una fotografia de racimos ya registrados: el sistema no identifica fotos duplicadas.

## Activar deteccion en Railway

1. Crear una clave de Gemini en https://aistudio.google.com/apikey. No pegarla en chats ni en archivos del frontend.
2. En el servicio `control-finca-backend`, agregar `GEMINI_API_KEY` como variable secreta y `CONTEO_VISION_MODEL=gemini-3.6-flash`. El modelo 2.5 Flash puede responder a consultas de metadatos pero rechazar analisis para cuentas nuevas; se verifico ese caso durante el despliegue.
3. Desplegar los cambios del backend y frontend. No requiere migracion SQL. Sin clave, aparece un aviso y se puede contar manualmente.
4. Probar una foto pequena con racimos separados y despues una con superposiciones. No se ha medido aun la precision en campo.

Gemini ofrece cuota gratuita limitada, no uso gratuito ilimitado. Confirmar el nivel de la cuenta en AI Studio; una clave de un proyecto con facturacion puede generar cargos. Esta implementacion no activa facturacion ni cambia de proveedor al agotar cuota.

Privacidad: se envia a Google una copia JPEG comprimida (maximo 1600 px de lado y 650 KB, sin EXIF), no el nombre del archivo ni la identidad del operador. El backend no guarda la foto. Google aplica sus propias condiciones; en el nivel gratuito puede usar contenido para mejorar productos. Evitar personas, documentos y otras imagenes sensibles.
Referencias: https://ai.google.dev/gemini-api/docs/pricing y https://ai.google.dev/gemini-api/docs/image-understanding.

El servicio devuelve posiciones de racimos completos, no bananas individuales. Sigue siendo un borrador de un modelo generalista, no un detector entrenado y validado en esta finca. La revision del operador es obligatoria.
Reintentar reemplaza marcas y reparto solo si tiene exito; un error conserva las correcciones. Cancelar ignora respuestas tardias. Limite local: cinco solicitudes por minuto y usuario por instancia del backend; las cuotas del proveedor se aplican aparte.

## Validacion realizada

- Frontend: 17 pruebas locales aprobadas, comprobacion TypeScript y compilacion de produccion.
- Backend: 29 pruebas aprobadas; una prueba E2E de aislamiento por finca omitida por falta de credenciales dedicadas.
- Navegador: foto, marcas, arrastre, deshacer, zoom, reparto, borrador tras recarga y envio a cola offline, en escritorio y emulacion movil.
- Las pruebas de interfaz usaron datos simulados y no enviaron cosechas reales al servidor.
- Deteccion: contrato de posiciones, limites de imagen, falta de clave, cuota, respuesta invalida/truncada y cancelacion probados sin llamadas al proveedor.
- Navegador de escritorio y emulacion movil: peticion automatica y compresion de la foto real, marcas iniciales simuladas, agregar/borrar/deshacer, confirmacion obligatoria, reintento fallido, respuesta tardia, correccion y aplicacion offline. Sin desbordamiento horizontal ni errores JavaScript.
- Pendiente: activar la clave, evaluar la deteccion con fotos reales, probar la camara y gestos en el telefono fisico y verificar el backend desplegado. Los mocks no validan precision del modelo.

## Carga estimada de enfunde

Se registraron 9 semanas (29 a 37/2026) en Finca Limon El Paraiso: 194 fundas por semana, 1746 en total. Estan identificadas con `[ESTIMADO_PROMEDIO_V1]` en observaciones.

El script en `docs/sql/completar_enfunde_estimado.sql` queda en modo de previsualizacion. No es una migracion ni debe ejecutarse automaticamente al desplegar.
El comprobante JSON de ejecucion permanece local y esta excluido de Git.

## Comandos

Con Node.js 22 o posterior, en frontend: `npm run verify:release`.
En backen: `npm run lint` y `npm test`.
Estas correcciones de codigo no requieren una nueva migracion.
