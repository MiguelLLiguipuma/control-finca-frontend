import assert from 'node:assert/strict';
import test from 'node:test';
import { validarRepartoFoto, leerMarcasDetectadas } from '../src/utils/conteoFoto.ts';
import { crearUuid } from '../src/utils/uuid.ts';

const cintas = [{ calendario_id: 1, disponible: 8 }, { calendario_id: 2, disponible: 7 }];
test('normaliza las marcas del borrador con ids unicos', () => {
  assert.deepEqual(leerMarcasDetectadas({ borrador: true, marcas: [{ id: 7, x: 0, y: 1 }, { id: 7, x: 0.4, y: 0.5 }] }),
    [{ id: 1, x: 0, y: 1 }, { id: 2, x: 0.4, y: 0.5 }]);
  assert.deepEqual(leerMarcasDetectadas({ borrador: true, marcas: [] }), []);
});
test('rechaza respuestas invalidas en vez de presentarlas como cero racimos', () => {
  for (const payload of [null, {}, { borrador: false, marcas: [] }, { borrador: true, marcas: Array(201).fill({ x: 0, y: 0 }) }]) {
    assert.throws(() => leerMarcasDetectadas(payload));
  }
  for (const x of [NaN, Infinity, -0.1, 1.1, '0.4', null]) {
    assert.throws(() => leerMarcasDetectadas({ borrador: true, marcas: [{ x, y: 0.5 }] }));
  }
});
test('acepta un reparto exacto entre dos semanas', () => {
  assert.equal(validarRepartoFoto(15, [{ calendario_id: 1, cantidad: 8 }, { calendario_id: 2, cantidad: 7 }], cintas), true);
});
test('rechaza reparto incompleto y excedido', () => {
  for (const total of [14, 16]) {
    assert.equal(validarRepartoFoto(total, [{ calendario_id: 1, cantidad: 8 }, { calendario_id: 2, cantidad: 7 }], cintas), false);
  }
});
test('rechaza saldos agotados o modificados desde la captura', () => {
  assert.equal(validarRepartoFoto(9, [{ calendario_id: 1, cantidad: 9 }], cintas), false);
  assert.equal(validarRepartoFoto(1, [{ calendario_id: 1, cantidad: 1 }], [{ calendario_id: 1, disponible: 0 }]), false);
});
test('rechaza cantidades no enteras, infinitas, negativas y vacias', () => {
  for (const cantidad of [NaN, Infinity, -1, 0, 1.5]) {
    assert.equal(validarRepartoFoto(1, [{ calendario_id: 1, cantidad }], cintas), false);
  }
  assert.equal(validarRepartoFoto(0, [], cintas), false);
});
test('rechaza calendarios duplicados o que ya no pertenecen al contexto', () => {
  assert.equal(validarRepartoFoto(2, [{ calendario_id: 1, cantidad: 1 }, { calendario_id: 1, cantidad: 1 }], cintas), false);
  assert.equal(validarRepartoFoto(1, [{ calendario_id: 3, cantidad: 1 }], cintas), false);
});

test('genera UUID v4 sin randomUUID para celulares por HTTP local', (t) => {
  t.mock.method(globalThis.crypto, 'randomUUID', undefined);
  Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
  const ids = new Set(Array.from({ length: 100 }, () => crearUuid()));
  assert.equal(ids.size, 100);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
