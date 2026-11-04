// Compiles behavior code (the per-object `code` strings in scenes) once and reuses it.
// Before this, Sprite and ThreeObject called `new Function(code)` on every frame.

const cache = new Map();
const MAX_ENTRIES = 500;

/**
 * Returns a function for `code` that takes `params` as named arguments.
 * Returns null for empty code. Throws a SyntaxError for invalid code
 * (the error is cached too, so it is thrown again without recompiling).
 */
export function compileBehavior(code, params = []) {
  if (!code || !code.trim()) return null;

  const key = `${params.join(',')}\u0000${code}`;
  let entry = cache.get(key);
  if (!entry) {
    try {
      entry = { fn: new Function(...params, code) };
    } catch (error) {
      entry = { error };
    }
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(key, entry);
  }
  if (entry.error) throw entry.error;
  return entry.fn;
}

/** For tests. */
export function clearBehaviorCache() {
  cache.clear();
}
