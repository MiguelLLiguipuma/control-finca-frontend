import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createPinia, setActivePinia } from 'pinia';
import { AxiosError, isCancel } from 'axios';
import path from 'node:path';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
  key: index => [...storage.keys()][index] ?? null,
  get length() { return storage.size; },
};
globalThis.window = { location: { replace() {} } };
const server = await createServer({
  configFile: false, resolve: { alias: { '@': path.resolve('src') } },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom',
});
after(() => server.close());
const { default: api } = await server.ssrLoadModule('/src/services/api.ts');
const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth/authStore.ts');
const { useUIStore } = await server.ssrLoadModule('/src/stores/uiStore.ts');
const { useAlertaStore } = await server.ssrLoadModule('/src/stores/alertaStore.ts');
const { alertaService } = await server.ssrLoadModule('/src/services/alertaService.ts');
const { readLocalWork, exportLocalWork } = await server.ssrLoadModule('/src/utils/localWork.ts');
const { shouldExpireSession } = await server.ssrLoadModule('/src/utils/sessionPolicy.ts');
const originalAdapter = api.defaults.adapter;
function account(id = 1) {
  storage.set('token', `token-${id}`);
  storage.set('user', JSON.stringify({ id, empresa_id: 2, nombre: `Usuario ${id}` }));
}
beforeEach(() => { storage.clear(); account(); setActivePinia(createPinia()); api.defaults.adapter = originalAdapter; });
const response = (config, data = {}) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
const unauthorized = config => new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, {
  ...response(config, { message: 'Credenciales incorrectas' }), status: 401,
});

test('401 del login se muestra sin recargar la pagina ni cerrar otra sesion', async t => {
  const logout = t.mock.method(useAuthStore(), 'logout', () => {});
  api.defaults.adapter = async config => { assert.equal(config.headers.Authorization, undefined); throw unauthorized(config); };
  const result = await useAuthStore().login({ email: 'test@example.invalid', password: 'invalid' });
  assert.equal(result.success, false);
  assert.equal(result.message, 'Credenciales incorrectas');
  assert.equal(logout.mock.callCount(), 0);
  assert.equal(useUIStore().notifications.length, 0);
});

test('401 de un recurso autenticado vence la sesion actual', async t => {
  const logout = t.mock.method(useAuthStore(), 'logout', () => {});
  api.defaults.adapter = async config => { throw unauthorized(config); };
  await assert.rejects(api.get('/fincas'));
  assert.deepEqual(logout.mock.calls[0].arguments, ['expired']);
});

test('403 de permisos no cierra sesion y los mensajes con tildes si reconocen expiracion', () => {
  assert.equal(shouldExpireSession(403, 'Sin permisos', true), false);
  assert.equal(shouldExpireSession(403, 'Sesión expirada, ingrese nuevamente', true), true);
  assert.equal(shouldExpireSession(403, 'Token de seguridad no válido', true), true);
  assert.equal(shouldExpireSession(401, '', false), false);
});

for (const failed of [false, true]) {
  test(`descarta respuesta tardia ${failed ? 'fallida' : 'exitosa'} sin contaminar la cuenta nueva`, async t => {
    const logout = t.mock.method(useAuthStore(), 'logout', () => {});
    let finish;
    api.defaults.adapter = config => new Promise((resolve, reject) => {
      finish = () => failed ? reject(unauthorized(config)) : resolve(response(config, { private: 'previous' }));
    });
    const request = api.get('/fincas');
    const rejected = assert.rejects(request, error => isCancel(error));
    await new Promise(resolve => setImmediate(resolve));
    account(2);
    finish();
    await rejected;
    assert.equal(logout.mock.callCount(), 0);
    assert.equal(useUIStore().notifications.length, 0);
  });
}

test('no envia con el token de otra pestana mientras la vista tiene la cuenta antigua', async () => {
  useAuthStore();
  account(2);
  let calls = 0;
  api.defaults.adapter = async config => { calls++; return response(config); };
  await assert.rejects(api.post('/registros', {}), error => isCancel(error));
  assert.equal(calls, 0);
});

test('las notificaciones locales se separan por propietario y las antiguas no se atribuyen', () => {
  storage.set('control_finca_notifications', JSON.stringify([{ message: 'otro usuario' }]));
  const ui = useUIStore();
  assert.deepEqual(ui.notifications, []);
  ui.showInfo('solo uno');
  account(2);
  ui.activarSesion();
  assert.equal(ui.notifications.length, 0);
  assert.equal(ui.snackbar.show, false);
  ui.showInfo('solo dos');
  account(1);
  ui.activarSesion();
  assert.deepEqual(ui.notifications.map(n => n.message), ['solo uno']);
  storage.delete('token');
  ui.activarSesion();
  assert.equal(ui.notifications.length, 0);
});

test('notificaciones corruptas no rompen la interfaz', () => {
  storage.set('control_finca_notifications_v2:2:1', JSON.stringify([null, {}, { id: 'x' }]));
  assert.deepEqual(useUIStore().notifications, []);
});

test('un usuario local incompleto no se considera autenticado', () => {
  storage.set('user', JSON.stringify({ nombre: 'Sin id' }));
  assert.equal(useAuthStore().isAuthenticated, false);
});

test('respaldo contiene solo cola y borradores propios, nunca credenciales ni datos de otra cuenta', () => {
  storage.set('cosecha_colas_v2:2:1', JSON.stringify({ pendientes: [{}], fallidos: [{}] }));
  storage.set('borrador_cosecha_conteo:v2:2:1:4:2026-10-01', 'draft');
  storage.set('borrador_cosecha_conteo:v2:2:1:4:2026-10-01:respaldo', 'backup');
  storage.set('cosecha_colas_v2:2:10', 'foreign');
  storage.set('borrador_cosecha_conteo:v2:2:10:4:2026-10-01', 'foreign');
  storage.set('cosecha_offline_v1:2:1:inventario:4', 'inventory');
  assert.deepEqual(readLocalWork('2:1'), { pending: 1, failed: 1, drafts: 1, unreadable: false });
  const backup = exportLocalWork('2:1');
  assert.equal(Object.keys(backup.entries).length, 3);
  for (const excluded of ['token-1', 'Usuario 1', 'foreign', 'inventory']) assert.equal(JSON.stringify(backup).includes(excluded), false);
  assert.throws(() => exportLocalWork('2:10'));
});

test('cola ilegible se advierte y se exporta intacta para recuperar', () => {
  storage.set('cosecha_colas_v2:2:1', '{broken');
  assert.equal(readLocalWork('2:1').unreadable, true);
  assert.equal(exportLocalWork('2:1').entries['cosecha_colas_v2:2:1'], '{broken');
});

test('cerrar sesion no borra los reportes locales', () => {
  storage.set('cosecha_colas_v2:2:1', 'saved');
  useAuthStore().logout();
  assert.equal(storage.get('cosecha_colas_v2:2:1'), 'saved');
  assert.equal(storage.has('token'), false);
  assert.equal(storage.has('user'), false);
});

test('alertas operativas no reaparecen al cambiar de cuenta durante la consulta', async t => {
  let finish;
  t.mock.method(alertaService, 'listar', () => new Promise(resolve => { finish = resolve; }));
  t.mock.method(alertaService, 'resumen', async () => ({ abiertas: 1, pendientes: 1, criticas: 0, altas: 0 }));
  const alerts = useAlertaStore();
  const request = alerts.cargar();
  account(2);
  alerts.activarSesion();
  finish([{ id: 1, mensaje: 'Cuenta anterior' }]);
  await request;
  assert.deepEqual(alerts.items, []);
  assert.equal(alerts.loading, false);
  assert.equal(alerts.resumen.abiertas, 0);
});

test('la consulta mas reciente de alertas prevalece y un reintento limpia el error', async t => {
  let finish;
  let count = 0;
  t.mock.method(alertaService, 'listar', () => ++count === 1 ? new Promise(resolve => { finish = resolve; }) : Promise.resolve([{ id: 2 }]));
  t.mock.method(alertaService, 'resumen', async () => ({ abiertas: 0, pendientes: 0, criticas: 0, altas: 0 }));
  const alerts = useAlertaStore();
  alerts.error = 'Error anterior';
  const old = alerts.cargar({ silent: true });
  await alerts.cargar({ silent: true });
  finish([{ id: 1 }]);
  await old;
  assert.deepEqual(alerts.items.map(item => item.id), [2]);
  assert.equal(alerts.error, '');
});
