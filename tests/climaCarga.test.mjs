import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createPinia, setActivePinia } from 'pinia';
import { createRenderer, nextTick, ref, ssrContextKey } from 'vue';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ configFile: false, plugins: [vue()], resolve: { alias: { '@': path.resolve('src') } },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
after(() => server.close());
const { useClimaFinca } = await server.ssrLoadModule('/src/composables/useClimaFinca.ts');
const { useFincaStore } = await server.ssrLoadModule('/src/stores/fincaStore.ts');
const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth/authStore.ts');
const { climaService } = await server.ssrLoadModule('/src/services/climaService.ts');
const { default: Grafico } = await server.ssrLoadModule('/src/components/reportes/SimpleSvgChart.vue');
const { default: ClimaGraficos } = await server.ssrLoadModule('/src/components/clima/ClimaGraficos.vue');
const renderer = createRenderer({ createComment: () => ({}), createText: () => ({}), createElement: () => ({}), insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {}, parentNode: () => null, nextSibling: () => null });
beforeEach(() => { setActivePinia(createPinia()); });

test('el enlace de clima selecciona la finca autorizada antes de consultar', async t => {
  const fincas = useFincaStore(); fincas.fincaSeleccionadaId = 1;
  fincas.fincas = [{ id: 1 }, { id: 2 }];
  t.mock.method(fincas, 'obtenerFincas', async () => fincas.fincas);
  const consulta = t.mock.method(climaService, 'historial', async id => ({ finca: { id }, registros: [] }));
  let state;
  const app = renderer.createApp({ setup() { state = useClimaFinca('2'); return () => null; } });
  app.mount({}); t.after(() => app.unmount());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(consulta.mock.calls[0].arguments[0], 2);
  assert.equal(state.data.value.finca.id, 2);
});

test('el enlace de clima no consulta una finca ajena ni otra por defecto', async t => {
  const fincas = useFincaStore(); fincas.fincaSeleccionadaId = 1;
  fincas.fincas = [{ id: 1 }];
  t.mock.method(fincas, 'obtenerFincas', async () => fincas.fincas);
  const consulta = t.mock.method(climaService, 'historial', async () => ({}));
  let state;
  const app = renderer.createApp({ setup() { state = useClimaFinca('99'); return () => null; } });
  app.mount({}); t.after(() => app.unmount());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(consulta.mock.callCount(), 0);
  assert.match(state.errorFincas.value, /no está disponible/);
});

test('la respuesta atrasada de una finca no reemplaza la nueva seleccion', async t => {
  const fincas = useFincaStore(); fincas.fincaSeleccionadaId = 1;
  fincas.fincas = [{ id: 1 }, { id: 2 }];
  t.mock.method(fincas, 'obtenerFincas', async () => fincas.fincas);
  const consultas = [];
  t.mock.method(climaService, 'historial', (id, desde, hasta) => new Promise(resolve => consultas.push({ id, desde, hasta, resolve })));
  let state;
  const app = renderer.createApp({ setup() { state = useClimaFinca(); return () => null; } });
  app.mount({}); t.after(() => app.unmount());
  await new Promise(resolve => setImmediate(resolve));
  fincas.fincaSeleccionadaId = 2; await nextTick();
  const response = req => ({ finca: { id: req.id }, periodo: { desde: req.desde, hasta: req.hasta, dias: 30 }, registros: [] });
  consultas[1].resolve(response(consultas[1])); await nextTick();
  consultas[0].resolve(response(consultas[0])); await nextTick();
  assert.equal(state.data.value.finca.id, 2);
  assert.equal(state.loading.value, false);
  useAuthStore().token = 'otra-sesion'; await nextTick();
  assert.equal(state.data.value, null);
});

function chart(t, type, data) {
  const app = renderer.createApp({ ...Grafico, render: () => null }, { type, series: [{ name: 'Prueba', data }], categories: ['A', 'B', 'C'], fractionDigits: 2 });
  app.provide(ssrContextKey, {});
  app.provide(Symbol.for('vuetify:theme'), { global: { current: ref({ dark: false }) } });
  const vm = app.mount({}).$.setupState;
  t.after(() => app.unmount()); return vm;
}

test('grafico conserva cero real y omite barras de dias sin registro', t => {
  const vm = chart(t, 'bar', [0, null, 2.35]);
  assert.equal(vm.bars.length, 2);
  assert.equal(vm.bars[0].value, 0);
  assert.equal(vm.bars[1].value, 2.35);
});

test('grafico de lineas no conecta a traves de dias ausentes', t => {
  const vm = chart(t, 'line', [10, null, 12]);
  assert.equal(vm.lines[0].path.match(/M/g).length, 2);
  assert.equal(vm.linePoints.length, 2);
});

test('graficos de clima conservan escala y altura con 7, 30, 273 y 366 dias', t => {
  for (const total of [7, 30, 273, 366]) {
    const wrapper = renderer.createApp({ ...ClimaGraficos, render: () => null }, { dias: Array.from({ length: total }, () => ({})) });
    wrapper.provide(ssrContextKey, {});
    const width = wrapper.mount({}).$.setupState.anchoGrafico;
    t.after(() => wrapper.unmount());
    const app = renderer.createApp({ ...Grafico, render: () => null }, {
      width, height: 300, type: 'bar', categories: Array.from({ length: total }, (_, i) => String(i)),
      series: [{ name: 'UC', data: Array(total).fill(14) }],
    });
    app.provide(ssrContextKey, {});
    app.provide(Symbol.for('vuetify:theme'), { global: { current: ref({ dark: false }) } });
    const vm = app.mount({}).$.setupState;
    t.after(() => app.unmount());
    assert.equal(width / vm.svgWidth, 1, 'unidades SVG equivalen a pixeles sin zoom');
    assert.equal(vm.svgHeight * width / vm.svgWidth, 300);
    assert.equal(vm.bars.length, total);
    assert.ok(vm.bars.at(-1).x + vm.bars.at(-1).width <= width);
  }
});
