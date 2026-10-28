import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
after(() => server.close());
const { evaluarEstadoFinca: evaluar } = await server.ssrLoadModule('/src/domain/estadoFinca.ts');
const ahora = new Date('2026-10-27T12:00:00-05:00');
function senales(puntos = 90, tipo = 'SANIDAD_VERDE') {
  return { produccion: { score_total: puntos, anio: 2026, semana: 44, total_racimos: 150 },
    sanidad: { tipo, fecha_evento: '2026-10-20', mensaje: 'Semáforo registrado.' },
    consultadoEn: ahora.getTime() };
}

test('umbrales existentes de produccion determinan el estado sin sumar porcentajes nuevos', () => {
  for (const [puntos, esperado] of [[0, 'critico'], [59.9, 'critico'], [60, 'atencion'], [79.9, 'atencion'], [80, 'favorable'], [100, 'favorable']]) {
    assert.equal(evaluar(senales(puntos), 2026, ahora).estado, esperado);
  }
});
test('el semaforo mas urgente prevalece y no se oculta por falta de produccion', () => {
  assert.equal(evaluar(senales(90, 'SANIDAD_AMARILLO'), 2026, ahora).estado, 'atencion');
  const input = senales(90, 'SANIDAD_ROJO');
  input.produccion = null;
  const resultado = evaluar(input, 2026, ahora);
  assert.equal(resultado.estado, 'critico');
  assert.equal(resultado.incompleto, true);
});
test('datos ausentes, cero racimos o valores invalidos no representan una finca sana', () => {
  for (const score of [null, { score_total: 90 }, { ...senales().produccion, total_racimos: 0 },
    { ...senales().produccion, score_total: '' }, { ...senales().produccion, score_total: 101 }]) {
    assert.equal(evaluar({ ...senales(), produccion: score }, 2026, ahora).estado, 'sin-datos');
  }
  for (const sanidad of [null, { ...senales().sanidad, tipo: 'SANIDAD_GRIS' },
    { ...senales().sanidad, fecha_evento: '2026-10-28' }, { ...senales().sanidad, fecha_evento: '2026-02-31' }]) {
    assert.equal(evaluar({ ...senales(), sanidad }, 2026, ahora).estado, 'sin-datos');
  }
});
test('una alerta de produccion conocida se conserva si falla el semaforo', () => {
  const result = evaluar({ ...senales(45), sanidad: null }, 2026, ahora);
  assert.equal(result.estado, 'critico');
  assert.equal(result.incompleto, true);
});
test('periodos historicos o futuros no mezclan datos con sanidad actual', () => {
  for (const anio of [2025, 2027]) {
    const input = senales(40, 'SANIDAD_ROJO');
    input.produccion.anio = anio;
    const result = evaluar(input, anio, ahora);
    assert.equal(result.estado, 'sin-datos');
    assert.equal(result.historico, true);
  }
});
test('solo admite semana actual o anterior y consulta de menos de 24 horas', () => {
  for (const [semana, esperado] of [[43, 'favorable'], [42, 'sin-datos'], [45, 'sin-datos'], [0, 'sin-datos'], [54, 'sin-datos']]) {
    const input = senales(); input.produccion.semana = semana;
    assert.equal(evaluar(input, 2026, ahora).estado, esperado);
  }
  for (const consultadoEn of [null, ahora.getTime() - 86400000, ahora.getTime() + 10000]) {
    assert.equal(evaluar({ ...senales(), consultadoEn }, 2026, ahora).estado, 'sin-datos');
  }
});
test('el cambio de año usa el año ISO y no inventa una semana 53', () => {
  const fecha = new Date('2027-01-01T12:00:00-05:00');
  const input = senales(); input.produccion.semana = 53; input.consultadoEn = fecha.getTime();
  assert.equal(evaluar(input, 2026, fecha).estado, 'favorable');
});

test('al cambiar de dia exige renovar la consulta del semaforo', () => {
  const fecha = new Date(2026, 9, 27, 0, 5);
  const input = senales();
  input.consultadoEn = new Date(2026, 9, 26, 23, 55).getTime();
  assert.equal(evaluar(input, 2026, fecha).estado, 'sin-datos');
});
