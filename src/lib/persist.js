import { writable } from 'svelte/store';

// A writable store that mirrors itself to localStorage.
// If storage is blocked (file://, Safari private mode) it silently
// degrades to an in-memory store instead of throwing.
export function persisted(key, initial) {
  let start = initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw != null) start = JSON.parse(raw);
  } catch (_) {
    /* unreadable — use initial */
  }

  const store = writable(start);

  store.subscribe((value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      /* storage blocked — keep working in memory for this session */
    }
  });

  return store;
}

// One-time probe so the UI can warn when persistence isn't available.
export function storageWorks() {
  try {
    const k = '__probe__' + Date.now();
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch (_) {
    return false;
  }
}
