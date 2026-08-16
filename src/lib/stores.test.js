import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  collection,
  session,
  history,
  setCount,
  adjust,
  stage,
  startSession,
  setPartner,
  commitSession,
  cancelSession,
  exportData,
  parseImport,
} from './stores.js';

// The stores are module-level singletons; reset them before each test.
beforeEach(() => {
  collection.set({});
  history.set([]);
  cancelSession();
});

describe('adjust — the album-copy rule', () => {
  it('adds a sticker you did not own', () => {
    adjust('A', 1);
    expect(get(collection)).toEqual({ A: 1 });
  });

  it('increments an owned sticker into spares', () => {
    collection.set({ A: 1 });
    adjust('A', 1);
    expect(get(collection).A).toBe(2);
  });

  it('removes a spare (2 -> 1)', () => {
    collection.set({ A: 2 });
    adjust('A', -1);
    expect(get(collection).A).toBe(1);
  });

  it('never drops an owned sticker below 1 (the album copy stays)', () => {
    collection.set({ A: 1 });
    adjust('A', -1);
    expect(get(collection).A).toBe(1); // still owned, not deleted
  });

  it('floors to 1 even for a large negative delta', () => {
    collection.set({ A: 2 });
    adjust('A', -5);
    expect(get(collection).A).toBe(1);
  });

  it('leaves an unowned sticker missing when nudged down', () => {
    adjust('A', -1);
    expect(get(collection).A).toBeUndefined();
  });
});

describe('setCount', () => {
  it('sets an explicit count', () => {
    setCount('A', 3);
    expect(get(collection).A).toBe(3);
  });

  it('removes the entry when set to 0 or below', () => {
    collection.set({ A: 2 });
    setCount('A', 0);
    expect(get(collection).A).toBeUndefined();
  });
});

describe('stage (swap staging)', () => {
  it('stages and accumulates on a side', () => {
    stage('outgoing', 'A', 2);
    stage('outgoing', 'A', 1);
    expect(get(session).outgoing).toEqual({ A: 3 });
  });

  it('removes the key when a side drops to 0', () => {
    stage('incoming', 'B', 1);
    stage('incoming', 'B', -1);
    expect(get(session).incoming.B).toBeUndefined();
  });
});

describe('commitSession', () => {
  it('applies incoming (adds) and outgoing (removes spares)', () => {
    collection.set({ A: 3, B: 1 });
    startSession('Sam');
    stage('outgoing', 'A', 2); // give 2 of 3 -> 1 left
    stage('incoming', 'C', 1); // receive a new one
    commitSession();
    const c = get(collection);
    expect(c.A).toBe(1);
    expect(c.C).toBe(1);
    expect(c.B).toBe(1);
  });

  it('never gives away the album copy (outgoing floors at 1)', () => {
    collection.set({ A: 2 });
    startSession();
    stage('outgoing', 'A', 5); // more than owned
    commitSession();
    expect(get(collection).A).toBe(1);
  });

  it('logs the trade to history and clears the session', () => {
    collection.set({ A: 2 });
    startSession('Alex');
    stage('outgoing', 'A', 1);
    stage('incoming', 'Z', 1);
    commitSession();

    const h = get(history);
    expect(h).toHaveLength(1);
    expect(h[0].partner).toBe('Alex');
    expect(h[0].gave).toEqual({ A: 1 });
    expect(h[0].got).toEqual({ Z: 1 });

    const s = get(session);
    expect(s.active).toBe(false);
    expect(s.outgoing).toEqual({});
    expect(s.incoming).toEqual({});
  });

  it('does not log history for an empty commit', () => {
    startSession('Nobody');
    commitSession();
    expect(get(history)).toHaveLength(0);
  });
});

describe('session lifecycle', () => {
  it('starts and cancels a session', () => {
    startSession('Pat');
    let s = get(session);
    expect(s.active).toBe(true);
    expect(s.partner).toBe('Pat');

    setPartner('Robin');
    expect(get(session).partner).toBe('Robin');

    cancelSession();
    s = get(session);
    expect(s.active).toBe(false);
    expect(s.partner).toBe('');
  });
});

describe('parseImport', () => {
  it('accepts a wrapped export ({ collection })', () => {
    const r = parseImport(JSON.stringify({ collection: { A: 2 } }));
    expect(r).toEqual({ ok: true, collection: { A: 2 } });
  });

  it('accepts a bare collection object', () => {
    const r = parseImport(JSON.stringify({ A: 1, B: 3 }));
    expect(r.ok).toBe(true);
    expect(r.collection).toEqual({ A: 1, B: 3 });
  });

  it('drops zero, negative, and non-numeric counts; floors decimals', () => {
    const r = parseImport(JSON.stringify({ A: 0, B: -1, C: 2.7, D: 'x', E: 3 }));
    expect(r.collection).toEqual({ C: 2, E: 3 });
  });

  it('rejects invalid JSON', () => {
    expect(parseImport('not json').ok).toBe(false);
  });

  it('rejects a JSON array', () => {
    expect(parseImport(JSON.stringify([1, 2, 3])).ok).toBe(false);
  });
});

describe('exportData', () => {
  it('wraps the collection with a schema tag', () => {
    const out = JSON.parse(exportData({ A: 2 }));
    expect(out.schema).toBe('sticker-tracker/1');
    expect(out.collection).toEqual({ A: 2 });
    expect(typeof out.exportedAt).toBe('string');
  });
});
