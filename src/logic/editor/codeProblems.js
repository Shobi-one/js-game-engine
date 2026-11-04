/**
 * Where a behavior's problems are: no CodeMirror here, so tests and the
 * startup bundle can use it.
 */

// new Function(params..., body) puts two lines before the body: "function anonymous(params" and ") {".
const FUNCTION_HEADER_LINES = 2;

/** The 1-based line in the behavior code where a runtime error happened, or null. */
export function runtimeErrorLine(error) {
  const match = /<anonymous>:(\d+):\d+/.exec(error?.stack ?? '');
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
