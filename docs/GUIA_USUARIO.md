# Guia de Usuario - ControlFinca

Esta guia explica el sistema en lenguaje simple para personal operativo y usuarios sin experiencia tecnica.

## 1) Que hace ControlFinca
ControlFinca ayuda a responder 4 preguntas todos los dias:
- Cuanto se enfundo
- Cuanto se cosecho
- Cuanto se embarco
- Que se espera cosechar en la proxima semana

## 2) Flujo recomendado diario (orden sugerido)
1. Abrir **Registro Enfunde** y registrar fundas del dia.
2. Abrir **Liquidacion Cosecha** y registrar racimos buenos y rechazo.
3. Revisar **Prediccion Cosecha** para planificacion.
4. Abrir **Voucher Embarque** para consolidar cajas finales.
5. Revisar **Centro de Alertas** para acciones preventivas.

## 3) Que significa cada vista

### Dashboard (`/reportes`)
Para que sirve:
- Ver estado general de la finca seleccionada.
- Ver tendencias semanales y mensuales.
- Ver alertas relevantes.

Cuando usarla:
- Al iniciar jornada.
- Antes de tomar decisiones operativas.

### Registro Enfunde (`/registro-enfunde`)
Para que sirve:
- Registrar cuantas fundas se colocaron por cinta y semana.

Resultado:
- Se actualiza base historica para analisis y prediccion.

### Liquidacion Cosecha (`/registro-cosecha`)
Para que sirve:
- Registrar racimos buenos y rechazo por cinta/semana.

Validacion principal:
- No se debe registrar mas de lo disponible en campo.

### Prediccion Cosecha (`/prediccion-cosecha`)
Para que sirve:
- Estimar la proxima semana de embarque.
- Mostrar rango esperado (minimo y maximo).

Nota:
- Es una ayuda de planificacion, no reemplaza criterio tecnico en campo.

### Voucher Embarque (`/voucher-embarque`)
Para que sirve:
- Consolidar la salida real del dia.
- Asignar cajas por finca y por linea.
- Calcular ratio comercial y operativo.
- Guardar borrador, confirmar o anular (segun permisos).

### Centro de Alertas (`/alertas`)
Para que sirve:
- Detectar riesgos (rechazo alto, finca sin registro, etc).
- Priorizar acciones de supervision.

### Auditoria (`/auditoria`)
Para que sirve:
- Ver quien hizo que cambio y cuando.
- Soporte para control interno y trazabilidad.

### Gestion Calendario (`/planificacion/calendario`)
Para que sirve:
- Definir calendario operativo anual de semanas/cintas.

### Gestion Empresas / Fincas / Usuarios
Para que sirve:
- Configurar estructura del sistema y accesos.

## 4) Componentes visuales clave (en palabras simples)
- **Selector de finca**: cambia el contexto de datos.
- **Selector de anio**: cambia el periodo de analisis.
- **Tarjetas KPI**: resumen rapido de indicadores.
- **Tablas de detalle**: registros completos y editables.
- **Chips de estado**: muestran BORRADOR, CONFIRMADO o ANULADO.
- **Alertas (banners)**: mensajes de riesgo o error.

## 5) Reglas practicas para no cometer errores
- Antes de guardar, validar finca y fecha.
- No confirmar voucher sin revisar cajas por finca.
- Si hay mensaje de permisos, pedir accion a supervisor/admin.
- Si hay error 500 o 503, guardar evidencia (hora, finca, pantalla).

## 6) Errores comunes y que hacer
- "Token de seguridad no valido":
  - Cerrar sesion y volver a ingresar.
- "No tiene permisos":
  - Tu rol no permite esa accion. Escalar a administrador.
- "No hay datos":
  - Verificar finca, fecha y anio seleccionados.
- "Base de datos saturada":
  - Reintentar en 1-2 minutos y evitar multiples recargas simultaneas.

## 7) Buenas practicas de operacion
- Registrar datos en tiempo real, no al final de la semana.
- Confirmar vouchers solo despues de revision.
- Mantener observaciones cortas y utiles.
- No compartir usuarios entre personas.

## 8) Mapa rapido de archivos (para equipo interno)
- Vistas: `src/views`
- Componentes: `src/components`
- Estado global: `src/stores`
- Servicios API: `src/services`
- Logica de dominio: `src/domain`
