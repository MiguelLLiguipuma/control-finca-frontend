import { getCurrentIsoWeekInfo, isoWeekStartDate, isoWeeksInYear, toLocalIsoDate } from '../utils/dateIso';

export interface ProduccionFinca {
  score_total?: number | string;
  clasificacion?: string;
  anio?: number | string;
  semana?: number | string;
  total_racimos?: number | string;
}

export interface SanidadFinca {
  tipo: string;
  fecha_evento: string;
  mensaje: string;
}

export interface SenalesFinca {
  produccion: ProduccionFinca | null;
  sanidad: SanidadFinca | null;
  consultadoEn: number | null;
}

export type EstadoPlanta = 'favorable' | 'atencion' | 'critico' | 'sin-datos';

const titulos: Record<EstadoPlanta, string> = {
  favorable: 'Indicadores favorables', atencion: 'Requiere atención',
  critico: 'Revisión prioritaria', 'sin-datos': 'Sin evaluación actual',
};

export function evaluarEstadoFinca(senales: SenalesFinca, anio: number, ahora = new Date()) {
  const actual = getCurrentIsoWeekInfo(ahora);
  const historico = anio !== actual.anio;
  const consultaVigente = senales.consultadoEn !== null
    && ahora.getTime() >= senales.consultadoEn
    && toLocalIsoDate(new Date(senales.consultadoEn)) === toLocalIsoDate(ahora)
    && ahora.getTime() - senales.consultadoEn < 24 * 60 * 60 * 1000;
  const score = senales.produccion;
  const puntos = score?.score_total == null || String(score.score_total).trim() === ''
    ? NaN : Number(score.score_total);
  const semana = Number(score?.semana);
  const anioScore = Number(score?.anio);
  const periodoValido = anioScore === anio && Number.isInteger(semana)
    && semana >= 1 && semana <= isoWeeksInYear(anio);
  const edad = periodoValido
    ? isoWeekStartDate(actual.anio, actual.semana).diff(isoWeekStartDate(anio, semana), 'week') : NaN;
  const scoreValido = Number.isFinite(puntos) && puntos >= 0 && puntos <= 100
    && Number(score?.total_racimos) > 0 && periodoValido;
  const produccionVigente = scoreValido && edad >= 0 && edad <= 1 && !historico && consultaVigente;
  const sanidad = senales.sanidad;
  const fecha = sanidad?.fecha_evento?.slice(0, 10) || '';
  const fechaDate = new Date(`${fecha}T00:00:00`);
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    && !Number.isNaN(fechaDate.getTime()) && fechaDate <= ahora
    && fechaDate.getDate() === Number(fecha.slice(8));
  const sanidadVigente = consultaVigente && fechaValida
    && ['SANIDAD_VERDE', 'SANIDAD_AMARILLO', 'SANIDAD_ROJO'].includes(sanidad?.tipo || '');
  const motivos: string[] = [];
  let estado: EstadoPlanta = 'sin-datos';

  if (historico) {
    motivos.push('El año seleccionado no es el actual. No se combina su producción con el estado sanitario actual.');
  } else {
    if (!consultaVigente) motivos.push('Actualiza los datos para obtener una lectura vigente.');
    if (!produccionVigente) motivos.push('Falta un índice de producción con cosecha de esta semana o la anterior.');
    if (!sanidadVigente) motivos.push('No hay un semáforo de fumigación vigente y verificable.');
    if (produccionVigente) motivos.push(puntos < 60
      ? 'El índice de producción está en riesgo (menos de 60 puntos).'
      : puntos < 80 ? 'La producción está estable, con margen de mejora (60 a 79,9 puntos).'
        : 'La producción alcanza la clasificación excelente (80 puntos o más).');
    if (sanidadVigente) motivos.push(sanidad!.mensaje || 'Semáforo de fumigación: ' + sanidad!.tipo.replace('SANIDAD_', '') + '.');
    // Una señal conocida de riesgo no se oculta porque falte la otra fuente.
    if ((produccionVigente && puntos < 60) || (sanidadVigente && sanidad?.tipo === 'SANIDAD_ROJO')) estado = 'critico';
    else if ((produccionVigente && puntos < 80) || (sanidadVigente && sanidad?.tipo === 'SANIDAD_AMARILLO')) estado = 'atencion';
    else if (produccionVigente && sanidadVigente) estado = 'favorable';
  }

  return {
    estado, titulo: titulos[estado], motivos, historico,
    incompleto: !historico && (!produccionVigente || !sanidadVigente),
    produccion: scoreValido ? `${puntos.toLocaleString('es-EC', { maximumFractionDigits: 1 })} / 100` : 'Sin dato',
    periodoProduccion: periodoValido ? `Semana ${semana} · ${anioScore}${!historico && !produccionVigente ? ' · No vigente' : ''}` : 'Sin período disponible',
    fumigacion: sanidadVigente ? ({ SANIDAD_VERDE: 'En plazo', SANIDAD_AMARILLO: 'Por revisar', SANIDAD_ROJO: 'Revisión prioritaria' } as Record<string, string>)[sanidad!.tipo] : 'Sin dato vigente',
    siguiente: historico ? 'Selecciona el año actual para ver la lectura operativa.'
      : estado === 'critico' ? 'Revisa las alertas y valida los registros en campo antes de tomar medidas.'
        : estado === 'atencion' ? 'Revisa la producción y la programación de fumigación.'
          : estado === 'favorable' ? 'Mantén al día los registros y el seguimiento en campo.'
            : 'Actualiza la consulta y comprueba los registros de cosecha y fumigación.',
  };
}
