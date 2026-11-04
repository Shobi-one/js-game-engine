// Undo and redo stacks for editor actions. EditorUI decides what an action means;
// this only keeps the stacks and their size limit.
class UndoHistory {
  constructor(limit = 100) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }

  /** A new user action: it can be undone, and anything redoable is dropped. */
  record(action) {
    this.redoStack.length = 0;
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

export { UndoHistory };
