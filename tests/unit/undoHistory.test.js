import { describe, it, expect } from 'vitest';
import { UndoHistory, mergeUpdates } from '../../src/logic/editor/undoHistory.js';

describe('UndoHistory', () => {
  it('undoes the latest action first', () => {
    const h = new UndoHistory();
    h.record({ n: 1 });
    h.record({ n: 2 });
    expect(h.takeUndo()).toEqual({ n: 2 });
    expect(h.takeUndo()).toEqual({ n: 1 });
    expect(h.takeUndo()).toBeNull();
  });

  it('a new action clears redo', () => {
    const h = new UndoHistory();
    h.pushRedo({ n: 1 });
    h.record({ n: 2 });
    expect(h.takeRedo()).toBeNull();
  });

  it('redo pushes back onto undo without clearing redo', () => {
    const h = new UndoHistory();
    h.pushRedo({ n: 1 });
    h.pushRedo({ n: 2 });
    h.pushUndo(h.takeRedo());
    expect(h.takeRedo()).toEqual({ n: 1 });
    expect(h.takeUndo()).toEqual({ n: 2 });
  });

  it('keeps at most `limit` actions', () => {
    const h = new UndoHistory(3);
    for (let n = 1; n <= 5; n++) h.record({ n });
    expect([h.takeUndo(), h.takeUndo(), h.takeUndo(), h.takeUndo()]).toEqual([{ n: 5 }, { n: 4 }, { n: 3 }, null]);
  });

  it('folds a slider drag into one undo step', () => {
    const h = new UndoHistory();
    const edit = (value, at, id = 1) => ({ type: 'update', kind: 'object', id, prev: { metalness: value }, at });
    for (const [value, at] of [[0.5, 0], [0.6, 100], [0.7, 200]]) {
      const action = edit(value, at);
      h.record(action, mergeUpdates(action));
    }
    expect(h.takeUndo()).toMatchObject({ prev: { metalness: 0.5 }, at: 200 });
    expect(h.takeUndo()).toBeNull();
  });

  it('keeps edits apart when they are slow, on other fields or on another item', () => {
    const h = new UndoHistory();
    const record = (action) => h.record(action, mergeUpdates(action));
    record({ type: 'update', kind: 'object', id: 1, prev: { x: 0 }, at: 0 });
    record({ type: 'update', kind: 'object', id: 1, prev: { x: 1 }, at: 5000 });
    record({ type: 'update', kind: 'object', id: 1, prev: { y: 1 }, at: 5100 });
    record({ type: 'update', kind: 'object', id: 2, prev: { y: 1 }, at: 5200 });
    record({ type: 'update', kind: 'light', id: 2, prev: { y: 1 }, at: 5300 });
    expect(h.undoStack).toHaveLength(5);
  });
});
