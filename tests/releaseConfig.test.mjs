import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('cabeceras de despliegue protegen contenido y mantienen camara propia disponible', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const headers = Object.fromEntries(config.headers.find(rule => rule.source === '/(.*)').headers.map(h => [h.key, h.value]));
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.match(headers['Permissions-Policy'], /camera=\(self\)/);
  assert.match(config.headers.find(rule => rule.source === '/conteo-sw.js').headers[0].value, /no-store/);
});

test('CI ejecuta pruebas y compilacion con Node compatible con strip types', () => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.match(ci, /npm run verify:release/);
  assert.match(ci, /node-version: '22\.18\.0'/);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(pkg.scripts['verify:release'], /npm test/);
  assert.match(pkg.scripts['verify:release'], /npm run build/);
});
