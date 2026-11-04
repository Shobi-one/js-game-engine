const VECTOR_KEYS = ['position', 'rotation', 'scale', 'target'];

/** Returns props with partial {x,y,z} vectors filled in from `current`. */
export function mergeVectors(current, props) {
  const merged = { ...props };
  for (const key of VECTOR_KEYS) {
    if (props[key] && current[key] && typeof current[key] === 'object') {
      merged[key] = { ...current[key], ...props[key] };
    }
  }
  return merged;
}
