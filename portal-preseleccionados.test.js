import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./portal.html', import.meta.url), 'utf8');
const match = source.match(/function clasificarAddonsPortal\(addons, adicionales\) \{[\s\S]*?\n\}/);

test('muestra servicios sueltos preseleccionados junto a los combos', () => {
  assert.ok(match, 'portal.html debe definir clasificarAddonsPortal');

  const context = {};
  vm.runInNewContext(match[0], context);

  const addons = [
    { clave: 'COMBO-A', componentes: ['ADD-A'] },
    { clave: 'ADD-A', componentes: [] },
    { clave: 'ADD-B', componentes: [] },
  ];
  const resultado = context.clasificarAddonsPortal(addons, [{ clave: 'ADD-A' }]);

  assert.deepEqual(
    JSON.parse(JSON.stringify(resultado.visibles.map((a) => a.clave))),
    ['COMBO-A', 'ADD-A']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(resultado.enAcordeon.map((a) => a.clave))),
    ['ADD-B']
  );
});
