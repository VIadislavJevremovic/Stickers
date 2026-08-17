<script>
  import { catalog, collection, session, adjust, setCount, stage, startSession } from '../lib/stores.js';
  import { tap } from '../lib/haptics.js';
  import { stateClass, codeOf } from '../lib/sticker.js';
  import StickerCard from './StickerCard.svelte';
  import { fade, scale } from 'svelte/transition';

  let filter = 'all';       // all | missing | have | spares
  let query = '';
  let setFilter = 'all';
  let sortMode = 'group';   // group (catalog order) | alpha (A–Z)
  let openId = null;        // sticker whose detail modal is open

  // In alphabetical mode these sets stay pinned to the top, in this order.
  const PINNED_SETS = ['Special', 'FIFA World Cup', 'Coca-Cola'];

  // Order two set names per the given mode: catalog order (0 = keep as-is)
  // or A–Z with the pinned sets held on top. `mode` is passed in (rather
  // than read from the closure) so reactive statements track it as a dep.
  function setCmp(a, b, mode) {
    if (mode !== 'alpha') return 0;
    const ai = PINNED_SETS.indexOf(a);
    const bi = PINNED_SETS.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.localeCompare(b);
  }

  // Sets for the filter dropdown, ordered to match the section order.
  $: sets = [...new Set($catalog.map((s) => s.set).filter(Boolean))]
    .sort((a, b) => setCmp(a, b, sortMode));

  // Ids currently staged in the swap (either side) — marked in the grid.
  $: stagedIds = new Set([
    ...Object.keys($session.outgoing),
    ...Object.keys($session.incoming),
  ]);

  $: rows = $catalog
    .map((s) => ({ ...s, count: $collection[s.id] || 0 }))
    .filter((s) => (setFilter === 'all' ? true : s.set === setFilter))
    .filter((s) => {
      if (filter === 'missing') return s.count === 0;
      if (filter === 'have') return s.count >= 1;
      if (filter === 'spares') return s.count >= 2;
      return true;
    })
    .filter((s) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        String(s.id).toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q)
      );
    });

  // Group the visible rows by set. Default order is catalog order; alpha
  // mode sorts sets A–Z but keeps the pinned sets (Special, FWC) on top.
  $: groups = (() => {
    const m = new Map();
    for (const s of rows) {
      const key = s.set || 'Other';
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(s);
    }
    const entries = [...m]; // [ [setName, items[]], ... ]
    entries.sort((a, b) => setCmp(a[0], b[0], sortMode));
    return entries;
  })();

  // Per-set have/total, computed across the whole catalog (ignores filters)
  // so the section header always shows true progress.
  $: setStats = (() => {
    const m = new Map();
    for (const s of $catalog) {
      const key = s.set || 'Other';
      const t = m.get(key) || { have: 0, total: 0 };
      t.total++;
      if (($collection[s.id] || 0) >= 1) t.have++;
      m.set(key, t);
    }
    return m;
  })();

  // Summary across the whole (set-filtered) catalog, ignoring text/state filters.
  $: scope = $catalog.filter((s) => (setFilter === 'all' ? true : s.set === setFilter));
  $: missing = scope.filter((s) => !($collection[s.id] > 0)).length;
  $: have = scope.filter((s) => $collection[s.id] >= 1).length;
  $: spares = scope.reduce((n, s) => n + Math.max(0, ($collection[s.id] || 0) - 1), 0);

  // Live view of the sticker in the open modal.
  $: openItem = openId ? $catalog.find((s) => s.id === openId) : null;
  $: openCount = openId ? ($collection[openId] || 0) : 0;
  $: outQty = openId ? ($session.outgoing[openId] || 0) : 0; // staged in Giving
  $: inQty = openId ? ($session.incoming[openId] || 0) : 0;  // staged in Getting

  // Stage the open sticker into a swap side, starting a session if needed.
  function addToSwap(side) {
    tap();
    if (!$session.active) startSession();
    stage(side, openId, +1);
  }

  function closeModal() {
    openId = null;
  }

  function onKey(e) {
    if (e.key === 'Escape') closeModal();
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="summary card">
  <div><strong>{have}</strong><span>have</span></div>
  <div class="sep"></div>
  <div><strong class="miss">{missing}</strong><span>missing</span></div>
  <div class="sep"></div>
  <div><strong class="spare">{spares}</strong><span>spare{spares === 1 ? '' : 's'}</span></div>
</div>

<div class="controls">
  <input type="search" placeholder="Search by number or name" bind:value={query} />
  <div class="filters">
    {#each ['all', 'missing', 'have', 'spares'] as f}
      <button class:on={filter === f} on:click={() => (filter = f)}>{f}</button>
    {/each}
  </div>
  {#if sets.length}
    <select bind:value={sortMode} aria-label="Sort order">
      <option value="group">Sort by group</option>
      <option value="alpha">Sort A–Z</option>
    </select>
    <select bind:value={setFilter} aria-label="Filter by set">
      <option value="all">All sets</option>
      {#each sets as s}<option value={s}>{s}</option>{/each}
    </select>
  {/if}
</div>

{#if groups.length === 0}
  <p class="empty">Nothing here. Try a different filter.</p>
{:else}
  {#each groups as [name, items] (name)}
    <section class="setblock">
      <header class="sethead">
        <h2>{name === 'Special' ? name : `${codeOf(items[0].id)} (${name})`}</h2>
        {#if setStats.get(name)}
          <span class="setcount">{setStats.get(name).have}/{setStats.get(name).total}</span>
        {/if}
      </header>
      <div class="grid">
        {#each items as s (s.id)}
          <StickerCard
            sticker={s}
            state={stateClass(s.count)}
            badge={s.count >= 2 ? '+' + (s.count - 1) : null}
            staged={stagedIds.has(s.id)}
            label={(s.name || 'Sticker ' + s.id) + (stagedIds.has(s.id) ? ' — in swap' : '')}
            on:click={() => (openId = s.id)}
          />
        {/each}
      </div>
    </section>
  {/each}
{/if}

{#if openItem}
  <!-- key by openId: reopening a different sticker before the close transition
       finishes would otherwise reuse the DOM and keep stale button state -->
  {#key openId}
  <div class="overlay">
    <button
      class="backdrop"
      on:click={closeModal}
      aria-label="Close dialog"
      transition:fade={{ duration: 120 }}
    ></button>
    <div
      class="modal card"
      role="dialog"
      aria-modal="true"
      aria-label={openItem.name || 'Sticker ' + openItem.id}
      transition:scale={{ duration: 140, start: 0.94 }}
    >
      <button
        class="override"
        on:click={() => { tap(); setCount(openItem.id, 0); }}
        disabled={openCount === 0}
        aria-label="Revert to not owned"
        title="Revert to not owned"
      >↺</button>
      <button class="close" on:click={closeModal} aria-label="Close">✕</button>

      <div class="mtag {stateClass(openCount)}">{openItem.id}</div>
      <p class="mname">{openItem.set || openItem.name || 'Sticker ' + openItem.id}</p>

      <p class="mstate {stateClass(openCount)}">
        {#if openCount === 0}Missing
        {:else if openCount === 1}In collection
        {:else}{openCount - 1} spare{openCount - 1 === 1 ? '' : 's'}{/if}
      </p>

      <div class="stepper big">
        <button on:click={() => { tap(); adjust(openItem.id, -1); }} disabled={openCount <= 1} aria-label="Remove one spare">−</button>
        <span class="n">{openCount}</span>
        <button on:click={() => { tap(); adjust(openItem.id, +1); }} aria-label="Add one">+</button>
      </div>

      {#if openCount === 0}
        <button class="swapbtn get" on:click={() => addToSwap('incoming')} disabled={inQty >= 1}>
          {inQty >= 1 ? 'In Getting' : 'Add to Getting'}
        </button>
      {:else if openCount >= 2}
        <button class="swapbtn give" on:click={() => addToSwap('outgoing')} disabled={outQty >= 1}>
          {outQty >= 1 ? 'In Giving' : 'Add to Giving'}
        </button>
      {/if}
    </div>
  </div>
  {/key}
{/if}

<style>
  .summary {
    display: flex; align-items: center; justify-content: space-around;
    padding: 14px; margin-bottom: 12px; text-align: center;
  }
  .summary strong { display: block; font-size: 22px; font-variant-numeric: tabular-nums; }
  .summary span { font-size: 12px; color: var(--muted); }
  .summary .miss { color: var(--miss); }
  .summary .spare { color: var(--spare); }
  .summary .sep { width: 1px; align-self: stretch; background: var(--border); }

  .controls { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .controls input[type='search'] {
    width: 100%; padding: 11px 13px; border: 1px solid var(--border);
    border-radius: 10px; background: var(--surface); color: var(--ink);
  }
  .filters { display: flex; gap: 6px; }
  .filters button {
    flex: 1; text-transform: capitalize; padding: 8px; font-size: 13px; font-weight: 600;
    border: 1px solid var(--border); background: var(--surface); color: var(--muted); border-radius: 9px;
  }
  .filters button.on { color: var(--ink); border-color: var(--ink); }
  select { padding: 9px 11px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--ink); }

  /* ── Set sections ── */
  .setblock { margin-bottom: 20px; }
  .sethead {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 8px; margin: 0 2px 8px; padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
  }
  .sethead h2 { font-size: 15px; margin: 0; letter-spacing: -0.01em; }
  .setcount { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
    gap: 8px;
  }

  .empty { color: var(--muted); text-align: center; padding: 28px; }

  /* ── Detail modal ── */
  .overlay {
    position: fixed; inset: 0; z-index: 50;
    display: grid; place-items: center; padding: 20px;
  }
  .backdrop {
    position: absolute; inset: 0; z-index: 0;
    border: 0; padding: 0; cursor: default;
    background: rgba(9, 14, 20, 0.55);
  }
  .modal {
    position: relative; z-index: 1; width: 100%; max-width: 300px;
    padding: 22px 20px 20px; text-align: center;
  }
  .close {
    position: absolute; top: 10px; right: 10px;
    border: 0; background: transparent; font-size: 16px; color: var(--muted);
    width: 32px; height: 32px; border-radius: 8px;
  }
  .mtag {
    display: inline-grid; place-items: center;
    min-width: 64px; padding: 12px 16px; margin-bottom: 12px;
    border-radius: 12px; font-weight: 700; font-size: 22px;
    font-variant-numeric: tabular-nums;
  }
  .mtag.have { background: var(--have); color: #fff; }
  .mtag.spare { background: var(--spare); color: #fff; }
  .mtag.miss { background: var(--surface-2); border: 1px dashed var(--miss); color: var(--miss); }
  .mname { font-size: 17px; font-weight: 600; margin: 0 0 4px; }
  .mstate { font-size: 13px; font-weight: 600; margin: 0 0 16px; }
  .mstate.have { color: var(--have); }
  .mstate.spare { color: var(--spare); }
  .mstate.miss { color: var(--miss); }

  .override {
    position: absolute; top: 10px; left: 10px;
    width: 32px; height: 32px; border: 0; border-radius: 8px;
    background: transparent; color: var(--miss); font-size: 19px; line-height: 1;
  }
  .override:disabled { color: #c3ccd5; }
  @media (prefers-reduced-motion: no-preference) {
    .override:not(:disabled):active { background: var(--surface-2); }
  }

  .stepper.big { display: inline-flex; }
  .stepper.big button { width: 56px; height: 50px; font-size: 24px; }
  .stepper.big .n { min-width: 52px; font-size: 20px; }

  .swapbtn {
    display: block; width: 100%; margin-top: 14px; padding: 11px;
    border: 1px solid; border-radius: 10px; background: transparent; font-weight: 600;
  }
  .swapbtn.get { color: var(--get); border-color: var(--get); }
  .swapbtn.give { color: var(--give); border-color: var(--give); }
  .swapbtn:disabled { opacity: 0.45; }
</style>
