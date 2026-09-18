import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createRenderer, shallowRef, ssrContextKey } from 'vue';
import { matchedRouteKey } from 'vue-router';

const server = await createServer({
  configFile: false, plugins: [vue()],
  resolve: { alias: { '@': path.resolve('src') } },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom',
});
after(() => server.close());
const { default: Panel } = await server.ssrLoadModule('/src/components/cosecha/ConteoFotoPanel.vue');
const { deteccionRacimosService } = await server.ssrLoadModule('/src/services/cosecha/deteccionRacimosService.ts');
const renderer = createRenderer({
  createComment: () => ({}), createText: () => ({}), createElement: () => ({}),
  insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
  parentNode: () => null, nextSibling: () => null,
});

function sustituir(t, target, key, value) {
  const previo = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { value, configurable: true });
  t.after(() => previo ? Object.defineProperty(target, key, previo) : Reflect.deleteProperty(target, key));
}

function montar(t, online) {
  let app;
  t.after(() => app?.unmount());
  sustituir(t, globalThis, 'Image', class {
    naturalWidth = 800;
    naturalHeight = 600;
    set src(value) { queueMicrotask(() => this.onload()); }
  });
  sustituir(t, globalThis, 'window', { innerHeight: 800, addEventListener() {}, removeEventListener() {}, confirm: () => true });
  sustituir(t, globalThis, 'document', { createElement: () => ({
    getContext: () => ({ fillRect() {}, drawImage() {} }),
    toDataURL: () => 'data:image/jpeg;base64,/9j/4AAA/9k=',
  }) });
  sustituir(t, navigator, 'onLine', online);
  app = renderer.createApp({ ...Panel, render: () => null }, {
    fincaId: 4, bloqueado: false, errorAplicacion: '',
    cintas: [{ calendario_id: 1, disponible: 10 }],
  });
  app.provide(matchedRouteKey, shallowRef({ leaveGuards: new Set() }));
  app.provide(ssrContextKey, {});
  const vm = app.mount({});
  return vm.$.setupState;
}

async function elegirFoto(panel) {
  await panel.cargarFoto({ target: { files: [new Blob(['test'], { type: 'image/jpeg' })], value: 'photo.jpg' } });
}

test('elegir foto online no envia nada; IA solo al pedirla expresamente', async (t) => {
  const api = t.mock.method(deteccionRacimosService, 'detectar', async () => [{ id: 1, x: 0.5, y: 0.5 }]);
  const panel = montar(t, true);
  await elegirFoto(panel);
  assert.ok(panel.foto.startsWith('blob:'));
  assert.equal(panel.ocupado, false);
  assert.equal(panel.propuestas, null);
  assert.equal(api.mock.callCount(), 0);
  await panel.generarBorrador();
  assert.equal(api.mock.callCount(), 1);
  assert.equal(panel.marcas.length, 1);
  assert.equal(panel.revisado, false);
  await elegirFoto(panel);
  assert.equal(api.mock.callCount(), 1, 'reemplazar la foto tampoco activa la IA');
  assert.equal(panel.propuestas, null);
});

test('marcado y reparto funcionan offline sin llamar a la IA', async (t) => {
  const api = t.mock.method(deteccionRacimosService, 'detectar', async () => { throw new Error('No debe llamar'); });
  const panel = montar(t, false);
  await elegirFoto(panel);
  assert.equal(panel.ocupado, false);
  panel.marcas = [{ id: 1, x: 0.5, y: 0.5 }];
  panel.cantidades[1] = 1;
  assert.equal(panel.valido, true);
  await panel.generarBorrador();
  assert.equal(api.mock.callCount(), 0);
  assert.equal(panel.marcas.length, 1);
  assert.equal(panel.cantidades[1], 1);
  assert.match(panel.aviso, /Sin conexión/);
});
