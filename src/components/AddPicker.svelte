<script>
  import { createEventDispatcher } from 'svelte';
  export let title = 'Add';
  export let options = []; // [{ id, name, note, disabled }]
  const dispatch = createEventDispatcher();
  let query = '';

  $: shown = options.filter((o) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return String(o.id).toLowerCase().includes(q) || (o.name || '').toLowerCase().includes(q);
  });
</script>

<div class="sheet card">
  <div class="head">
    <strong>{title}</strong>
    <button class="close" on:click={() => dispatch('close')} aria-label="Close">✕</button>
  </div>
  <input type="search" placeholder="Search number or name" bind:value={query} />
  <div class="scroll">
    {#each shown as o (o.id)}
      <button class="opt" disabled={o.disabled} on:click={() => dispatch('pick', o.id)}>
        <span class="oid">{o.id}</span>
        <span class="oname">{o.name || 'Sticker ' + o.id}</span>
        {#if o.note}<span class="onote">{o.note}</span>{/if}
      </button>
    {:else}
      <p class="none">No matches.</p>
    {/each}
  </div>
</div>

<style>
  .sheet { padding: 12px; margin-bottom: 12px; }
  .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .close { border: 0; background: transparent; font-size: 16px; color: var(--muted); }
  input[type='search'] { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 8px; }
  .scroll { max-height: 46vh; overflow: auto; display: flex; flex-direction: column; gap: 4px; }
  .opt {
    display: flex; align-items: center; gap: 10px; text-align: left;
    padding: 9px 10px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface); color: var(--ink);
  }
  .opt:disabled { opacity: 0.4; }
  .oid { font-weight: 700; font-variant-numeric: tabular-nums; min-width: 36px; }
  .oname { flex: 1; }
  .onote { font-size: 12px; color: var(--spare); font-weight: 600; }
  .none { color: var(--muted); text-align: center; padding: 16px; }
</style>
