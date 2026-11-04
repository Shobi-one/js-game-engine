/**
 * The View → Snap to Grid setting, shared by the 2D and 3D editors.
 * Editors subscribe and get the current value straight away.
 */

const listeners = new Set();
let enabled = false;

export const snapSettings = {
  get enabled() {
    return enabled;
  },
  set(value) {
    enabled = Boolean(value);
    listeners.forEach((fn) => fn(enabled));
  },
  toggle() {
    this.set(!enabled);
  },
  subscribe(fn) {
    listeners.add(fn);
    fn(enabled);
    return () => listeners.delete(fn);
  },
};

export function initSnapMenu(doc = document) {
  const item = doc.getElementById('view-snap');
  if (!item) return;
  snapSettings.subscribe((on) => item.setAttribute('text', `Snap to Grid: ${on ? 'On' : 'Off'}`));
  item.addEventListener('click', () => snapSettings.toggle());
}
