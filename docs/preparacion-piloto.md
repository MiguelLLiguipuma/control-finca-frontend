# Preparacion del piloto de ControlFinca

Actualizado: 2026-10-27. Estado: implementacion local parcial, no autorizacion de lanzamiento publico.

## Objetivo y reglas de trabajo

Validar operacion real con usuarios invitados sin mezclar empresas, perder registros ni presentar estimaciones como mediciones. Ninguna prueba aprobada por si sola certifica seguridad o disponibilidad en produccion.

- Conservar cambios existentes del proyecto. Separar commits por responsabilidad al preparar la entrega.
- No ejecutar migraciones, restauraciones ni pruebas de escritura sobre produccion durante la preparacion.
- No habilitar registro publico ni nuevas integraciones externas sin completar los criterios de salida.
- Usar datos ficticios en pruebas; nunca incluir tokens, contrasenas, fotos privadas o copias reales en el repositorio.

## Primera entrega implementada

| Area | Cambio | Verificacion |
| --- | --- | --- |
| Sesiones frontend | Descartar respuestas antiguas y bloquear solicitudes cuando cambia la cuenta en otra pestana | Pruebas de respuestas 200/401 tardias y de cambio de token |
| Login | Un 401 de credenciales no recarga el login; sesion vencida tiene mensaje propio | Pruebas de interceptor |
| Notificaciones | Almacenamiento separado por empresa/usuario; no atribuir avisos antiguos sin propietario | Pruebas de cambio de cuenta y contenido corrupto |
| Alertas operativas | Limpiar al cambiar sesion; evitar consultas atrasadas; limpiar error al recuperar servicio | Pruebas de concurrencia y cambio de cuenta |
| Cuenta | Pantalla real, cierre con aviso de trabajo local y respaldo de cosecha limitado a su propietario | Pruebas de exportacion y revision visual movil/escritorio |
| Datos antiguos | Conservar datos sin propietario sin permitir descarga desde cualquier cuenta | Revision del flujo de recuperacion |
| Roles desconocidos | No heredan acceso a reportes; se muestran cuenta/ayuda | Pruebas de RBAC |
| Registro publico | Cerrado por defecto en interfaz y backend; Google no crea usuarios nuevos sin habilitacion | Prueba HTTP de registro y politica de habilitacion |
| Sesiones backend | Verificar rol/empresa actuales, revocar al cambiar accesos y limpiar cache local | Pruebas de politica y servicio con modelos simulados |
| Contrasenas | No aceptar hashes del cliente como hashes del servidor; no reemplazar contrasena por campo vacio | Pruebas de actualizacion |
| Proteccion HTTP | Limitadores independientes y acotados; CORS explicito; cabeceras; JSON invalido 400 y exceso 413 | Pruebas unitarias/HTTP |
| Publicacion | CI frontend ejecuta tests y build; verificacion backend exige configuracion E2E | Pruebas de configuracion y bloqueo sin credenciales |
| Dependencias | Correcciones compatibles en ambos lockfiles y Vuetify estable de la serie 3 | Auditoria npm y nueva ejecucion de pruebas/compilacion |

Los controles siguen siendo locales hasta desplegarlos. Las cabeceras de Vercel requieren publicacion; el servidor local Vite no demuestra su aplicacion en Vercel.

## Riesgos que siguen abiertos antes de incorporar terceros

### P0: sesiones y aislamiento real

- [ ] Migrar el token accesible desde JavaScript a una estrategia de sesion revisada de extremo a extremo. Coordinar dominios, cookies HttpOnly/Secure/SameSite, CSRF, CORS, renovacion, revocacion y modo offline. No activar solo la mitad del cambio.
- [ ] Separar administrador de empresa de administrador de plataforma. Revisar todos los servicios que permiten a ADMIN omitir filtros de finca/empresa.
- [ ] Ejecutar pruebas con dos empresas, al menos tres fincas y usuarios distintos para operador, supervisor y administrador de empresa.
- [ ] Cubrir lectura, escritura, exportacion, fotos y reintentos de sincronizacion. Las pruebas E2E actuales no cubren todos estos caminos.
- [ ] Comprobar RLS efectiva con el usuario real de conexion, incluyendo superuser, BYPASSRLS y propiedad de tablas. Tener politicas creadas no es suficiente.
- [ ] Verificar cambios de empresa/finca, desactivacion y revocacion sobre todas las replicas. La cache local tiene un maximo de 30 segundos; no es invalidacion distribuida instantanea.
- [ ] Revisar actualizaciones administrativas en transacciones, asignaciones entre empresas y anulaciones auditables. La revocacion previa protege tokens, pero no convierte las escrituras existentes en atomicas.
- [ ] Revisar HTTPS, proxy de Railway y limites por IP/usuario bajo concurrencia. El limitador actual es por proceso, no distribuido.
- [ ] Validar cifrado de la conexion PostgreSQL y verificacion de certificado. La configuracion existente usa rejectUnauthorized:false en produccion y requiere revision del proveedor/red.

Responsable: desarrollo y administrador del despliegue. Evidencia: resultados E2E con datos ficticios, configuracion verificada sin secretos y registro de incidencias resueltas.

### P0: continuidad y recuperacion

- [ ] Confirmar respaldo automatico de PostgreSQL, retencion y acceso restringido.
- [ ] Definir perdida maxima aceptable de datos (RPO) y tiempo maximo de recuperacion (RTO). No prometer una hora de RPO con copias solo diarias.
- [ ] Restaurar una copia en una base separada y comprobar integridad de enfunde, cosecha, usuarios y alertas.
- [ ] Definir recuperacion de fotos/archivos si se almacenan fuera de PostgreSQL.
- [ ] Probar rechazo de duplicados y concurrencia de dos dispositivos con una misma operacion.
- [ ] Probar movil real: modo avion, cierre, reapertura, espacio lleno, sesion vencida, reconexion y cambio de usuario.
- [ ] Definir retencion de datos locales y procedimiento de recuperacion autorizado. No borrar borradores ni colas automaticamente.
- [ ] Advertir que un telefono perdido antes de sincronizar puede significar perdida de informacion.

Responsable: administrador del despliegue y desarrollo. Evidencia: restauracion ensayada y acta de pruebas en Android/iPhone.

### P1: producto y permisos

| Perfil propuesto | Experiencia principal | Restriccion |
| --- | --- | --- |
| Trabajador | Tareas, enfunde, conteo, sus registros, sincronizacion y ayuda | Solo fincas asignadas; sin administracion ni despacho por defecto |
| Supervisor | Liquidacion, fumigacion, incidencias, clima y revision de registros | Solo su alcance autorizado |
| Encargado de despacho | Balanza y vouchers | Solo operaciones necesarias para despacho |
| Administrador de empresa | Reportes, usuarios, fincas, permisos y auditoria | Nunca otra empresa |
| Administrador de plataforma | Gestion tecnica excepcional | Acceso expresamente autorizado y auditado |

- [ ] Aplicar la matriz en backend y frontend. No basta con esconder el menu.
- [ ] Implementar inicio por rol y una entrada clara para fumigacion si el piloto la usa diariamente.
- [ ] Completar recuperacion de contrasena y gestion de sesiones con verificacion de identidad. Mi cuenta no simula funciones aun no implementadas.
- [ ] Revisar formularios con nombres largos, teclado virtual, lectores de pantalla, foco, contraste exterior y tamanos de toque.
- [ ] Distinguir sin datos, cero real, error y estimacion en cada modulo.
- [ ] Mantener IA de conteo opcional y correccion manual. No guardar una deteccion como cosecha sin confirmacion.
- [ ] Mantener fuente, fecha de actualizacion y limitaciones de clima/prediccion/estado botanico.

### P1: retroalimentacion y soporte

Pendiente de implementar, no existe una bandeja nueva de tickets en esta entrega.

- [ ] Formulario de problema/sugerencia con descripcion, resultado esperado y captura opcional.
- [ ] Guardado local por propietario cuando no hay red y envio idempotente al recuperar conexion.
- [ ] Numero de seguimiento generado por servidor y estados recibido/en revision/resuelto. Nunca mostrar enviado si solo esta guardado en el telefono.
- [ ] Asociar usuario/empresa en el servidor, no confiar en identificadores enviados por el cliente.
- [ ] Adjuntar solo version, pantalla y referencia tecnica; no incluir token, consultas completas, formularios, fotos o logs privados automaticamente.
- [ ] Definir quien recibe los reportes y plazo de primera respuesta.
- [ ] Priorizar perdida/acceso indebido como critico, bloqueo de tarea como alto y detalle visual como normal.
- [ ] Observar cinco tareas reales y entrevistar a usuarios semanalmente, evitando recopilar informacion personal innecesaria.

### P1: operacion y privacidad

- [ ] Configurar alertas por caida, errores 5xx, cola de sincronizacion, respaldo fallido y clima desactualizado.
- [ ] Definir version de lanzamiento, cambios publicados, rollback y compatibilidad con clientes offline antiguos.
- [ ] Activar revisiones de dependencias, secretos y proteccion de ramas. La CI no equivale a bloquear un despliegue automatico de Vercel/Railway: verificar su integracion real.
- [ ] Retirar node_modules del seguimiento Git del backend en un cambio separado, conservando los archivos instalados localmente y usando npm ci. Actualmente hay 1922 archivos de dependencias versionados; no incluir sus cambios generados al seleccionar codigo para un commit.
- [ ] Establecer limites de gasto para IA, base de datos y almacenamiento.
- [ ] Preparar aviso de privacidad especifico, retencion, canal de derechos, proveedores y flujo de fotografias. Revisar marco ecuatoriano con asesoria correspondiente.
- [ ] No publicar una politica ficticia ni activar recopilacion automatica de telemetria personal.

## Configuracion de la entrega

Backend:

- ALLOW_PUBLIC_REGISTRATION ausente o false: solo cuentas existentes/creadas por administracion. true permite altas publicas y altas nuevas por Google.
- CORS_ORIGINS: lista de origenes exactos separados por comas, sin rutas. Los previews ya no se autorizan por un patron de nombre.
- AUTH_SESSION_CACHE_TTL_MS: de 0 a 30000; 0 desactiva cache. Evaluar rendimiento antes de reducirlo en produccion.
- NODE_ENV=production y proteccion de DEBUG_HEALTH_TOKEN deben verificarse en el despliegue, no solo en un archivo local.

Frontend:

- VITE_ALLOW_PUBLIC_REGISTRATION ausente o false: no muestra formulario de alta. Debe coincidir con la politica del backend; no es control de seguridad por si solo.
- VITE_API_URL del entorno de pruebas debe apuntar a su backend separado. La configuracion existente conserva un fallback de produccion: verificarlo antes de probar con datos.
- No colocar secretos en variables VITE_ ni en archivos del directorio public.

## Criterios de prueba multitenant

El comando backend npm run verify:release requiere E2E_BASE_URL, E2E_TOKEN_OPERATOR, E2E_TOKEN_SUPERVISOR, E2E_TOKEN_ADMIN, E2E_FINCA_PERMITIDA, E2E_FINCA_NO_PERMITIDA y E2E_FINCA_OTRA_EMPRESA. Configurarlos mediante el almacen de secretos del entorno de pruebas; no enviarlos en chat ni confirmarlos por logs.

Fixture requerida: operador/supervisor/admin pertenecen a empresa A; finca permitida pertenece a A y esta asignada al operador; finca no permitida pertenece a A pero no esta asignada al operador; tercera finca pertenece a empresa B. El administrador del fixture es de empresa, no un administrador global. Los tres IDs deben ser distintos.

Los E2E actuales son de lectura. Agregar pruebas de escritura en staging con datos descartables antes de declarar aislamiento completo. No usar produccion como entorno de pruebas.

## Secuencia de despliegue propuesta

1. Completar P0 y tener restauracion verificada. Revisar diferencias de ambos repositorios y separar cambios previos de esta entrega.
2. Ejecutar frontend npm run verify:release y backend npm run verify:release con fixture real de staging.
3. Desplegar backend a staging; comprobar login existente, registro bloqueado, CORS y revocacion.
4. Desplegar frontend a staging; comprobar Mi cuenta, salida, offline, Google existente y permisos por rol.
5. Registrar responsables, version y procedimiento de reversa. La configuracion de registro publico solo se abre por decision expresa, no como solucion a un fallo de acceso.
6. Invitar 5-10 usuarios de 1-2 fincas durante 2-3 semanas. No habilitar registro abierto.
7. Detener ampliacion si hay perdida, duplicados o datos entre empresas. Resolver y repetir la prueba afectada.
8. Ampliar gradualmente solo con evidencias, no por numero de funcionalidades agregadas.

## Evidencia local de esta entrega

- Frontend: 113 pruebas aprobadas y compilacion de produccion aprobada.
- Backend: 28 pruebas de seguridad aprobadas y chequeo sintactico de 90 archivos aprobado.
- Backend: 22 pruebas adicionales aprobadas de cosecha, idempotencia, deteccion, contrasenas y clima, con dependencias corregidas.
- Auditoria npm tras correcciones: cero avisos reportados en frontend y backend; esto no equivale a ausencia de vulnerabilidades en el producto.
- Mi cuenta y confirmacion de salida revisadas en escritorio y a 390 px de ancho, con datos ficticios y adaptador HTTP local.
- Revision movil repetida tras actualizar Vuetify a 3.13.7: ancho de documento de 390 px, sin desbordamiento horizontal ni errores de consola en el flujo de cuenta y cancelacion de salida.
- Compilacion con Vite 6.4.5 aprobada. Permanece una advertencia de rendimiento: chunk de Vuetify de aproximadamente 556 kB minificado (171 kB gzip). Revisar importaciones y medir carga en red movil antes del piloto; no se oculto la advertencia aumentando el umbral.
- Verificacion E2E real no ejecutada: faltan variables del entorno de pruebas. El guard de publicacion devuelve error explicito.
- La generacion y separacion del respaldo se verifico en pruebas. La confirmacion de descarga mediante el navegador integrado no pudo completarse por un timeout; comprobar el archivo descargado en el navegador de campo.
- Sin migraciones, registros de prueba en produccion, commits ni despliegues en esta entrega.

## Preparacion de commits del frontend: 2026-10-28

- Repetido npm run verify:release: 113 pruebas aprobadas, comprobacion de tipos y compilacion correctas.
- Cambios organizados en commits locales de dependencias, funcionalidades/seguridad y documentacion.
- No incluye codigo del backend, respaldos de produccion ni resultados SQL con datos reales.
- No se realizo push ni despliegue como parte de esta preparacion. Las condiciones P0 anteriores siguen pendientes; crear commits no autoriza el lanzamiento publico.

## Referencias de preparacion

- Sesiones y almacenamiento: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
- Recuperacion PostgreSQL: https://docs.railway.com/guides/postgres-backups-restores
- Marco de privacidad ecuatoriano: https://www.spdp.gob.ec/marco-normativo/
