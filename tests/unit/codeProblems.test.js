import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { ensureSyntaxTree } from '@codemirror/language';
import { runtimeErrorLine, syntaxError } from '../../src/logic/editor/codeProblems.js';
import { findProblems } from '../../src/logic/editor/codeEditorView.js';

const stateFor = (code) => {
  const state = EditorState.create({ doc: code, extensions: [javascript()] });
  ensureSyntaxTree(state, state.doc.length, 5000);
  return state;
};
const lineOf = (state, problem) => state.doc.lineAt(problem.from).number;

describe('behavior code problems', () => {
  it('finds the body line of a runtime error', () => {
    let error;
    try {
      new Function('width', 'height', 'const a = 1;\nconst b = 2;\nnull.x;')();
    } catch (e) {
      error = e;
    }
    expect(runtimeErrorLine(error)).toBe(3);
    expect(runtimeErrorLine(new Error('no stack line'))).toBeNull();
  });

  it('uses the same check as the engine', () => {
    expect(syntaxError('this.x += 1;')).toBeNull();
    expect(syntaxError('let = ;')).toMatch(/Unexpected/);
    // `width` is a parameter for sprites, so declaring it again is an error there only.
    expect(syntaxError('let width = 1;', ['width'])).toMatch(/already been declared/);
  });

  it('marks a syntax error on its line', () => {
    const state = stateFor('this.x += 1;\nif (this.x > 5 {\n  this.x = 0;\n}');
    const [problem] = findProblems(state);
    expect(problem.message).toMatch(/^Syntax error:/);
    expect(lineOf(state, problem)).toBe(2);
  });

  it('shows the last runtime error while the code is unchanged', () => {
    const code = 'const a = 1;\nnull.x;';
    let runtimeError;
    try { new Function(code)(); } catch (e) { runtimeError = e; }
    const state = stateFor(code);
    const [problem] = findProblems(state, { runtimeError, originalCode: code });
    expect(problem.message).toMatch(/^Last run: Cannot read properties of null/);
    expect(lineOf(state, problem)).toBe(2);
    expect(findProblems(stateFor(`${code}\n// edited`), { runtimeError, originalCode: code })).toEqual([]);
  });

  it('reports nothing for good code', () => {
    expect(findProblems(stateFor('this.rotation += 2;'))).toEqual([]);
  });
});
