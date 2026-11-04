import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { ensureSyntaxTree } from '@codemirror/language';
import { runtimeErrorLine, syntaxError, engineOnlySyntaxErrorLine } from '../../src/logic/editor/codeProblems.js';
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

  it('reads the line from a Firefox stack too', () => {
    const error = { stack: 'anonymous@http://localhost/assets/index.js line 12 > Function:4:7\nrun@http://localhost/assets/index.js:12:3' };
    expect(runtimeErrorLine(error)).toBe(2);
  });

  it('places a redeclared name on the clashing declaration', () => {
    const message = "Identifier 'speed' has already been declared";
    expect(engineOnlySyntaxErrorLine('let speed = 1;\nthis.x += speed;\nconst speed = 2;', message)).toBe(3);
    expect(engineOnlySyntaxErrorLine('let speed = 1; let speed = 2;', message)).toBe(1);
    expect(engineOnlySyntaxErrorLine('this.x = 1;\nlet width = 5;', "Identifier 'width' has already been declared", ['width'])).toBe(2);
    expect(engineOnlySyntaxErrorLine('x', 'Unexpected token')).toBeNull();
  });

  it('says the line is unknown instead of guessing line 1', () => {
    const state = stateFor('this.x = 1;\nthis.y = 2;');
    const [problem] = findProblems(state, { runtimeError: new Error('boom'), originalCode: 'this.x = 1;\nthis.y = 2;' });
    expect(problem.lineUnknown).toBe(true);
    expect(problem.from).toBe(0);
  });

  it('marks an engine-only syntax error on its line', () => {
    const state = stateFor('this.x += 1;\nlet width = 3;');
    const [problem] = findProblems(state, { params: ['width', 'height'] });
    expect(problem.message).toMatch(/already been declared/);
    expect(problem.lineUnknown).toBeUndefined();
    expect(lineOf(state, problem)).toBe(2);
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
