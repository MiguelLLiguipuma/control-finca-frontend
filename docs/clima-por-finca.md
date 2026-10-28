# Clima por finca

## Acceso y despliegue

- Ruta: `/clima`, menu Seguimiento > Clima por finca.
- Disponible para ADMIN, SUPERVISOR y OPERADOR, con el alcance de fincas existente.
- Desplegar primero el backend con `GET /api/clima/historial`, luego el frontend.
- No requiere una nueva migracion. Reutiliza `historial_clima_fincas` (migracion 019).
- No cambia el recolector, las predicciones ni los registros existentes.
- Actualizar vuelve a consultar el historial; no invoca `/clima/sync` ni al proveedor.

## Consulta

Parametros obligatorios: `finca_id`, `desde`, `hasta` (YYYY-MM-DD).
Periodo inclusivo de 1 a 366 dias, sin fechas futuras segun America/Guayaquil.
El backend valida sesion, rol, asignacion de finca y las politicas tenant existentes.
La respuesta contiene finca, periodo, ultimo registro global disponible, metodologia
y registros del periodo. El ultimo registro global puede estar fuera del periodo.
Las tarjetas de temperatura y lluvia muestran la ultima muestra del periodo.

Los dias ausentes se muestran como "Sin registro", nunca como lluvia cero.
Las UC del resumen suman solo las muestras disponibles y se etiquetan estimadas.
El CSV incluye tambien los dias ausentes y la calidad de los datos.

## Limitacion del historial actual

El recolector utiliza OpenWeather Current Weather: temperatura de una captura,
lluvia de 1 h o 3 h y UC calculadas como max(0, temperatura - 14).
Aunque la base use nombres como `temp_media` o `unidades_calor_dia`, no se trata
de una media diaria ni de lluvia total diaria. La ventana de lluvia no se conserva.
La vista no suma esas muestras de lluvia como precipitacion acumulada.
Los ceros heredados proceden del recolector; no certifican ausencia de lluvia diaria.

Para ofrecer diarios consolidados hace falta una fuente o agregacion apropiada,
guardar metodo, cobertura, zona horaria y procedencia, y separar los datos nuevos
del historial puntual. No se deben recalificar muestras antiguas como datos diarios.
Revisar licencia y coste del proveedor antes de activar una nueva integracion.
La humedad, el viento y las temperaturas minima/maxima no estan almacenados hoy.

## Verificacion local

- Frontend: `npm test` y `npm run build`.
- Backend: `node --test test/weatherHistory.test.js test/accessScope.guardrails.test.js test/permissions.matrix.test.js` y `npm run lint`.
- Se verificaron estados con y sin datos, cambio de finca, respuesta tardia,
  cambio de sesion, errores recuperables, fechas y huecos en graficos.
- La prueba visual usa datos simulados; no sustituye validar el endpoint desplegado
  con una sesion real y la base de Railway.
