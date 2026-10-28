export interface ClimaRegistro {
  fecha: string;
  temp_media: number | null;
  unidades_calor_dia: number | null;
  precipitacion_mm: number | null;
  actualizado_en: string | null;
}
export interface ClimaHistorial {
  finca: { id: number; nombre: string; latitud: number | null; longitud: number | null };
  periodo: { desde: string; hasta: string; dias: number };
  ultima_fecha: string | null;
  ultima_actualizacion: string | null;
  dias_atraso: number | null;
  metodologia: { tipo: string; temperatura_base: number; lluvia_diaria_disponible: boolean; fuente: string; nota: string };
  registros: ClimaRegistro[];
}
export interface ClimaDia extends ClimaRegistro { disponible: boolean }

export function fechaClimaHoy() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}
export function desplazarFecha(fecha: string, dias: number) {
  return new Date(Date.parse(fecha + 'T00:00:00Z') + dias * 86400000).toISOString().slice(0, 10);
}
export function validarPeriodoClima(desde: string, hasta: string, hoy = fechaClimaHoy()): string {
  const valida = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valida(desde) || !valida(hasta)) return 'Selecciona fechas válidas.';
  if (desde > hasta) return 'La fecha inicial debe ser anterior o igual a la final.';
  if (hasta > hoy) return 'El historial no admite fechas futuras.';
  if ((Date.parse(hasta) - Date.parse(desde)) / 86400000 >= 366) return 'Consulta como máximo 366 días por período.';
  return '';
}
export function diasDelHistorial(data: ClimaHistorial): ClimaDia[] {
  const mapa = new Map(data.registros.map(row => [row.fecha, row]));
  return Array.from({ length: data.periodo.dias }, (_, index) => {
    const fecha = desplazarFecha(data.periodo.desde, index);
    const registro = mapa.get(fecha);
    return registro ? { ...registro, disponible: true } : { fecha, disponible: false, temp_media: null, unidades_calor_dia: null, precipitacion_mm: null, actualizado_en: null };
  });
}
export function resumenClima(dias: ClimaDia[]) {
  const registros = dias.filter(row => row.disponible);
  const calor = registros.flatMap(row => row.unidades_calor_dia === null ? [] : [row.unidades_calor_dia]);
  return { diasConRegistro: registros.length, diasSinRegistro: dias.length - registros.length,
    ultimaMuestra: registros.at(-1) || null, ucRegistradas: calor.length ? calor.reduce((a, b) => a + b, 0) : null,
    diasConUc: calor.length };
}
export const formatoClima = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 }).format(value);
export const fechaClima = (value: string | null) => value ? value.split('-').reverse().join('/') : 'Sin registros';

export function climaCsv(data: ClimaHistorial) {
  const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = diasDelHistorial(data).map(row => [data.finca.id, row.fecha, row.temp_media, row.unidades_calor_dia,
    row.precipitacion_mm, row.disponible ? data.metodologia.tipo : 'SIN_REGISTRO', data.metodologia.lluvia_diaria_disponible ? 'diaria' : 'ventana_no_documentada', row.actualizado_en]);
  return '\uFEFF' + [['finca_id', 'fecha', 'temperatura_c', 'uc_registradas', 'precipitacion_mm', 'tipo_dato', 'ventana_precipitacion', 'actualizado_en'], ...rows].map(row => row.map(cell).join(',')).join('\r\n');
}
