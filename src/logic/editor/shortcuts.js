/**
 * Editor shortcuts and the Undo / Redo / Edit menu commands, sent to the editor
 * that is showing: window.editorUI in 2D, the engine's threeUI in 3D.
 * Each editor implements undo, redo, duplicate, copy and paste.
 */

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'email', 'password', 'tel']);

/** True while the user types in a text field, where the browser's own undo and copy should win. */
export function isTypingIn(target) {
  if (!target) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA') return true;
  return target.tagName === 'INPUT' && TEXT_INPUT_TYPES.has(target.type);
}

/** The command for a key event, or null. */
export function commandForKey(e) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
  const key = e.key.toLowerCase();
  if (key === 'z') return e.shiftKey ? 'redo' : 'undo';
  if (e.shiftKey) return null;
  return { y: 'redo', d: 'duplicate', c: 'copy', v: 'paste' }[key] ?? null;
}

export function activeEditor() {
  const engine = window.engineController;
  return engine?.mode === '3d' ? engine.threeUI : window.editorUI;
}

export function runCommand(name) {
  // A field being edited (say X in the properties panel) commits its change on blur.
  // Blur first, so that change is recorded before an undo instead of after it.
  const focused = document.activeElement;
  if (focused?.tagName === 'INPUT' || focused?.tagName === 'SELECT') focused.blur();
  activeEditor()?.[name]?.();
}

const MENU_COMMANDS = {
  'undo-btn': 'undo',
  'redo-btn': 'redo',
  'edit-duplicate': 'duplicate',
  'edit-copy': 'copy',
  'edit-paste': 'paste',
};

export function initEditorShortcuts(doc = document) {
  doc.addEventListener('keydown', (e) => {
    if (isTypingIn(e.target)) return;
    const command = commandForKey(e);
    if (!command) return;
    e.preventDefault();
    runCommand(command);
  });

  for (const [id, command] of Object.entries(MENU_COMMANDS)) {
    doc.getElementById(id)?.addEventListener('click', () => {
      runCommand(command);
      const editMenu = doc.getElementById('edit-menu');
      if (editMenu) editMenu.style.display = 'none';
    });
  }
}
