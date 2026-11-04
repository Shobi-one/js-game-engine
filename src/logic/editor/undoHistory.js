// Undo and redo stacks for editor actions. EditorUI decides what an action means;
// this only keeps the stacks and their size limit.
class UndoHistory {
  constructor(limit = 100) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * A new user action: it can be undone, and anything redoable is dropped.
   * If merge(latest) returns true, the action was folded into the latest one
   * (for example one slider drag) and nothing new is pushed.
   */
  record(action, merge = null) {
    this.redoStack.length = 0;
    const latest = this.undoStack[this.undoStack.length - 1];
    if (merge && latest && merge(latest)) return;
    this._push(this.undoStack, action);
  }

  takeUndo() {
    return this.undoStack.pop() ?? null;
  }

  takeRedo() {
    return this.redoStack.pop() ?? null;
  }

  /** Called while undoing: the inverse action becomes redoable. */
  pushRedo(action) {
    this._push(this.redoStack, action);
  }

  /** Called while redoing: the inverse action becomes undoable again. */
  pushUndo(action) {
    this._push(this.undoStack, action);
  }

  _push(stack, action) {
    stack.push(action);
    if (stack.length > this.limit) stack.shift();
  }
}

const sameKeys = (a, b) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => k in b);
};

/**
 * Merge rule for property edits: edits to the same fields of the same item
 * within `windowMs` count as one undo step, keeping the oldest `prev`.
 * Actions look like { type: 'update', kind, id, prev, at }.
 */
function mergeUpdates(action, windowMs = 1000) {
  return (latest) => {
    const mergeable = latest.type === 'update' && latest.kind === action.kind && latest.id === action.id
      && sameKeys(latest.prev, action.prev) && action.at - latest.at < windowMs;
    if (mergeable) latest.at = action.at;
    return mergeable;
  };
}

export { UndoHistory, mergeUpdates };
