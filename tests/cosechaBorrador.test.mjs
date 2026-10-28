import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import { createPinia, setActivePinia } from 'pinia';
import { createRenderer, nextTick } from 'vue';

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
const { useRegistroCosecha } = await server.ssrLoadModule('/src/composables/useRegistroCosecha.ts');
const { useFincaStore } = await server.ssrLoadModule('/src/stores/fincaStore.ts');
const { useCosechaStore } = await server.ssrLoadModule('/src/stores/cosecha/cosechaStore.ts');
const offline = await server.ssrLoadModule('/src/utils/cosechaOffline.ts');
const { useEmpresaStore } = await server.ssrLoadModule('/src/stores/empresaStore.ts');
const { cosechaService } = await server.ssrLoadModule('/src/services/cosecha/cosechaService.ts');
const { toLocalIsoDate, getCurrentIsoWeekInfo } = await server.ssrLoadModule('/src/utils/dateIso.ts');
const renderer = createRenderer({
  createComment: () => ({}), createText: () => ({}), createElement: () => ({}),
  insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
  parentNode: () => null, nextSibling: () => null,
});
const key = () => `borrador_cosecha_conteo:v2:2:1:4:${toLocalIsoDate()}`;

beforeEach(() => {
  storage.clear();
  storage.set('token', 'test');
  storage.set('user', JSON.stringify({ id: 1, empresa_id: 2 }));
  setActivePinia(createPinia());
});

async function montar(t, options = {}) {
  const finca = useFincaStore();
  finca.fincas = options.fincas || [{ id: 4, nombre: 'Prueba', empresa_id: 2 }];
  finca.fincaSeleccionadaId = 4;
  useEmpresaStore().empresas = [{ id: 2, nombre: 'Empresa' }];
  t.mock.method(finca, 'obtenerFincas', async () => { if (options.errorFincas) throw options.errorFincas; return finca.fincas; });
  const semana = getCurrentIsoWeekInfo();
  t.mock.method(cosechaService, 'getBalance', async () => {
    if (options.errorBalance) throw options.errorBalance;
    return [{ calendario_id: 10, semana_enfunde: semana.semana, anio: semana.anio, saldo_en_campo: options.saldo ?? 20, color_cinta: 'Verde', color_hex: '#009966' }];
  });
  t.mock.method(cosechaService, 'getFechasOcupadas', async () => ({ fechas: [] }));
  let state;
  const app = renderer.createApp({ setup() { state = useRegistroCosecha(options.fincaEnlace); return () => null; } });
  app.mount({});
  t.after(() => app.unmount());
  await new Promise(resolve => setImmediate(resolve));
  return state;
}

test('abrir cosecha desde un pendiente respeta la finca del enlace', async t => {
  const state = await montar(t, { fincaEnlace: '7', fincas: [{ id: 4 }, { id: 7 }] });
  assert.equal(state.fincaSeleccionada.value, 7);
  assert.equal(useFincaStore().fincaSeleccionadaId, 7);
  assert.equal(state.cosechaStore.fincaActivaId, 7);
});

test('una finca no autorizada del enlace no carga saldos ni reasigna el borrador', async t => {
  const state = await montar(t, { fincaEnlace: '99' });
  assert.equal(state.fincaSeleccionada.value, null);
  assert.equal(cosechaService.getBalance.mock.callCount(), 0);
});

test('el borrador se guarda bajo su propietario y no escribe con otra sesion', async t => {
  const state = await montar(t);
  state.cosechaStore.saldosPendientes[0].cantidad_a_cosechar = 5;
  await nextTick();
  assert.equal(JSON.parse(storage.get(key())).items[0].cantidad_a_cosechar, 5);
  storage.set('user', JSON.stringify({ id: 2, empresa_id: 2 }));
  state.cosechaStore.saldosPendientes[0].cantidad_a_cosechar = 6;
  await nextTick();
  assert.equal(JSON.parse(storage.get(key())).items[0].cantidad_a_cosechar, 5);
  assert.equal(storage.has(key().replace(':2:1:4:', ':2:2:4:')), false);
});

test('un fallo de almacenamiento muestra advertencia y mantiene los numeros en pantalla', async t => {
  const state = await montar(t);
  t.mock.method(localStorage, 'setItem', () => { throw new Error('quota'); });
  state.cosechaStore.saldosPendientes[0].rechazo = 2;
  await nextTick();
  assert.match(state.errorBorrador.value, /No se pudo guardar/);
  assert.equal(state.cosechaStore.totalDigitado, 2);
});

test('el borrador antiguo permanece intacto y no se atribuye al usuario conectado', async t => {
  const antigua = `borrador_cosecha_conteo:4:${toLocalIsoDate()}`;
  const raw = JSON.stringify({ items: [{ calendario_id: 10, cantidad_a_cosechar: 7, rechazo: 0 }] });
  storage.set(antigua, raw);
  const state = await montar(t);
  assert.equal(state.hayBorradorAntiguo.value, true);
  assert.equal(state.cosechaStore.totalDigitado, 0);
  assert.equal(storage.get(antigua), raw);
});

test('el borrador ilegible no se sobreescribe al editar nuevos numeros', async t => {
  storage.set(key(), '{roto');
  const state = await montar(t);
  state.cosechaStore.saldosPendientes[0].cantidad_a_cosechar = 3;
  await nextTick();
  assert.match(state.errorBorrador.value, /No se pudo recuperar/);
  assert.equal(storage.get(key()), '{roto');
});

test('restaura 12 con saldo 5 sin recortarlo y bloquea el envio', async t => {
  const raw = JSON.stringify({ items: [{ calendario_id: 10, cantidad_a_cosechar: 12, rechazo: 0 }] });
  storage.set(key(), raw);
  const state = await montar(t, { saldo: 5 });
  const enviar = t.mock.method(cosechaService, 'registrarLiquidacion', async () => {});
  assert.equal(state.cosechaStore.totalDigitado, 12);
  assert.equal(storage.get(key()), raw);
  assert.equal(state.conflictosConteo.value[0].saldo, 5);
  await state.guardarCosecha();
  assert.equal(enviar.mock.callCount(), 0);
  assert.equal(state.corregirConflicto(10, 4, 1), true);
  assert.equal(storage.get(key() + ':respaldo'), raw);
  assert.equal(state.cosechaStore.totalDigitado, 5);
  assert.equal(state.conflictosConteo.value.length, 0);
});

test('una cinta ausente se conserva al editar otras y requiere retiro explicito con respaldo', async t => {
  storage.set(key(), JSON.stringify({ items: [{ calendario_id: 99, cantidad_a_cosechar: 8, rechazo: 2 }] }));
  const state = await montar(t);
  state.cosechaStore.saldosPendientes[0].cantidad_a_cosechar = 3;
  assert.equal(JSON.parse(storage.get(key())).items.find(c => c.calendario_id === 99).cantidad_a_cosechar, 8);
  assert.equal(state.conflictosConteo.value[0].saldo, null);
  assert.equal(state.corregirConflicto(99, 1, 0), false);
  assert.equal(state.corregirConflicto(99, 0, 0), true);
  assert.equal(JSON.parse(storage.get(key() + ':respaldo')).items.find(c => c.calendario_id === 99).rechazo, 2);
});

test('si falla el respaldo no cambia las cantidades originales', async t => {
  storage.set(key(), JSON.stringify({ items: [{ calendario_id: 10, cantidad_a_cosechar: 12, rechazo: 0 }] }));
  const state = await montar(t, { saldo: 5 });
  t.mock.method(localStorage, 'setItem', () => { throw new Error('quota'); });
  assert.equal(state.corregirConflicto(10, 5, 0), false);
  assert.equal(state.cosechaStore.totalDigitado, 12);
});

test('reabrir offline restaura finca, inventario y borrador y permite dejar un envio pendiente', async t => {
  const semana = getCurrentIsoWeekInfo();
  offline.guardarFincasLocales('2:1', [{ id: 4, nombre: 'Prueba', empresa_id: 2 }]);
  offline.guardarInventarioLocal('2:1', 4, [{ calendario_id: 10, semana_enfunde: semana.semana, anio: semana.anio, saldo_en_campo: 20, color_cinta: 'Verde', color_hex: '#009966' }], 123456);
  storage.set(key(), JSON.stringify({ items: [{ calendario_id: 10, cantidad_a_cosechar: 12, rechazo: 0 }] }));
  useCosechaStore().isOnline = false;
  const state = await montar(t);
  assert.equal(state.cosechaStore.totalDigitado, 12);
  assert.equal(state.cosechaStore.inventarioLocal, true);
  assert.equal(state.cosechaStore.inventarioConsultadoEn, 123456);
  const enviar = t.mock.method(cosechaService, 'registrarLiquidacion', async () => {});
  await state.guardarCosecha();
  assert.equal(enviar.mock.callCount(), 0);
  assert.equal(state.cosechaStore.colaSincronizacion[0].detalles[0].cantidad_racimos, 12);
  assert.equal(storage.has(key()), false);
  await state.cargarSaldos(4);
  assert.equal(state.cosechaStore.saldosPendientes[0].saldo_en_campo, 8);
});

test('un 403 no recupera el inventario descargado como si hubiera autorizacion', async t => {
  const semana = getCurrentIsoWeekInfo();
  offline.guardarInventarioLocal('2:1', 4, [{ calendario_id: 10, semana_enfunde: semana.semana, anio: semana.anio, saldo_en_campo: 20, color_cinta: 'Verde', color_hex: '#009966' }], Date.now());
  const state = await montar(t, { errorBalance: { response: { status: 403 } } });
  assert.equal(state.cosechaStore.saldosPendientes.length, 0);
  assert.equal(state.cosechaStore.inventarioLocal, false);
});

test('otra cuenta no puede leer los inventarios ni fincas descargados', () => {
  offline.guardarFincasLocales('2:1', [{ id: 4, nombre: 'Prueba', empresa_id: 2 }]);
  storage.set('user', JSON.stringify({ id: 2, empresa_id: 2 }));
  assert.deepEqual(offline.leerFincasLocales('2:1'), []);
  assert.equal(offline.leerInventarioLocal('2:1', 4), null);
});

test('una recarga automatica conserva la cinta que desaparece del inventario', async t => {
  const state = await montar(t);
  state.cosechaStore.saldosPendientes[0].cantidad_a_cosechar = 12;
  const raw = storage.get(key());
  t.mock.method(cosechaService, 'getBalance', async () => []);
  await state.cosechaStore.cargarSaldos(4);
  assert.equal(storage.get(key()), raw);
  assert.equal(state.conflictosConteo.value[0].buenos, 12);
});

test('restar sobre un exceso cambia solo una unidad y no recorta al saldo', async t => {
  storage.set(key(), JSON.stringify({ items: [{ calendario_id: 10, cantidad_a_cosechar: 12, rechazo: 0 }] }));
  const state = await montar(t, { saldo: 5 });
  state.cosechaStore.ajustarDigitacion(state.cosechaStore.saldosPendientes[0], 'cantidad_a_cosechar', -1);
  assert.equal(state.cosechaStore.totalDigitado, 11);
});

test('los confirmados descuentan la copia local una sola vez', () => {
  const semana = getCurrentIsoWeekInfo();
  offline.guardarInventarioLocal('2:1', 4, [{ calendario_id: 10, semana_enfunde: semana.semana, anio: semana.anio, saldo_en_campo: 20, color_cinta: 'Verde', color_hex: '#009966' }], 123456);
  const reporte = { id_local: 'uno', finca_id: 4, fecha: toLocalIsoDate(), detalles: [{ calendario_id: 10, cantidad_racimos: 3, cantidad_rechazo: 1 }] };
  offline.descontarConfirmadoLocal('2:1', reporte);
  offline.descontarConfirmadoLocal('2:1', reporte);
  assert.equal(offline.leerInventarioLocal('2:1', 4).cintas[0].saldo_en_campo, 16);
  assert.equal(offline.leerInventarioLocal('2:1', 4).consultadoEn, 123456);
});
