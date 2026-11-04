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
  })).catch((error) => {
    // Don't keep the failure: engines that allow re-importing a failed module can retry on
    // the next open. Chrome keeps it for the page's lifetime, hence "reload" in the message.
    loading = null;
    throw error;
  });
  return loading;
}

/** Starts loading the editor in the background. */
export function preloadCodeEditor() {
  const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1000));
  idle(() => load().catch(() => {}));
}

/** Opens the editor. See CodeEditor.open for the options. */
export async function openCodeEditor(options) {
  let editor;
  try {
    editor = await load();
  } catch (error) {
    console.warn('The code editor could not be loaded:', error);
    alert('The code editor could not be loaded. Check your connection, then reload the page.');
    return null;
  }
  editor.open(options);
  return editor;
}
