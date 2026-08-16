<script>
  import { catalog, collection, adjust } from '../lib/stores.js';
  import { fade, scale } from 'svelte/transition';

  let filter = 'all';       // all | missing | have | spares
  let query = '';
  let setFilter = 'all';
  let openId = null;        // sticker whose detail modal is open

  // If catalog items carry a `set` field, offer a set filter.
  $: sets = [...new Set($catalog.map((s) => s.set).filter(Boolean))];

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

  // Group the visible rows by set, preserving catalog order.
  $: groups = (() => {
    const m = new Map();
    for (const s of rows) {
      const key = s.set || 'Other';
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(s);
    }
    return [...m]; // [ [setName, items[]], ... ]
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

  function stateClass(count) {
    if (count === 0) return 'miss';
    if (count >= 2) return 'spare';
    return 'have';
  }

  function onKey(e) {
    if (e.key === 'Escape') openId = null;
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
        <h2>{name}</h2>
        {#if setStats.get(name)}
          <span class="setcount">{setStats.get(name).have}/{setStats.get(name).total}</span>
        {/if}
      </header>
      <div class="grid">
        {#each items as s (s.id)}
          <button
            class="cell {stateClass(s.count)}"
            on:click={() => (openId = s.id)}
            title={s.name || 'Sticker ' + s.id}
          >
            <span class="cid">{s.id}</span>
            {#if s.count >= 2}<span class="dupe">+{s.count - 1}</span>{/if}
          </button>
        {/each}
      </div>
    </section>
  {/each}
{/if}

{#if openItem}
  <div
    class="backdrop"
    on:click={() => (openId = null)}
    transition:fade={{ duration: 120 }}
  >
    <div
      class="modal card"
      role="dialog"
      aria-modal="true"
      aria-label={openItem.name || 'Sticker ' + openItem.id}
      on:click|stopPropagation
      transition:scale={{ duration: 140, start: 0.94 }}
    >
      <button class="close" on:click={() => (openId = null)} aria-label="Close">✕</button>

      <div class="mtag {stateClass(openCount)}">{openItem.id}</div>
      <p class="mname">{openItem.set || openItem.name || 'Sticker ' + openItem.id}</p>

      <p class="mstate {stateClass(openCount)}">
        {#if openCount === 0}Missing
        {:else if openCount === 1}In collection
        {:else}{openCount - 1} spare{openCount - 1 === 1 ? '' : 's'}{/if}
      </p>

      <div class="stepper big">
        <button on:click={() => adjust(openItem.id, -1)} disabled={openCount === 0} aria-label="Remove one">−</button>
        <span class="n">{openCount}</span>
        <button on:click={() => adjust(openItem.id, +1)} aria-label="Add one">+</button>
      </div>
    </div>
  </div>
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
  /* Portrait sticker boxes (w < h). */
  .cell {
    position: relative;
    aspect-ratio: 3 / 4;
    display: grid; place-items: center;
    border-radius: 10px; border: 1px solid var(--border);
    background: var(--surface); color: var(--ink);
    padding: 2px;
  }
  .cid { font-weight: 700; font-size: 14px; font-variant-numeric: tabular-nums; }
  .cell.have { background: var(--have); border-color: var(--have); color: #fff; }
  .cell.spare { background: var(--spare); border-color: var(--spare); color: #fff; }
  .cell.miss { background: var(--surface-2); border: 1px dashed var(--miss); color: var(--miss); }
  .dupe {
    position: absolute; top: 3px; right: 3px;
    font-size: 10px; font-weight: 700; line-height: 1;
    padding: 2px 4px; border-radius: 6px;
    background: rgba(0, 0, 0, 0.28); color: #fff;
  }
  @media (prefers-reduced-motion: no-preference) {
    .cell:active { transform: scale(0.95); }
  }

  .empty { color: var(--muted); text-align: center; padding: 28px; }

  /* ── Detail modal ── */
  .backdrop {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(9, 14, 20, 0.55);
    display: grid; place-items: center; padding: 20px;
  }
  .modal {
    position: relative; width: 100%; max-width: 300px;
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

  .stepper.big { display: inline-flex; }
  .stepper.big button { width: 56px; height: 50px; font-size: 24px; }
  .stepper.big .n { min-width: 52px; font-size: 20px; }
</style>
