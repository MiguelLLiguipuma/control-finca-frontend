import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createRenderer, ssrContextKey } from 'vue';

const server = await createServer({
  configFile: false, plugins: [vue()],
  resolve: { alias: { '@': path.resolve('src') } },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom',
});
after(() => server.close());
const { default: Panel } = await server.ssrLoadModule('/src/components/cosecha/ConteoManualPanel.vue');
const renderer = createRenderer({
  createComment: () => ({}), createText: () => ({}), createElement: () => ({}),
  insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
  parentNode: () => null, nextSibling: () => null,
});

function montar(t, overrides = {}, bloqueado = false) {
  const cinta = { calendario_id: 10, semana_enfunde: 26, anio: 2026, saldo_en_campo: 20, cantidad_a_cosechar: 3, rechazo: 2, color_cinta: 'Blanca', color_hex: '#ffffff', edad: 12, ...overrides };
  const eventos = [];
  const app = renderer.createApp({ ...Panel, render: () => null }, {
    cintas: [cinta], calendarioId: 10, bloqueado, loading: false,
    onAjustar: (...args) => eventos.push(args),
  });
  app.provide(ssrContextKey, {});
  const state = app.mount({}).$.setupState;
  t.after(() => app.unmount());
  return { state, cinta, eventos };
}

test('controles separados emiten el campo correcto sin mutar la cinta recibida', t => {
  const { state, cinta, eventos } = montar(t);
  state.ajustar('cantidad_a_cosechar', 1);
  state.ajustar('rechazo', -1);
  assert.equal(eventos[0][1], 'cantidad_a_cosechar');
  assert.equal(eventos[0][2], 1);
  assert.equal(eventos[1][1], 'rechazo');
  assert.equal(eventos[1][2], -1);
  assert.equal(cinta.cantidad_a_cosechar, 3);
  assert.equal(cinta.rechazo, 2);
  assert.equal(state.disponible, 15);
  assert.match(state.opciones[0].titulo, /Blanca.*26\/2026/);
});

test('el contador bloqueado no emite cambios durante el envio', t => {
  const { state, eventos } = montar(t, {}, true);
  state.ajustar('cantidad_a_cosechar', 10);
  state.ajustar('rechazo', -1);
  assert.equal(eventos.length, 0);
});

test('saldo agotado impide sumar pero permite corregir; cero impide restar', t => {
  const { state, eventos } = montar(t, { saldo_en_campo: 3, cantidad_a_cosechar: 3, rechazo: 0 });
  state.ajustar('cantidad_a_cosechar', 1);
  state.ajustar('rechazo', 1);
  state.ajustar('rechazo', -1);
  state.ajustar('cantidad_a_cosechar', -1);
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0][1], 'cantidad_a_cosechar');
  assert.equal(eventos[0][2], -1);
});
