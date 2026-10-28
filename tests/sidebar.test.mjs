import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sidebarSections, sidebarHelp, visibleSidebarSections } from '../src/navigation/sidebar.ts';
import { canAccess, permissionsForRole } from '../src/utils/rbac.ts';

test('las tareas diarias preceden al seguimiento, despacho y administracion', () => {
  assert.deepEqual(sidebarSections.map(section => section.key), ['diario', 'seguimiento', 'despacho', 'admin']);
  assert.deepEqual(sidebarSections[0].items.map(item => item.route), ['/registro-enfunde', '/conteo-cosecha-movil', '/registro-cosecha']);
  assert.equal(sidebarSections[1].items[0].route, '/alertas');
});

test('conserva los accesos sin duplicar la guia dentro del menu principal', () => {
  const routes = [...sidebarSections.flatMap(section => section.items), sidebarHelp].map(item => item.route);
  assert.equal(new Set(routes).size, 15);
  assert.equal(routes.length, 15);
  assert.equal(sidebarHelp.route, '/ayuda');
});

for (const role of ['ADMIN', 'SUPERVISOR', 'TRABAJADOR', 'INVITADO']) {
  test(`el menu de ${role} respeta permisos y no deja grupos vacios`, () => {
    const visible = visibleSidebarSections(permission => canAccess(permission, role));
    const expected = sidebarSections.flatMap(section => section.items).filter(item => canAccess(item.permission, role));
    assert.deepEqual(visible.flatMap(section => section.items), expected);
    assert.ok(visible.every(section => section.items.length > 0));
    if (role === 'TRABAJADOR') assert.equal(visible.some(section => section.key === 'admin'), false);
    if (role === 'INVITADO') assert.deepEqual(visible, []);
  });
}

test('todos los iconos del sidebar existen en la fuente incluida', () => {
  const css = readFileSync('src/styles/mdi-subset.css', 'utf8');
  for (const item of [...sidebarSections.flatMap(section => section.items), sidebarHelp]) {
    assert.ok(css.includes(`.${item.icon}::before`), `Icono ausente: ${item.icon}`);
  }
});

test('roles desconocidos no heredan permisos y las copias no modifican la matriz', () => {
  assert.deepEqual(permissionsForRole('INVALIDO'), []);
  const permissions = permissionsForRole('TRABAJADOR');
  permissions.push('view.usuarios');
  assert.equal(canAccess('view.usuarios', 'TRABAJADOR'), false);
});
