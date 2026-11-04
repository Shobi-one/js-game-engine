import { describe, it, expect } from 'vitest';
import { UndoHistory } from '../../src/logic/editor/undoHistory.js';

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
});
