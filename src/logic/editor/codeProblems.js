/**
 * Where a behavior's problems are: no CodeMirror here, so tests and the
 * startup bundle can use it.
 */

// new Function(params..., body) puts two lines before the body: "function anonymous(params" and ") {".
const FUNCTION_HEADER_LINES = 2;

// Where a `new Function` frame's line is in a stack trace: V8 ("<anonymous>:3:5")
// and Firefox ("... line 12 > Function:3:5"). Other engines give no usable line.
const FUNCTION_FRAME = [/<anonymous>:(\d+):\d+/, /> Function:(\d+):\d+/];

/** The 1-based line in the behavior code where a runtime error happened, or null when unknown. */
export function runtimeErrorLine(error) {
  const stack = error?.stack ?? '';
  const match = FUNCTION_FRAME.map((re) => re.exec(stack)).find(Boolean);
  if (!match) return null;
  const line = Number(match[1]) - FUNCTION_HEADER_LINES;
  return line >= 1 ? line : null;
}

/**
 * The engine's own verdict: the message if `new Function` rejects the code, else null.
 * This only checks a draft while it is typed, so it skips compileBehavior's cache
 * on purpose (every keystroke would add an entry).
 */
export function syntaxError(code, params = []) {
  try {
    new Function(...params, code);
    return null;
  } catch (error) {
    return error.message;
  }
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A line for a syntax error the JavaScript parser accepts but the engine rejects,
 * or null when unknown. Only "Identifier 'x' has already been declared" is placed:
 * on the declaration that clashes (the second one, or the first if `x` is a parameter).
 */
export function engineOnlySyntaxErrorLine(code, message, params = []) {
  const name = /Identifier '([^']+)' has already been declared/.exec(message ?? '')?.[1];
  if (!name) return null;
  const declaration = new RegExp(`\\b(?:let|const|var|class|function)\\s+${escapeRegExp(name)}\\b`, 'g');
  // One entry per declaration, so two on the same line still count twice.
  const lines = code.split('\n').flatMap((text, i) => (text.match(declaration) ?? []).map(() => i + 1));
  return lines[params.includes(name) ? 0 : 1] ?? null;
}
