-- PostgreSQL. Ejecutar el archivo completo en una misma sesion.
-- Consulta manual de mantenimiento, NO es una migracion automatica.
-- Finca: Finca Limon El Paraiso (ID 4 verificado en produccion).
-- Usuario y operario: Miguel Lliguipuma (ID 1 verificado en produccion).
-- Desde semana ISO 29/2026 hasta la semana anterior a la ejecucion.
-- Los IDs se resuelven por nombre exacto normalizado, sin elegir coincidencias ambiguas.
-- Primero ejecutar con aplicar = false.
-- Cambiar aplicar a true solo despues de revisar la previsualizacion.
-- Un registro por semana vacia. No completa semanas parcialmente registradas.
-- La fecha del domingo es referencial, NO una fecha de trabajo comprobada.
-- Estos registros SI afectan inventario, reportes y predicciones existentes.

BEGIN;
SET LOCAL TIME ZONE 'America/Guayaquil';
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TEMP TABLE _enfunde_parametros ON COMMIT DROP AS
SELECT
  NULL::integer AS finca_id,       -- Se resuelve abajo
  NULL::integer AS usuario_id,     -- Miguel: responsable de la carga
  NULL::integer AS operario_id,    -- Miguel: responsable del registro estimado
  DATE '2026-07-13' AS desde,      -- Lunes de la semana ISO 29/2026
  8::integer AS semanas_base,     -- Ultimas 8 semanas con datos antes de desde
  false::boolean AS aplicar,
  date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'America/Guayaquil')::date AS lunes_actual;

DO $$
DECLARE finca_destino integer; responsable integer;
BEGIN
  BEGIN
    SELECT id INTO STRICT finca_destino
    FROM public.fincas
    WHERE translate(
      lower(btrim(regexp_replace(nombre, '[[:space:]]+', ' ', 'g'))),
      U&'\00e1\00e9\00ed\00f3\00fa\00fc\00f1', 'aeiouun'
    ) IN ('el paraiso', 'finca el paraiso', 'finca limon el paraiso');
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'No se encontro El Paraiso. Ejecuta ROLLBACK y consulta SELECT id, nombre, empresa_id FROM public.fincas para confirmar el nombre exacto.';
    WHEN TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'Hay varias fincas El Paraiso. Ejecuta ROLLBACK y confirma el ID antes de continuar.';
  END;

  BEGIN
    SELECT id INTO STRICT responsable
    FROM public.usuarios
    WHERE activo IS TRUE
      AND translate(
        lower(btrim(regexp_replace(nombre, '[[:space:]]+', ' ', 'g'))),
        U&'\00e1\00e9\00ed\00f3\00fa\00fc\00f1', 'aeiouun'
      ) = 'miguel lliguipuma';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'No se encontro el usuario activo Miguel Lliguipuma. Ejecuta ROLLBACK y confirma su nombre e ID en public.usuarios.';
    WHEN TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'Hay varios usuarios Miguel Lliguipuma. Ejecuta ROLLBACK y confirma el ID antes de continuar.';
  END;

  UPDATE _enfunde_parametros
  SET finca_id = finca_destino, usuario_id = responsable, operario_id = responsable;
END $$;

DO $$
DECLARE p record;
BEGIN
  SELECT * INTO p FROM _enfunde_parametros;
  IF p.finca_id IS NULL OR p.usuario_id IS NULL OR p.operario_id IS NULL OR p.desde IS NULL THEN
    RAISE EXCEPTION 'Completa finca_id, usuario_id, operario_id y desde. Si la transaccion queda abortada, ejecuta ROLLBACK antes de repetir.';
  END IF;
  IF p.semanas_base < 1 OR p.semanas_base > 52 THEN
    RAISE EXCEPTION 'semanas_base debe estar entre 1 y 52';
  END IF;
  IF p.desde >= p.lunes_actual THEN
    RAISE EXCEPTION 'desde debe ser anterior a la semana actual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fincas WHERE id = p.finca_id)
     OR NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p.usuario_id)
     OR NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p.operario_id) THEN
    RAISE EXCEPTION 'La finca o los responsables no existen o no son visibles para tu conexion';
  END IF;
  -- Impide que otra insercion se adelante a la comprobacion de semanas vacias.
  -- No desactiva permisos ni politicas RLS.
  IF p.aplicar THEN
    LOCK TABLE public.registro_enfunde IN SHARE ROW EXCLUSIVE MODE;
    LOCK TABLE public.calendarios_enfunde IN SHARE MODE;
  END IF;
END $$;

CREATE TEMP TABLE _enfunde_base ON COMMIT DROP AS
SELECT date_trunc('week', r.fecha::timestamp)::date AS lunes,
       SUM(r.cantidad_fundas)::numeric AS total_semanal
FROM public.registro_enfunde r
JOIN _enfunde_parametros p ON p.finca_id = r.finca_id
JOIN public.fincas f ON f.id = r.finca_id
LEFT JOIN public.calendarios_enfunde c ON c.id = r.calendario_id
WHERE r.fecha < date_trunc('week', p.desde::timestamp)::date
GROUP BY date_trunc('week', r.fecha::timestamp)::date
HAVING BOOL_AND(COALESCE(
  c.id IS NOT NULL
  AND c.empresa_id = f.empresa_id
  AND c.anio = EXTRACT(ISOYEAR FROM r.fecha)::integer
  AND c.semana = EXTRACT(WEEK FROM r.fecha)::integer
  AND r.cantidad_fundas IS NOT NULL
  AND r.cantidad_fundas >= 0
  AND COALESCE(r.observaciones, '') NOT LIKE '%[ESTIMADO_PROMEDIO_V1]%'
, false))
ORDER BY lunes DESC
LIMIT (SELECT semanas_base FROM _enfunde_parametros);

CREATE TEMP TABLE _enfunde_plan ON COMMIT DROP AS
WITH promedio AS (
  SELECT COUNT(*) AS semanas_utilizadas,
         MIN(lunes) AS base_desde,
         MAX(lunes) + 6 AS base_hasta,
         AVG(total_semanal) AS promedio_semanal,
         ROUND(AVG(total_semanal)) AS cantidad_propuesta
  FROM _enfunde_base
), semanas AS (
  SELECT p.*, f.empresa_id, f.nombre AS finca_nombre, s.lunes::date AS lunes
  FROM _enfunde_parametros p
  JOIN public.fincas f ON f.id = p.finca_id
  CROSS JOIN LATERAL generate_series(
    date_trunc('week', p.desde::timestamp),
    (p.lunes_actual - 7)::timestamp,
    INTERVAL '1 week'
  ) AS s(lunes)
)
SELECT s.*, s.lunes + 6 AS fecha_referencial,
       EXTRACT(ISOYEAR FROM s.lunes)::integer AS anio,
       EXTRACT(WEEK FROM s.lunes)::integer AS semana,
       cal.calendario_id, cal.color_cinta, pr.*,
       CASE
         WHEN EXISTS (
           SELECT 1 FROM public.registro_enfunde r
           LEFT JOIN public.calendarios_enfunde c ON c.id = r.calendario_id
           WHERE r.finca_id = s.finca_id
             AND ((r.fecha >= s.lunes AND r.fecha < s.lunes + 7)
                  OR (c.anio = EXTRACT(ISOYEAR FROM s.lunes)::integer
                      AND c.semana = EXTRACT(WEEK FROM s.lunes)::integer))
         ) THEN 'OMITIR: YA TIENE REGISTROS'
         WHEN cal.numero_calendarios <> 1 THEN 'BLOQUEADO: CALENDARIO AUSENTE O DUPLICADO'
         WHEN pr.semanas_utilizadas <> s.semanas_base THEN 'BLOQUEADO: HISTORIAL INSUFICIENTE'
         WHEN pr.cantidad_propuesta IS NULL OR pr.cantidad_propuesta < 1
              OR pr.cantidad_propuesta > 2147483647 THEN 'BLOQUEADO: PROMEDIO NO VALIDO'
         ELSE 'INSERTAR ESTIMACION'
       END AS estado
FROM semanas s
CROSS JOIN promedio pr
CROSS JOIN LATERAL (
  SELECT COUNT(*) AS numero_calendarios, MIN(c.id) AS calendario_id,
         MIN(ci.color) AS color_cinta
  FROM public.calendarios_enfunde c
  LEFT JOIN public.cintas ci ON ci.id = c.color_id
  WHERE c.empresa_id = s.empresa_id
    AND c.anio = EXTRACT(ISOYEAR FROM s.lunes)::integer
    AND c.semana = EXTRACT(WEEK FROM s.lunes)::integer
) cal;

-- Resultado 1: identidades resueltas y periodo efectivo de esta ejecucion.
SELECT f.id AS finca_id, f.nombre AS finca, u.id AS usuario_y_operario_id,
       u.nombre AS responsable, p.desde, p.lunes_actual - 1 AS hasta, p.aplicar
FROM _enfunde_parametros p
JOIN public.fincas f ON f.id = p.finca_id
JOIN public.usuarios u ON u.id = p.usuario_id;

-- Resultado 2: totales historicos usados para calcular el promedio.
-- Una semana con cualquier estimacion de este script queda fuera de la base.
SELECT * FROM _enfunde_base ORDER BY lunes;

-- Resultado 3: revisar finca, fechas, cinta, cantidad y motivo de omision.
SELECT finca_id, finca_nombre, anio, semana, fecha_referencial,
       color_cinta, calendario_id, cantidad_propuesta, promedio_semanal,
       semanas_utilizadas, base_desde, base_hasta, estado
FROM _enfunde_plan ORDER BY lunes;

DO $$
BEGIN
  IF (SELECT aplicar FROM _enfunde_parametros)
     AND EXISTS (SELECT 1 FROM _enfunde_plan WHERE estado LIKE 'BLOQUEADO:%') THEN
    RAISE EXCEPTION 'Hay semanas bloqueadas. No se inserto nada. Ejecuta ROLLBACK y revisa el plan con aplicar=false.';
  END IF;
END $$;

-- Con aplicar=false devuelve cero filas y NO modifica registro_enfunde.
INSERT INTO public.registro_enfunde
  (fecha, finca_id, usuario_id, operario_id, calendario_id, cantidad_fundas, observaciones)
SELECT fecha_referencial, finca_id, usuario_id, operario_id, calendario_id,
       cantidad_propuesta::integer,
       format(
         '[ESTIMADO_PROMEDIO_V1] No es conteo real. Promedio de %s semanas registradas entre %s y %s: %s fundas/semana, redondeado a %s. Fecha referencial: domingo de semana ISO %s/%s. Carga: %s.',
         semanas_utilizadas, base_desde, base_hasta,
         ROUND(promedio_semanal, 2), cantidad_propuesta, semana, anio, CURRENT_DATE
       )
FROM _enfunde_plan
WHERE aplicar AND estado = 'INSERTAR ESTIMACION'
ORDER BY lunes
RETURNING id, finca_id, fecha, calendario_id, cantidad_fundas, observaciones;

COMMIT;
