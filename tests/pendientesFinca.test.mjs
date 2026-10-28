import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import { effectScope, shallowRef } from 'vue';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ configFile: false, resolve: { alias: { '@': path.resolve('src') } },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
after(() => server.close());
const { priorizarPendientes, accionParaAlerta, fincaDesdeEnlace, pestanaDesdeEnlace, conservaBorradorEnfunde } = await server.ssrLoadModule('/src/domain/pendientesFinca.ts');
const { usePendientesFinca } = await server.ssrLoadModule('/src/composables/usePendientesFinca.ts');
const { alertaService } = await server.ssrLoadModule('/src/services/alertaService.ts');
const can = () => true;
const alerta = (id = 1, cambios = {}) => ({ id, finca_id: 1, tipo: 'enfunde_faltante', severidad: 'media',
  estado: 'pendiente', titulo: 'Falta registro', mensaje: 'Revisar semana', detectada_en: '2026-10-27T12:00:00Z', ...cambios });
const tick = () => new Promise(resolve => setImmediate(resolve));

test('ordena por gravedad y fecha, excluye otras fincas, resueltas, silenciadas y duplicados', () => {
  const items = [alerta(1), alerta(2, { severidad: 'critica' }), alerta(3, { severidad: 'alta' }),
    alerta(4, { finca_id: 2 }), alerta(5, { estado: 'resuelta' }), alerta(6, { estado: 'silenciada' }),
    alerta(7, { estado: 'leida', detectada_en: '2026-10-28T12:00:00Z' }), alerta(2, { severidad: 'critica' })];
  assert.deepEqual(priorizarPendientes(items, 1, can, true).map(x => x.alerta.id), [2, 3, 7, 1]);
  assert.equal(items[0].id, 1, 'no muta la respuesta');
});
test('los destinos corresponden a las funciones y respetan permisos', () => {
  assert.equal(accionParaAlerta(alerta(), can, true).to.query.finca_id, '1');
  assert.equal(accionParaAlerta(alerta(1, { tipo: 'cinta_critica' }), can, true).to.path, '/registro-cosecha');
  assert.equal(accionParaAlerta(alerta(1, { tipo: 'clima_desactualizado' }), can, true).to.path, '/clima');
  assert.equal(accionParaAlerta(alerta(1, { tipo: 'inventario_historico_cintas' }), can, true).to.query.tab, 'historico');
  assert.equal(accionParaAlerta(alerta(1, { tipo: 'fumigacion_vencida' }), can, true).to.query.seccion, 'fumigacion');
  assert.equal(accionParaAlerta(alerta(1, { tipo: 'fumigacion_vencida' }), can, false).to.query.tab, 'alertas');
  assert.equal(accionParaAlerta(alerta(), p => p === 'view.alertas', false).to.path, '/alertas');
  assert.equal(accionParaAlerta(alerta(), () => false, false), null);
  assert.deepEqual(priorizarPendientes([alerta()], 1, () => false, false), []);
});
test('enlaces solo admiten fincas autorizadas y pestañas permitidas', () => {
  assert.equal(fincaDesdeEnlace('2', [{ id: 1 }, { id: 2 }]), 2);
  for (const input of ['3', '2x', ['2'], '', '-2', '2.5', undefined]) {
    assert.equal(fincaDesdeEnlace(input, [{ id: 2 }]), null);
  }
  assert.equal(pestanaDesdeEnlace('configuracion', false), 'alertas');
  assert.equal(pestanaDesdeEnlace('configuracion', true), 'configuracion');
  assert.equal(pestanaDesdeEnlace('whatsapp', true), 'alertas');
});
test('un enlace no reasigna el contenido de un borrador de otra finca', () => {
  const form = { finca_id: 2, cantidad_fundas: 123, calidad: null, observaciones: '' };
  assert.equal(conservaBorradorEnfunde(form, 1), true);
  assert.equal(conservaBorradorEnfunde(form, 2), false);
  assert.equal(conservaBorradorEnfunde({ ...form, cantidad_fundas: null }, 1), false);
  assert.equal(conservaBorradorEnfunde({ ...form, cantidad_fundas: null, observaciones: 'Nota sin guardar' }, 1), true);
});

function montar(t, contexto = { fincaId: 1, habilitado: true, sesion: 'usuario-1', revision: 0 }) {
  const ctx = shallowRef(contexto);
  const scope = effectScope();
  const state = scope.run(() => usePendientesFinca(() => ctx.value));
  t.after(() => scope.stop());
  return { ctx, state, scope };
}
test('no consulta sin permiso ni finca, y no genera ni resuelve alertas', async t => {
  const listar = t.mock.method(alertaService, 'listar', async () => []);
  const generar = t.mock.method(alertaService, 'generar', () => { throw Error('No autorizado'); });
  const resolver = t.mock.method(alertaService, 'resolver', () => { throw Error('No autorizado'); });
  const { ctx, state } = montar(t, { fincaId: 1, habilitado: false, sesion: 'usuario-1', revision: 0 });
  assert.equal(listar.mock.callCount(), 0);
  ctx.value = { ...ctx.value, habilitado: true, fincaId: null };
  assert.equal(listar.mock.callCount(), 0);
  ctx.value = { ...ctx.value, fincaId: 1 }; await tick();
  assert.equal(listar.mock.callCount(), 1);
  assert.equal(listar.mock.calls[0].arguments[0].estado, 'pendiente,enviada,leida');
  assert.equal(state.error.value, '');
  assert.ok(state.consultadoEn.value);
  assert.equal(generar.mock.callCount(), 0);
  assert.equal(resolver.mock.callCount(), 0);
});
test('cambio rapido de finca cancela consulta y descarta respuestas tardias', async t => {
  const calls = [];
  t.mock.method(alertaService, 'listar', (query, signal) => new Promise(resolve => calls.push({ query, signal, resolve })));
  const { ctx, state } = montar(t);
  ctx.value = { ...ctx.value, fincaId: 2 };
  assert.equal(calls[0].signal.aborted, true);
  calls[1].resolve([alerta(2, { finca_id: 2 })]); await tick();
  calls[0].resolve([alerta(1)]); await tick();
  assert.equal(state.items.value[0].id, 2);
  assert.equal(state.loading.value, false);
});
test('cambio de sesion limpia datos y un fallo anterior no sustituye una respuesta nueva', async t => {
  const calls = [];
  t.mock.method(alertaService, 'listar', () => new Promise((resolve, reject) => calls.push({ resolve, reject })));
  const { ctx, state } = montar(t);
  ctx.value = { ...ctx.value, sesion: 'usuario-2' };
  calls[1].resolve([alerta(2)]); await tick();
  calls[0].reject(Error('viejo')); await tick();
  assert.equal(state.items.value[0].id, 2);
  ctx.value = { ...ctx.value, habilitado: false };
  assert.deepEqual(state.items.value, []);
  assert.equal(state.consultadoEn.value, null);
});
test('un fallo no parece lista vacia y el reintento recupera datos', async t => {
  const mock = t.mock.method(alertaService, 'listar', async () => { throw Error('offline'); });
  const { state } = montar(t); await tick();
  assert.ok(state.error.value);
  assert.equal(state.consultadoEn.value, null);
  mock.mock.mockImplementation(async () => [alerta()]);
  await state.cargar();
  assert.equal(state.error.value, '');
  assert.equal(state.items.value.length, 1);
});
test('respuesta malformada y permiso denegado no se presentan como ausencia de pendientes', async t => {
  const mock = t.mock.method(alertaService, 'listar', async () => ({ data: [] }));
  const { state } = montar(t); await tick();
  assert.ok(state.error.value);
  mock.mock.mockImplementation(async () => { throw { response: { status: 403 } }; });
  await state.cargar();
  assert.match(state.error.value, /permiso/);
  assert.equal(state.consultadoEn.value, null);
});
test('desmontar cancela consultas pendientes', async t => {
  let signal, resolve;
  t.mock.method(alertaService, 'listar', (_query, s) => { signal = s; return new Promise(ok => { resolve = ok; }); });
  const { state, scope } = montar(t);
  scope.stop();
  assert.equal(signal.aborted, true);
  resolve([alerta()]); await tick();
  assert.deepEqual(state.items.value, []);
});
