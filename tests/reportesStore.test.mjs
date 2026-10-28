import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createPinia, setActivePinia } from 'pinia';
import path from 'node:path';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
};
const server = await createServer({
  configFile: false, resolve: { alias: { '@': path.resolve('src') } },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom',
});
after(() => server.close());
const { useReportesStore } = await server.ssrLoadModule('/src/stores/reportesStore.ts');
const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth/authStore.ts');
const { reporteService: service } = await server.ssrLoadModule('/src/services/reporteService.ts');
const { reportesSeguridadService: security } = await server.ssrLoadModule('/src/services/reportes/reportesSeguridadService.ts');
let user = 100;
beforeEach(() => {
  storage.clear();
  storage.set('user', JSON.stringify({ id: ++user, empresa_id: 1, nombre: 'Prueba' }));
  storage.set('token', 'reportes-test');
  setActivePinia(createPinia());
});
const mensual = [{ mes: 'January', total_mes: 120 }, { mes: 'February', total_mes: 240 }];
const kpis = (total = 360) => [{ data: [{ total_fundas: total }] }, { data: mensual },
  { data: [{ semana: 6 }] }, { data: [{ promedio_semanal: 90 }] }];
function preparar(t) {
  t.mock.method(service, 'getKpisData', async () => kpis());
  t.mock.method(service, 'getScoreSalud', async () => ({ data: null }));
  t.mock.method(service, 'getComparativo', async () => ({ data: mensual }));
  t.mock.method(service, 'getSemanal', async () => ({ data: [{ semana: 6, total_semana: 120 }] }));
  t.mock.method(service, 'getRendimientoCintas', async () => ({ data: [{ color: 'Verde', total_fundas: 360 }] }));
  t.mock.method(security, 'getAlertas', async () => []);
  const store = useReportesStore();
  store.anioSeleccionado = 2026;
  return store;
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

test('indicadores con unidades, salud ausente sin cero inventado y hora real de consulta', async t => {
  const store = preparar(t);
  await store.cargarReportes(1);
  assert.equal(store.tarjetas[0].value, 360);
  assert.equal(store.tarjetas[1].value, 180);
  assert.equal(store.tarjetas[4].value, 'Sin dato');
  assert.ok(store.actualizadoEn);
  assert.equal(store.sideStats.some(item => item.change !== undefined), false);
  const time = store.actualizadoEn;
  await store.cargarReportes(1);
  assert.equal(service.getKpisData.mock.callCount(), 1);
  assert.equal(store.actualizadoEn, time);
  await store.cargarReportes(1, true);
  assert.equal(service.getKpisData.mock.callCount(), 2);
});

test('una respuesta antigua no sobreescribe la finca recuperada de cache', async t => {
  const store = preparar(t);
  await store.cargarReportes(1);
  const gate = deferred();
  service.getKpisData.mock.mockImplementation(() => gate.promise);
  const old = store.cargarReportes(2);
  await store.cargarReportes(1);
  gate.resolve(kpis(999));
  await old;
  assert.equal(store.tarjetas[0].value, 360);
  assert.equal(store.loading, false);
});

test('un error de una consulta anterior no borra la nueva', async t => {
  const store = preparar(t);
  const gate = deferred();
  service.getKpisData.mock.mockImplementation(id => id === 1 ? gate.promise : Promise.resolve(kpis(720)));
  const old = store.cargarReportes(1);
  await store.cargarReportes(2);
  gate.reject(new Error('old failure'));
  await old;
  assert.equal(store.tarjetas[0].value, 720);
  assert.equal(store.error, null);
});

test('quitar la finca invalida consultas pendientes y limpia estados', async t => {
  const store = preparar(t);
  const gate = deferred();
  security.getAlertas.mock.mockImplementation(() => gate.promise);
  const old = store.cargarReportes(1);
  await tick();
  await store.cargarReportes(null);
  gate.resolve([]);
  await old;
  assert.equal(store.tarjetas.length, 0);
  assert.equal(store.loading, false);
  assert.equal(store.actualizadoEn, null);
});

test('cambiar periodo mientras llegan comparativos no mezcla series', async t => {
  const store = preparar(t);
  store.modoComparativo = 'comparativo';
  const gate = deferred();
  service.getComparativo.mock.mockImplementation(() => gate.promise);
  const old = store.cargarReportes(1);
  await tick();
  store.anioSeleccionado = 2025;
  store.modoComparativo = 'actual';
  await store.cargarReportes(1);
  gate.resolve({ data: [{ mes: 'January', total_mes: 999 }] });
  await old;
  assert.equal(store.chartSeries.length, 1);
  assert.equal(store.chartSeries[0].name, 'Año 2025');
});

test('comparativo fallido conserva año seleccionado sin simular ceros y permite reintentar', async t => {
  const store = preparar(t);
  store.modoComparativo = 'comparativo';
  service.getComparativo.mock.mockImplementation(async () => { throw new Error('unavailable'); });
  service.getSemanal.mock.mockImplementation(async (_id, year) => {
    if (year === 2025) throw new Error('unavailable');
    return { data: [{ semana: 6, total_semana: 120 }] };
  });
  await store.cargarReportes(1);
  assert.equal(store.chartSeries.length, 1);
  assert.equal(store.chartSeriesSemanal.length, 1);
  assert.equal(store.avisos.length, 2);
  await store.cargarReportes(1);
  assert.equal(service.getKpisData.mock.callCount(), 2);
});

test('cache no comparte registros personales entre usuarios', async t => {
  const store = preparar(t);
  store.scopeDatos = 'propio';
  await store.cargarReportes(1);
  useAuthStore().user = { id: 9999, empresa_id: 1 };
  await store.cargarReportes(1);
  assert.equal(service.getKpisData.mock.callCount(), 2);
});

test('un fallo parcial se distingue de un periodo vacio y se limpia al reintentar', async t => {
  const store = preparar(t);
  service.getSemanal.mock.mockImplementation(async () => { throw new Error('unavailable'); });
  await store.cargarReportes(1);
  assert.match(store.erroresGraficos.semanal, /No se pudo/);
  assert.equal(store.tarjetas[0].value, 360);
  service.getSemanal.mock.mockImplementation(async () => ({ data: [] }));
  await store.cargarReportes(1, true);
  assert.deepEqual(store.erroresGraficos, {});
  assert.deepEqual(store.avisos, []);
});

test('periodo sin registros no fabrica una serie mensual en cero', async t => {
  const store = preparar(t);
  service.getKpisData.mock.mockImplementation(async () => Array.from({ length: 4 }, () => ({ data: [] })));
  service.getSemanal.mock.mockImplementation(async () => ({ data: [] }));
  await store.cargarReportes(1);
  assert.deepEqual(store.chartSeries, []);
  assert.deepEqual(store.chartCategoriesSemanal, []);
});

test('senales botanicas conservan datos estructurados en cache y se limpian al cambiar finca', async t => {
  const store = preparar(t);
  service.getScoreSalud.mock.mockImplementation(async () => ({ data: {
    score_total: '84', total_racimos: 120, anio: 2026, semana: 44,
  } }));
  security.getAlertas.mock.mockImplementation(async () => [{
    tipo: 'SANIDAD_VERDE', fecha_evento: '2026-10-20', mensaje: 'En plazo',
  }]);
  await store.cargarReportes(1);
  assert.equal(store.senalesFinca.produccion.score_total, '84');
  assert.equal(store.senalesFinca.sanidad.tipo, 'SANIDAD_VERDE');
  const consulta = store.senalesFinca.consultadoEn;
  store.senalesFinca.produccion.score_total = '10';
  await store.cargarReportes(1);
  assert.equal(store.senalesFinca.produccion.score_total, '84');
  assert.equal(store.senalesFinca.consultadoEn, consulta);
  const gate = deferred();
  service.getKpisData.mock.mockImplementation(() => gate.promise);
  const pending = store.cargarReportes(2);
  assert.deepEqual(store.senalesFinca, { produccion: null, sanidad: null, consultadoEn: null });
  await store.cargarReportes(null);
  gate.resolve(kpis());
  await pending;
  assert.equal(store.senalesFinca.produccion, null);
});
