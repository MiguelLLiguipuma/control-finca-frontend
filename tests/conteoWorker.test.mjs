import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker() {
  const handlers = {};
  const entries = new Map([['/index.html', 'APP'], ['/assets/app.js', 'SCRIPT']]);
  const cache = { match: async key => entries.get(key), addAll: async urls => { cache.urls = urls; } };
  let online = true;
  const context = { URL, Response, Set, Promise,
    self: { location: { origin: 'https://campo.test' }, addEventListener: (name, fn) => { handlers[name] = fn; }, clients: { claim: async () => {} } },
    caches: { open: async () => cache, keys: async () => ['otro-cache', 'conteo-app-v1', 'conteo-app-v2'], delete: async () => {} },
    fetch: async () => { if (!online) throw new Error('offline'); return 'NETWORK'; },
  };
  vm.runInNewContext(readFileSync('scripts/conteo-worker.js', 'utf8')
    .replace('__CACHE_NAME__', '"conteo-app-v2"').replace('__PRECACHE_URLS__', '["/index.html","/assets/app.js"]').replace('__BASE_PATH__', '"/"'), context);
  return { handlers, cache, offline: () => { online = false; }, request(path, method = 'GET', mode = 'navigate') {
    let result;
    handlers.fetch({ request: { url: new URL(path, 'https://campo.test').href, method, mode }, respondWith(value) { result = value; } });
    return result;
  } };
}

test('descarga solo el manifiesto estatico al instalar', async () => {
  const w = worker();
  let installation;
  w.handlers.install({ waitUntil: task => { installation = task; } });
  await installation;
  assert.deepEqual(Array.from(w.cache.urls), ['/index.html', '/assets/app.js']);
});

test('sin red reabre conteo y sirve el codigo descargado', async () => {
  const w = worker();
  w.offline();
  assert.equal(await w.request('/conteo-cosecha-movil'), 'APP');
  assert.equal(await w.request('/registro-cosecha'), 'APP');
  assert.equal(await w.request('/assets/app.js', 'GET', 'cors'), 'SCRIPT');
});

test('no intercepta API, credenciales, destinos externos ni escrituras', () => {
  const w = worker();
  for (const path of ['/api/cosecha', '/auth/me', 'https://backend.test/cosecha']) assert.equal(w.request(path), undefined);
  assert.equal(w.request('/registro-cosecha', 'POST'), undefined);
});

test('con red consulta la pagina actual en lugar de ocultar nuevas versiones', async () => {
  assert.equal(await worker().request('/conteo-cosecha-movil'), 'NETWORK');
});
