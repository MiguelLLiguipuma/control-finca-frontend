import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createRenderer, h, nextTick, shallowRef, ssrContextKey } from 'vue';

const server = await createServer({ configFile: false, plugins: [vue()], resolve: { alias: { '@': path.resolve('src') } },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
after(() => server.close());
const { default: Planta } = await server.ssrLoadModule('/src/components/reportes/EstadoBotanicoFinca.vue');
const renderer = createRenderer({ createComment: () => ({}), createText: () => ({}), createElement: () => ({}), insert() {},
  remove() {}, setText() {}, setElementText() {}, patchProp() {}, parentNode: () => null, nextSibling: () => null });

test('la planta evalua datos recien recibidos sin esperar el siguiente minuto del reloj', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-27T12:00:00-05:00').getTime() });
  globalThis.window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  t.after(() => { delete globalThis.window; });
  const senales = shallowRef({ produccion: null, sanidad: null, consultadoEn: null });
  const componente = { ...Planta, render: () => null };
  let instancia;
  const app = renderer.createApp({ setup: () => () => h(componente, {
    ref: value => { instancia = value; }, senales: senales.value, anio: 2026,
  }) });
  app.provide(ssrContextKey, {}); app.mount({});
  t.after(() => app.unmount());
  assert.equal(instancia.$.setupState.lectura.estado, 'sin-datos');
  t.mock.timers.tick(2000);
  senales.value = {
    produccion: { score_total: 90, total_racimos: 150, semana: 44, anio: 2026 },
    sanidad: { tipo: 'SANIDAD_VERDE', fecha_evento: '2026-10-20', mensaje: 'En plazo' },
    consultadoEn: Date.now(),
  };
  await nextTick();
  assert.equal(instancia.$.setupState.lectura.estado, 'favorable');
});
