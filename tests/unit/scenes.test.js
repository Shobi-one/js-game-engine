import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// A light sanity check on every scene file, so a broken JSON edit fails fast.
const dir = resolve(__dirname, '../../scenes');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe.each(files)('scenes/%s', (file) => {
  const data = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));

  it('has a name and a valid type', () => {
    expect(typeof data.name).toBe('string');
    expect(['2d', '3d']).toContain(data.type);
  });

  it('has behavior code that compiles', () => {
    const items = data.type === '2d' ? data.sprites ?? [] : data.objects ?? [];
    for (const item of items) {
      const code = data.type === '2d' ? item.code : item.animation?.code;
      if (code) expect(() => new Function(code)).not.toThrow();
    }
  });
});
