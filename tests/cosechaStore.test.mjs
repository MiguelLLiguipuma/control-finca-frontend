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
const { default: api } = await server.ssrLoadModule('/src/services/api.ts');

beforeEach(() => { storage.clear(); storage.set('token', 'test-session'); storage.set('user', JSON.stringify({ id: 1, empresa_id: 2 })); setActivePinia(createPinia()); });
const clave = 'cosecha_colas_v2:2:1';
const cinta = () => ({ calendario_id: 10, semana_enfunde: 38, anio: 2026, saldo_en_campo: 20, color_cinta: 'Verde', color_hex: '#009966', cantidad_a_cosechar: 3, rechazo: 1, edad: 0 });
function iniciar() {
  const store = useCosechaStore();
  store.activarSesion();
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
  assert.equal(JSON.parse(storage.get(clave)).pendientes.length, 1);
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

test('pendientes y fallidos se guardan juntos con una unica escritura atomica', async (t) => {
  const store = iniciar();
  t.mock.method(cosechaService, 'registrarLiquidacion', async () => { throw new Error('offline'); });
  let writes = 0;
  t.mock.method(localStorage, 'setItem', (key, value) => {
    writes++;
    storage.set(key, value);
  });
  assert.equal((await store.enviarCosecha(4, '2026-09-17')).ok, true);
  assert.equal(store.totalDigitado, 0);
  assert.equal(writes, 1);
  assert.equal(JSON.parse(storage.get(clave)).pendientes.length, 1);
});

test('cada cuenta recupera solo su cola y los pendientes antiguos no se atribuyen automaticamente', () => {
  storage.set('cola_cosecha_pendiente', JSON.stringify([pendiente('antiguo')]));
  const store = iniciar();
  assert.equal(store.pendientesAntiguos, 1);
  assert.equal(store.colaSincronizacion.length, 0);
  store.colaSincronizacion = [pendiente('usuario1')];
  store.persistirCola();
  storage.set('user', JSON.stringify({ id: 2, empresa_id: 2 }));
  store.activarSesion();
  assert.equal(store.colaSincronizacion.length, 0);
  assert.equal(store.totalDigitado, 0);
  store.colaSincronizacion = [pendiente('usuario2')];
  store.persistirCola();
  storage.set('user', JSON.stringify({ id: 1, empresa_id: 2 }));
  store.activarSesion();
  assert.deepEqual(store.colaSincronizacion.map(p => p.id_local), ['usuario1']);
  assert.equal(JSON.parse(storage.get('cola_cosecha_pendiente'))[0].id_local, 'antiguo');
});

test('cambiar de cuenta durante sincronizacion detiene los siguientes envios', async (t) => {
  const store = iniciar();
  store.isOnline = true;
  store.colaSincronizacion = [pendiente('primero'), pendiente('segundo')];
  store.persistirCola();
  const api = t.mock.method(cosechaService, 'registrarLiquidacion', async (_p, propietario) => {
    assert.equal(propietario, '2:1');
    storage.set('user', JSON.stringify({ id: 2, empresa_id: 2 }));
  });
  await store.sincronizarCola();
  assert.equal(api.mock.callCount(), 1);
  assert.equal(store.propietario, '2:2');
  assert.equal(store.colaSincronizacion.length, 0);
  assert.deepEqual(JSON.parse(storage.get(clave)).pendientes.map(p => p.id_local), ['segundo']);
});

test('fallidos se corrigen conservando el UUID y quedan pendientes sin conexion', async () => {
  const store = iniciar();
  store.isOnline = false;
  store.colaFallida = [pendiente('mismo-id')];
  const detalles = [{ calendario_id: 10, cantidad_racimos: 2, cantidad_rechazo: 0 }];
  assert.equal(await store.reintentarFallido('mismo-id', { fecha: '2026-02-30', detalles }), false);
  assert.equal(await store.reintentarFallido('mismo-id', { fecha: '2026-09-17', detalles: [{ ...detalles[0], cantidad_racimos: -1 }] }), false);
  assert.equal(await store.reintentarFallido('mismo-id', { fecha: '2026-09-17', detalles }), true);
  assert.equal(store.colaFallida.length, 0);
  assert.equal(store.colaSincronizacion[0].id_local, 'mismo-id');
  assert.equal(JSON.parse(storage.get(clave)).pendientes[0].detalles[0].cantidad_racimos, 2);
});

test('corregir sin espacio no pierde el original ni confirma un reenvio', async (t) => {
  const store = iniciar();
  store.colaFallida = [pendiente('original')];
  t.mock.method(localStorage, 'setItem', () => { throw new Error('quota'); });
  assert.equal(await store.reintentarFallido('original', pendiente('original')), false);
  assert.equal(store.colaFallida.length, 1);
  assert.equal(store.colaSincronizacion.length, 0);
});

test('cola ilegible bloquea escrituras para conservar el contenido recuperable', async () => {
  storage.set(clave, '{roto');
  const store = iniciar();
  assert.ok(store.errorAlmacenamiento);
  assert.equal((await store.enviarCosecha(4, '2026-09-17')).ok, false);
  assert.equal(storage.get(clave), '{roto');
});

test('un error de validacion aparece inmediatamente en la bandeja de correccion', async (t) => {
  const store = iniciar();
  store.isOnline = true;
  store.colaSincronizacion = [pendiente('validacion')];
  t.mock.method(cosechaService, 'registrarLiquidacion', async () => { throw { response: { status: 422, data: { message: 'Saldo insuficiente' } } }; });
  await store.sincronizarCola();
  assert.equal(store.colaSincronizacion.length, 0);
  assert.equal(store.colaFallida[0].ultimoError, 'Saldo insuficiente');
  assert.equal(JSON.parse(storage.get(clave)).fallidos.length, 1);
});

test('el limite de peticiones no convierte el reporte en un error de datos', async (t) => {
  const store = iniciar();
  store.isOnline = true;
  store.colaSincronizacion = [pendiente('rate-limit')];
  t.mock.method(cosechaService, 'registrarLiquidacion', async () => { throw { response: { status: 429 } }; });
  await store.sincronizarCola();
  assert.equal(store.colaSincronizacion.length, 1);
  assert.equal(store.colaFallida.length, 0);
});

test('el interceptor impide enviar si la sesion cambia justo antes de despachar HTTP', async (t) => {
  const previous = api.defaults.adapter;
  let calls = 0;
  api.defaults.adapter = async () => { calls++; throw new Error('No debe despachar'); };
  t.after(() => { api.defaults.adapter = previous; });
  const request = cosechaService.registrarLiquidacion(pendiente('interceptor'), '2:1');
  storage.set('user', JSON.stringify({ id: 2, empresa_id: 2 }));
  await assert.rejects(request, /sesion cambio/);
  assert.equal(calls, 0);
});

test('estructura de cola invalida se conserva sin intentar sincronizar', async (t) => {
  const raw = JSON.stringify({ pendientes: [null], fallidos: [] });
  storage.set(clave, raw);
  const store = iniciar();
  const send = t.mock.method(cosechaService, 'registrarLiquidacion', async () => {});
  await store.sincronizarCola();
  assert.ok(store.errorAlmacenamiento);
  assert.equal(send.mock.callCount(), 0);
  assert.equal(storage.get(clave), raw);
});
