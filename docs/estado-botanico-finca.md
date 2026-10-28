# Estado botanico de la finca

El dashboard muestra una ilustracion de banano como resumen operativo. No es
un diagnostico agronomico, ni representa una planta real identificada en campo.
No modifica registros ni incorpora llamadas API adicionales.

## Fuentes y reglas

- Indice de produccion existente: corte ideal, rechazo, edad y variacion semanal.
  Se conservan los umbrales del backend: menos de 60, riesgo; de 60 a menos de
  80, estable; de 80 a 100, excelente. No se genera otro porcentaje de salud.
- Semaforo de fumigacion existente: se usa el resultado del backend, no se
  prescribe tratamiento ni se interpreta como presencia de enfermedad.
- Revision prioritaria: produccion en riesgo o semaforo rojo.
- Atencion: produccion estable o semaforo amarillo.
- Favorable: ambas fuentes vigentes, produccion excelente y semaforo verde.
- Sin evaluacion: datos insuficientes, periodo no actual o consulta vencida.
  Una alerta conocida mantiene su prioridad aunque falte la otra fuente;
  la interfaz indica que la lectura es parcial.

Una produccion util requiere racimos mayores a cero, puntuacion entre 0 y 100,
anio y semana ISO validos y semana actual o anterior. Esta ultima restriccion
es una politica conservadora de vigencia visual, no una regla agronomica.
El frontend no recalcula ni certifica la exactitud del indice del backend.
La consulta debe pertenecer al mismo dia local y tener menos de 24 horas.
La vigencia se revisa cada minuto sin peticiones automaticas.
Los periodos no actuales se mantienen neutrales para no mezclarlos con
fumigaciones actuales. Las fechas futuras o invalidas se descartan.

## Presentacion

`EstadoBotanicoFinca.vue` recibe senales estructuradas del store. El cache
conserva una copia de ellas y se limpian al cambiar finca o periodo.
`estadoFinca.ts` contiene las reglas puras, cubiertas por pruebas unitarias.
La planta y el boton Ver criterios abren el fundamento y la accion sugerida.
El acceso a alertas conserva el permiso `view.alertas`.

Ilustracion original generada para este proyecto con ImageGen, tres estados
en una tira transparente. El recurso WebP conserva transparencia, mide
1881 x 836 y pesa aproximadamente 458 KiB. La animacion CSS no requiere
servicios externos, se puede pausar y respeta movimiento reducido.
En ausencia de datos se muestra neutra, en gris y sin movimiento.

Clima, sensores, plagas observadas y otras alertas no forman parte de esta
primera lectura. Incorporarlas exige definir fuentes fiables y criterios
explicables antes de cambiar la representacion visual.
