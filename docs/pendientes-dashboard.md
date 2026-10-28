# Pendientes prioritarios del dashboard

La seccion "Que necesita atencion hoy" reutiliza GET /alertas, con la finca
seleccionada y estados pendiente, enviada y leida. No genera diagnosticos,
no envia notificaciones y no marca alertas como resueltas al abrir un enlace.

- Presenta hasta tres alertas, primero criticas, luego altas, medias y bajas.
  Dentro de cada nivel, primero las detectadas mas recientemente.
- Filtra nuevamente por finca, descarta resueltas/silenciadas y elimina IDs
  duplicados antes de presentar los resultados.
- Consulta hasta 200 alertas (limite del backend, ordenadas por prioridad)
  y advierte cuando se alcanza ese limite. No ofrece un total global inferido.
- Los pendientes son actuales aunque el reporte muestre un anio anterior.
  Se muestran fecha de consulta y fecha de deteccion, no una promesa de
  diagnostico en tiempo real. Una lista vacia no certifica la salud de la finca.
- Carga y reintento son independientes de graficos y tarjetas. Al cambiar
  finca, sesion o permisos se limpian los resultados y se cancelan solicitudes.
  Las respuestas tardias no sustituyen el contexto actual.

## Navegacion

Enfunde abre su formulario; cintas criticas abren liquidacion; clima atrasado
abre clima. Las cintas historicas abren Historico en el centro de alertas.
Fumigacion abre Configuracion en usuarios ADMIN/SUPERVISOR; los demas
acceden a la lista de alertas, sin ampliar permisos.
Cada destino recibe finca_id y lo valida contra el catalogo autorizado.
El formulario de enfunde conserva cualquier borrador de otra finca y pide
una decision antes de descartarlo. Cosecha conserva su restauracion de
borradores por finca, fecha y propietario.

Los permisos de navegacion reutilizan `auth.can` y el control existente
del centro de alertas. Los endpoints siguen siendo responsables de la
autorizacion real. La lista local no reemplaza la campana global ni su store.

No se implementa aun evolucion semanal: requiere un historial fiable y
criterios de comparacion independientes de la fecha de consulta.
