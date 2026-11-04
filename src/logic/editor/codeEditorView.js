/**
 * The CodeMirror view of the behavior code editor. Loaded on its own (see
 * codeEditor.js), so CodeMirror doesn't slow down the editor's start.
 */
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxTree } from '@codemirror/language';
import { linter, forceLinting } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { runtimeErrorLine, syntaxError, engineOnlySyntaxErrorLine } from './codeProblems.js';

/**
 * Problems in `state`, as CodeMirror diagnostics. Syntax errors are placed with
 * the JavaScript parser (the engine's SyntaxError has no line), and a runtime
 * error from the last run is shown on its line while the code is unchanged.
 */
export function findProblems(state, { params = [], runtimeError = null, originalCode = null } = {}) {
  const code = state.doc.toString();
  const message = syntaxError(code, params);
  if (message) {
    const errorNodes = [];
    syntaxTree(state).iterate({ enter: (node) => { if (node.type.isError) errorNodes.push(node.from); } });
    const lineNo = errorNodes.length
      ? state.doc.lineAt(Math.min(Math.min(...errorNodes), state.doc.length)).number
      : engineOnlySyntaxErrorLine(code, message, params);
    return [problemOn(state, lineNo, `Syntax error: ${message}`)];
  }
  if (runtimeError && code === originalCode) {
    return [problemOn(state, runtimeErrorLine(runtimeError), `Last run: ${runtimeError.message}`)];
  }
  return [];
}

// A problem on a 1-based line, or (line unknown) a point at the start that the status bar says is unplaced.
function problemOn(state, lineNo, message) {
  if (lineNo && lineNo <= state.doc.lines) {
    const line = state.doc.line(lineNo);
    return { from: line.from, to: line.to, severity: 'error', message };
  }
  return { from: 0, to: 0, severity: 'error', message, lineUnknown: true };
}

const describe = (state, problems) => {
  if (!problems.length) return 'No problems';
  const p = problems[0];
  if (p.lineUnknown) return `Line unknown: ${p.message}`;
  return `Line ${state.doc.lineAt(p.from).number}: ${p.message}`;
};

export class CodeEditor {
  constructor({ modal, mount, applyButton, status }) {
    this.modal = modal;
    this.status = status;
    this.context = {};
    this._onApply = null;

    this.view = new EditorView({
      parent: mount,
      // The editor is slotted into <modal-window>'s shadow DOM but lives in the page.
      // Left to itself, CodeMirror follows the slot to the shadow root, never sees itself
      // focused there, and loses the cursor (Enter then types before the new line).
      root: document,
      state: this._state(''),
    });
    applyButton.addEventListener('click', () => this.apply());
  }

  _state(code) {
    return EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        javascript(),
        keymap.of([indentWithTab]),
        // Keeps the id the old <textarea> had, for the editor shortcuts and the tests.
        EditorView.contentAttributes.of({ id: 'code-editor-textarea', 'aria-label': 'Behavior code' }),
        linter((view) => {
          const problems = findProblems(view.state, this.context);
          if (this.status) this.status.textContent = describe(view.state, problems);
          return problems;
        }, { delay: 300 }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '13px' },
          '.cm-scroller': { fontFamily: '"Courier New", monospace' },
        }),
      ],
    });
  }

  /**
   * Opens the editor on `code`. `params` are the names the code can use
   * (['width', 'height'] for sprites, ['THREE'] for 3D objects). `runtimeError`
   * is the item's last error, if any. onApply(newCode) runs on Apply.
   */
  open({ code = '', params = [], runtimeError = null, onApply }) {
    this.context = { params, runtimeError, originalCode: code };
    this._onApply = onApply;
    this.view.setState(this._state(code));
    this.modal.show();
    this.view.focus();
    forceLinting(this.view);
  }

  get value() {
    return this.view.state.doc.toString();
  }

  apply() {
    this._onApply?.(this.value);
    this.modal.hide();
  }
}
