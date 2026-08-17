// Regenerate public/catalog.json and data/collection-import.json from the
// source data in data/ (all-stickers.txt + the missing/duplicate HTML reports).
//
// Usage:  node scripts/generate-catalog.mjs
//
//   catalog.json          — reference data (every sticker), committed to the repo
//   collection-import.json— your ownership, to load once via the app's Import
//
// Ownership rule, per sticker:
//   in the missing report   → count 0 (a miss, omitted from the collection)
//   in the duplicate report → 1 + (times it appears)  e.g. MAR2 listed 3x = 4
//   otherwise (covered team)→ count 1 (have)
//   ids in teams not in either report (00, CC-*) → unknown, omitted

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Parse all-stickers.txt → ordered list of ids ────────────────────────
const ids = readFileSync(join(ROOT, 'data/all-stickers.txt'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

// ── Extract the `const data = [...]` array from an HTML report ───────────
function parseReport(file) {
  const html = readFileSync(join(ROOT, 'data', file), 'utf8');
  const m = html.match(/const data = (\[[\s\S]*?\]);/);
  const rows = eval(m[1]); // [code, name, [numbers]]
  const names = {};
  const nums = {};
  for (const [code, name, arr] of rows) {
    names[code] = name;
    nums[code] = arr;
  }
  return { names, nums };
}

const missing = parseReport('missing-stickers.html');
const dupes = parseReport('duplicate-stickers.html');

// Team code → full name (both reports agree; prefer missing, fall back to dupes)
const NAMES = { ...dupes.names, ...missing.names };

// Name groups the reports don't cover (CC = Coca-Cola promo stickers).
const NAME_OVERRIDES = { CC: 'Coca-Cola' };
Object.assign(NAMES, NAME_OVERRIDES);

// Stickers owned but absent from the missing/duplicate reports (the reports
// only cover teams + FWC). Seeded as count 1 (owned, no spare).
const OWNED_EXTRAS = new Set([
  '00',
  ...Array.from({ length: 12 }, (_, i) => `CC-${i + 1}`),
]);

// ── Split an id like "MEX5", "FWC19", "CC-3", "00" into {code, num} ──────
function split(id) {
  if (id === '00') return { code: '00', num: null };
  let m = id.match(/^([A-Z]+)(\d+)$/); // MEX5, FWC19
  if (m) return { code: m[1], num: Number(m[2]) };
  m = id.match(/^(CC)-(\d+)$/); // CC-3
  if (m) return { code: m[1], num: Number(m[2]) };
  return { code: id, num: null };
}

// Fallback set for ids whose code isn't a named team (currently just "00").
const SPECIAL_SET = {
  '00': 'Special',
};

// ── Build catalog.json ──────────────────────────────────────────────────
const catalog = ids.map((id) => {
  const { code, num } = split(id);
  const entry = { id };
  const country = NAMES[code];
  if (country && num != null) {
    entry.name = `${country} ${num}`;
    entry.set = country;
  } else if (code === 'FWC') {
    entry.name = `FIFA World Cup ${num}`;
    entry.set = 'FIFA World Cup';
  } else {
    entry.set = SPECIAL_SET[code] || 'Special';
  }
  return entry;
});

// ── Build collection (ownership) from missing + duplicate reports ────────
const covered = new Set([...Object.keys(missing.nums), ...Object.keys(dupes.nums)]);
const collection = {};
const unknown = [];

for (const id of ids) {
  const { code, num } = split(id);
  if (OWNED_EXTRAS.has(id)) {
    collection[id] = 1;
    continue;
  }
  if (!covered.has(code) || num == null) {
    unknown.push(id);
    continue;
  }
  const miss = (missing.nums[code] || []).includes(num);
  if (miss) continue; // count 0
  const spares = (dupes.nums[code] || []).filter((n) => n === num).length;
  collection[id] = 1 + spares;
}

// Guard against silent drift: every id must be either covered by the reports
// or explicitly listed in OWNED_EXTRAS. A new special/promo code would
// otherwise vanish from the seeded collection with no warning.
if (unknown.length > 0) {
  console.error(
    `Refusing to write: ${unknown.length} id(s) are neither in the reports nor ` +
      `OWNED_EXTRAS — add them to OWNED_EXTRAS/NAME_OVERRIDES:\n  ${unknown.join(', ')}`
  );
  process.exit(1);
}

// ── Write outputs ───────────────────────────────────────────────────────
writeFileSync(join(ROOT, 'public/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');

const backup = {
  schema: 'sticker-tracker/1',
  exportedAt: new Date().toISOString(),
  collection,
};
writeFileSync(join(ROOT, 'data/collection-import.json'), JSON.stringify(backup, null, 2) + '\n');

// ── Report ──────────────────────────────────────────────────────────────
const have = Object.values(collection).filter((c) => c >= 1).length;
const spareTotal = Object.values(collection).reduce((n, c) => n + Math.max(0, c - 1), 0);
console.log(`catalog entries : ${catalog.length}`);
console.log(`sets            : ${new Set(catalog.map((c) => c.set)).size}`);
console.log(`have (count>=1) : ${have}`);
console.log(`total spares    : ${spareTotal}`);
console.log(`missing/omitted : ${catalog.length - have}`);
console.log(`unknown (omitted, not in reports): ${unknown.length} -> ${unknown.join(', ')}`);
