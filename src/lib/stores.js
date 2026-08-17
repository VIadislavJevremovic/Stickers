import { writable, get } from 'svelte/store';
import { persisted } from './persist.js';

// ── Reference data ──────────────────────────────────────────────────────
// The fixed set of stickers. Loaded from public/catalog.json at startup.
// Never stored per-user; it's the same for everyone and lives in the repo.
export const catalog = writable([]);

export async function loadCatalog() {
  const res = await fetch(import.meta.env.BASE_URL + 'catalog.json');
  const data = await res.json();
  catalog.set(data);
}

// ── Your collection ─────────────────────────────────────────────────────
// The only personal data. A map of { [stickerId]: count }.
//   count 0 / absent → a miss
//   count 1          → you have it
//   count 2+         → duplicates (spares = count - 1)
export const collection = persisted('stickers.collection.v1', {});

// Set an exact count (0 removes the entry).
export function setCount(id, count) {
  collection.update((c) => {
    const next = { ...c };
    if (count <= 0) delete next[id];
    else next[id] = count;
    return next;
  });
  dropStaleGive(id);
}

// Nudge a count up or down. Used by the +/- steppers everywhere.
// Once you own a sticker it's stuck in the album, so an owned count never
// drops below 1 — only spares (count - 1) can be removed. A sticker you
// don't own (count 0) still stays at 0 when nudged down.
export function adjust(id, delta) {
  collection.update((c) => {
    const next = { ...c };
    const cur = next[id] || 0;
    let v = cur + delta;
    if (cur >= 1 && v < 1) v = 1; // protect the album copy
    if (v <= 0) delete next[id];
    else next[id] = v;
    return next;
  });
  dropStaleGive(id);
}

// ── The live swap session (staging area) ────────────────────────────────
// Kept completely separate from the collection so a half-entered trade can
// never corrupt your real counts. Persisted so closing the app mid-swap
// (bad signal at a meetup) doesn't lose the in-progress trade.
//   outgoing / incoming: maps of { [stickerId]: qty }
const emptySession = () => ({
  active: false,
  outgoing: {},
  incoming: {},
  startedAt: null,
});

export const session = persisted('stickers.session.v1', emptySession());

export function startSession() {
  session.set({ ...emptySession(), active: true, startedAt: Date.now() });
}

// side is 'outgoing' (giving) or 'incoming' (getting).
export function stage(side, id, delta) {
  session.update((s) => {
    const bag = { ...s[side] };
    const v = (bag[id] || 0) + delta;
    if (v <= 0) delete bag[id];
    else bag[id] = v;
    return { ...s, [side]: bag };
  });
}

// Drop a sticker from the Giving side once it no longer has a spare (e.g. you
// reverted it to missing, or stepped it down). Keeps the ledger/badge/history
// honest — you can only give spares you actually own.
function dropStaleGive(id) {
  if ((get(collection)[id] || 0) >= 2) return;
  session.update((s) => {
    if (!s.outgoing[id]) return s;
    const outgoing = { ...s.outgoing };
    delete outgoing[id];
    return { ...s, outgoing };
  });
}

// ── Committed history (lightweight log) ─────────────────────────────────
export const history = persisted('stickers.history.v1', []);

// Apply the staged deltas to the real collection, log the trade, and clear
// the session. Giving lowers counts, getting raises them.
export function commitSession() {
  session.update((s) => {
    collection.update((c) => {
      const next = { ...c };
      for (const [id, qty] of Object.entries(s.outgoing)) {
        const cur = next[id] || 0;
        // Giving away spares only — the album copy stays put (never below 1).
        if (cur >= 1) next[id] = Math.max(1, cur - qty);
      }
      for (const [id, qty] of Object.entries(s.incoming)) {
        next[id] = (next[id] || 0) + qty;
      }
      return next;
    });

    if (Object.keys(s.outgoing).length || Object.keys(s.incoming).length) {
      history.update((h) => [
        {
          when: Date.now(),
          gave: s.outgoing,
          got: s.incoming,
        },
        ...h,
      ]);
    }

    return emptySession();
  });
}

export function cancelSession() {
  session.set(emptySession());
}

// ── Backup: export / import the whole collection ────────────────────────
export function exportData(currentCollection) {
  return JSON.stringify(
    { schema: 'sticker-tracker/1', exportedAt: new Date().toISOString(), collection: currentCollection },
    null,
    2
  );
}

// Returns { ok, collection?, error? }. Does not mutate anything itself.
export function parseImport(text) {
  try {
    const data = JSON.parse(text);
    const coll = data && data.collection ? data.collection : data;
    if (!coll || typeof coll !== 'object' || Array.isArray(coll)) {
      return { ok: false, error: 'File does not contain a collection object.' };
    }
    const clean = {};
    for (const [id, count] of Object.entries(coll)) {
      const n = Math.floor(Number(count));
      if (Number.isFinite(n) && n > 0) clean[id] = n;
    }
    if (Object.keys(clean).length === 0) {
      return { ok: false, error: "That file doesn't contain any sticker counts." };
    }
    return { ok: true, collection: clean };
  } catch (_) {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
}
