/**
 * The behavior code editor (the "Edit Logic" / "Edit Code" modal), shared by the
 * 2D and 3D editors. CodeMirror gives it line numbers, JavaScript highlighting,
 * bracket matching, search (Ctrl+F) and its own undo; problems are marked on
 * their line and listed in the status bar under the editor.
 *
 * CodeMirror is about 170 kB gzipped, so it is its own chunk: preloaded once the
 * page is idle (which also puts it in the offline cache), and awaited on first open.
 */

let loading = null;

function load() {
  loading ??= import('./codeEditorView.js').then(({ CodeEditor }) => new CodeEditor({
    modal: document.getElementById('code-editor-modal'),
    mount: document.getElementById('code-editor-mount'),
    applyButton: document.getElementById('code-editor-apply'),
    status: document.getElementById('code-editor-status'),
  }));
  return loading;
}

/** Starts loading the editor in the background. */
export function preloadCodeEditor() {
  const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1000));
  idle(() => load().catch(() => { loading = null; }));
}

/** Opens the editor. See CodeEditor.open for the options. */
export async function openCodeEditor(options) {
  const editor = await load();
  editor.open(options);
  return editor;
}
