import { describe, it, expect, vi } from 'vitest';
import { objectPropertyGroups, lightPropertyGroups } from '../../src/logic/three/editor/propertyDefs.js';
import { renderPropertyGroups, parsePropertyPath } from '../../src/logic/three/editor/propertyForm.js';

const v = (x, y, z) => ({ x, y, z });
const box = { id: 'b1', position: v(1, 2, 3), rotation: v(0, 0, 0), scale: v(1, 1, 1), color: '#ffffff',
  metalness: 0.1, roughness: 0.5, opacity: 1, transparent: false, wireframe: false, interactive: false };
const ids = (groups) => Object.fromEntries(Object.entries(groups).map(([k, g]) => [k, g.properties.map((p) => p.id)]));

describe('3D property definitions', () => {
  it('lists the mesh groups and their properties in order', () => {
    expect(ids(objectPropertyGroups(box, { editCode: vi.fn() }))).toMatchSnapshot();
    expect(objectPropertyGroups({ ...box, animations: [{ name: 'run' }] }, { editCode: vi.fn() }).animation).toBeDefined();
  });

  it('labels transform rows and keeps the scale minimum', () => {
    const [px, , , , , , sx] = objectPropertyGroups(box, { editCode: vi.fn() }).transform.properties;
    expect(px).toMatchObject({ label: 'Position X', value: 1, step: 0.1 });
    expect(sx).toMatchObject({ label: 'Scale X', min: 0.01 });
  });

  it('adds the groups each light type needs', () => {
    const light = (type) => ({ type, name: 'L', color: '#fff', intensity: 1, position: v(0, 5, 0), target: v(0, 0, 0) });
    const groups = Object.fromEntries(['ambient', 'directional', 'spot', 'point', 'hemisphere']
      .map((t) => [t, ids(lightPropertyGroups(light(t)))]));
    expect(groups).toMatchSnapshot();
    expect(Object.keys(lightPropertyGroups(light('spot')))).toEqual(['general', 'position', 'spotlight', 'shadow']);
  });
});

describe('3D property form', () => {
  it('turns a dotted id into a nested update', () => {
    expect(parsePropertyPath('position.x', 2)).toEqual({ position: { x: 2 } });
    expect(parsePropertyPath('color', '#f00')).toEqual({ color: '#f00' });
  });

  it('builds inputs and reports typed updates', () => {
    const panel = document.createElement('div');
    const onUpdate = vi.fn();
    renderPropertyGroups(panel, objectPropertyGroups(box, { editCode: vi.fn() }), box, onUpdate);
    const x = panel.querySelector('#prop-b1-position\\.x');
    x.value = '4';
    x.dispatchEvent(new Event('change'));
    expect(onUpdate).toHaveBeenLastCalledWith({ position: { x: 4 } });
    const metal = panel.querySelector('#prop-b1-metalness');
    metal.value = '0.7';
    metal.dispatchEvent(new Event('input'));
    expect(onUpdate).toHaveBeenLastCalledWith({ metalness: 0.7 });
    expect(metal.nextElementSibling.textContent).toBe('0.70');
  });
});
