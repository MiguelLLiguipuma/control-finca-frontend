import test from 'node:test';
import assert from 'node:assert/strict';
import { diasDelHistorial, resumenClima, validarPeriodoClima, climaCsv } from '../src/domain/clima.ts';

const data = { finca: { id: 4 }, periodo: { desde: '2026-07-01', hasta: '2026-07-03', dias: 3 }, metodologia: { tipo: 'MUESTRA_PUNTUAL', lluvia_diaria_disponible: false },
  registros: [ { fecha: '2026-07-01', temp_media: 26, unidades_calor_dia: 12, precipitacion_mm: 0 },
    { fecha: '2026-07-03', temp_media: 28, unidades_calor_dia: 14, precipitacion_mm: 2 } ] };

test('el dia ausente queda nulo, distinto del dia con lluvia cero', () => {
  const dias = diasDelHistorial(data);
  assert.equal(dias[0].precipitacion_mm, 0);
  assert.equal(dias[1].precipitacion_mm, null);
  assert.equal(dias[1].disponible, false);
  const resumen = resumenClima(dias);
  assert.equal(resumen.ucRegistradas, 26);
  assert.equal(resumen.diasConRegistro, 2);
  assert.equal(resumen.diasSinRegistro, 1);
  assert.equal('lluviaAcumulada' in resumen, false);
});

test('un periodo sin datos no se representa como temperatura ni calor cero', () => {
  const resumen = resumenClima(diasDelHistorial({ ...data, registros: [] }));
  assert.equal(resumen.ultimaMuestra, null);
  assert.equal(resumen.ucRegistradas, null);
  assert.equal(resumen.diasSinRegistro, 3);
});

test('valida fechas, orden, futuro y maximo de 366 dias', () => {
  assert.equal(validarPeriodoClima('2026-07-01', '2026-07-03', '2026-08-01'), '');
  assert.notEqual(validarPeriodoClima('2026-02-31', '2026-07-03', '2026-08-01'), '');
  assert.notEqual(validarPeriodoClima('2026-07-03', '2026-07-01', '2026-08-01'), '');
  assert.notEqual(validarPeriodoClima('2026-07-01', '2026-09-03', '2026-08-01'), '');
  assert.notEqual(validarPeriodoClima('2024-07-01', '2026-07-03', '2026-08-01'), '');
});

test('el CSV declara las muestras parciales y exporta el dia faltante sin inventar cero', () => {
  const csv = climaCsv(data);
  assert.match(csv, /"2026-07-02","","","","SIN_REGISTRO"/);
  assert.match(csv, /MUESTRA_PUNTUAL/);
  assert.match(csv, /ventana_no_documentada/);
});
