import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createPinia, setActivePinia } from 'pinia';
import path from 'node:path';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const server = await createServer({
  configFile: false,
  resolve: { alias: { '@': path.resolve('src') } },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
after(() => server.close());
const { useCosechaStore } = await server.ssrLoadModule('/src/stores/cosecha/cosechaStore.ts');
const { cosechaService } = await server.ssrLoadModule('/src/services/cosecha/cosechaService.ts');

beforeEach(() => { storage.clear(); storage.set('token', 'test-session'); setActivePinia(createPinia()); });
const cinta = () => ({ calendario_id: 10, semana_enfunde: 38, anio: 2026, saldo_en_campo: 20, color_cinta: 'Verde', color_hex: '#009966', cantidad_a_cosechar: 3, rechazo: 1, edad: 0 });
function iniciar() {
  const store = useCosechaStore();
  store.fincaActivaId = 4;
  store.saldosPendientes = [cinta()];
  return store;
}
const pendiente = (id) => ({ id_local: id, finca_id: 4, fecha: '2026-09-17', timestamp: Date.now(), detalles: [{ calendario_id: 10, cantidad_racimos: 3, cantidad_rechazo: 1 }] });

test('guardar offline limpia lo enviado y reserva el saldo; un segundo envio no duplica', async (t) => {
  const store = iniciar();
  t.mock.method(cosechaService, 'registrarLiquidacion', async () => { throw new Error('offline'); });
  const result = await store.enviarCosecha(4, '2026-09-17');
  assert.equal(result.queued, true);
  assert.equal(store.totalDigitado, 0);
  assert.equal(store.saldosPendientes[0].saldo_en_campo, 16);
  assert.equal(JSON.parse(storage.get('cola_cosecha_pendiente')).length, 1);
  assert.equal((await store.enviarCosecha(4, '2026-09-17')).ok, false);
  assert.equal(store.colaSincronizacion.length, 1);
});

test('si no hay espacio local conserva el conteo y no confirma guardado', async (t) => {
  const store = iniciar();
  t.mock.method(cosechaService, 'registrarLiquidacion', async () => { throw new Error('offline'); });
  t.mock.method(localStorage, 'setItem', () => { throw new Error('quota'); });
  assert.equal((await store.enviarCosecha(4, '2026-09-17')).ok, false);
  assert.equal(store.totalDigitado, 4);
  assert.equal(store.colaSincronizacion.length, 0);
});

test('un envio confirmado no reaparece si falla la recarga del inventario', async (t) => {
  const store = iniciar();
  t.mock.method(cosechaService, 'registrarLiquidacion', async () => ({}));
  t.mock.method(cosechaService, 'getBalance', async () => { throw new Error('offline'); });
  assert.equal((await store.enviarCosecha(4, '2026-09-17')).ok, true);
  assert.equal(store.totalDigitado, 0);
  assert.equal(store.colaSincronizacion.length, 0);
});

test('sincronizaciones simultaneas no duplican llamadas ni eliminan nuevos pendientes', async (t) => {
  const store = iniciar();
  store.isOnline = true;
  store.colaSincronizacion = [pendiente('primero')];
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  let calls = 0;
  t.mock.method(cosechaService, 'registrarLiquidacion', async () => { calls++; await pending; });
  t.mock.method(cosechaService, 'getBalance', async () => { throw new Error('offline'); });
  const sync = store.sincronizarCola();
  await store.sincronizarCola();
  store.colaSincronizacion.push(pendiente('nuevo'));
  resolve();
  await sync;
  assert.equal(calls, 1);
  assert.deepEqual(store.colaSincronizacion.map((p) => p.id_local), ['nuevo']);
  assert.equal(store.totalDigitado, 4);
  assert.equal(store.sincronizando, false);
});

test('recarga conserva cantidades nuevas y descuenta pendientes de la misma finca', async (t) => {
  const store = iniciar();
  store.colaSincronizacion = [pendiente('cola')];
  let resolve;
  t.mock.method(cosechaService, 'getBalance', () => new Promise(done => { resolve = done; }));
  const refresh = store.cargarSaldos(4);
  store.saldosPendientes[0].cantidad_a_cosechar = 5;
  const now = new Date();
  const { getCurrentIsoWeekInfo } = await server.ssrLoadModule('/src/utils/dateIso.ts');
  const iso = getCurrentIsoWeekInfo(now);
  resolve([{ ...cinta(), semana_enfunde: iso.semana, anio: iso.anio }]);
  await refresh;
  assert.equal(store.saldosPendientes[0].cantidad_a_cosechar, 5);
  assert.equal(store.saldosPendientes[0].saldo_en_campo, 16);
});

test('una sesion vencida no manda el pendiente a fallidos', async (t) => {
  const store = iniciar();
  store.isOnline = true;
  store.colaSincronizacion = [{ ...pendiente('cola'), intentos: 2 }];
  t.mock.method(cosechaService, 'registrarLiquidacion', async () => { throw { response: { status: 401 } }; });
  await store.sincronizarCola();
  assert.equal(store.colaSincronizacion.length, 1);
  assert.equal(store.colaFallida.length, 0);
  assert.equal(store.colaSincronizacion[0].intentos, 2);
});

test('no envia un inventario bajo una finca distinta', async () => {
  const store = iniciar();
  assert.equal((await store.enviarCosecha(9, '2026-09-17')).ok, false);
  assert.equal(store.totalDigitado, 4);
});

test('no intenta sincronizar sin sesion evitando recargas del login', async (t) => {
  const store = iniciar();
  store.isOnline = true;
  store.colaSincronizacion = [pendiente('cola')];
  storage.delete('token');
  const mock = t.mock.method(cosechaService, 'registrarLiquidacion', async () => { throw new Error('No debe llamarse'); });
  await store.sincronizarCola();
  assert.equal(mock.mock.callCount(), 0);
  assert.equal(store.colaSincronizacion.length, 1);
});

test('un fallo en la segunda escritura local no guarda un reporte mientras deja el conteo activo', async (t) => {
  const store = iniciar();
  t.mock.method(cosechaService, 'registrarLiquidacion', async () => { throw new Error('offline'); });
  let writes = 0;
  t.mock.method(localStorage, 'setItem', (key, value) => {
    if (++writes === 2) throw new Error('quota');
    storage.set(key, value);
  });
  assert.equal((await store.enviarCosecha(4, '2026-09-17')).ok, false);
  assert.equal(store.totalDigitado, 4);
  assert.equal(storage.has('cola_cosecha_pendiente'), false);
});
