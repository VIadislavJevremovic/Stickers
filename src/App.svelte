<script>
  import { onMount } from 'svelte';
  import { catalog, loadCatalog, session } from './lib/stores.js';
  import { storageWorks } from './lib/persist.js';
  import CollectionView from './components/CollectionView.svelte';
  import SwapView from './components/SwapView.svelte';
  import ImportExport from './components/ImportExport.svelte';

  let tab = 'collection';
  let loadError = '';
  const canPersist = storageWorks();

  // Badge on the Swap tab when a session is live.
  $: swapCount =
    Object.values($session.outgoing).reduce((a, b) => a + b, 0) +
    Object.values($session.incoming).reduce((a, b) => a + b, 0);

  onMount(async () => {
    try {
      await loadCatalog();
    } catch (e) {
      loadError = 'Could not load catalog.json. Make sure it exists in /public.';
    }
  });
</script>

<header class="topbar">
  <div class="brand">
    <span class="logo" aria-hidden="true">◪</span>
    <h1>Sticker Tracker</h1>
  </div>
  <ImportExport />
</header>

{#if !canPersist}
  <p class="warn card">
    Storage is blocked here, so changes won't be saved between visits. You're
    probably viewing this from a file:// path — host it or Add to Home Screen.
  </p>
{/if}

{#if loadError}
  <p class="warn card">{loadError}</p>
{/if}

<nav class="tabs">
  <button class:active={tab === 'collection'} on:click={() => (tab = 'collection')}>
    Collection
  </button>
  <button class:active={tab === 'swap'} on:click={() => (tab = 'swap')}>
    Swap
    {#if $session.active || swapCount > 0}
      <span class="tabbadge">{swapCount}</span>
    {/if}
  </button>
</nav>

<main>
  {#if $catalog.length === 0 && !loadError}
    <p class="muted">Loading catalog…</p>
  {:else if tab === 'collection'}
    <CollectionView />
  {:else}
    <SwapView />
  {/if}
</main>

<style>
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; padding: 14px 16px calc(14px + env(safe-area-inset-top));
    max-width: 720px; margin: 0 auto;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .logo {
    display: grid; place-items: center; width: 30px; height: 30px;
    background: var(--have); color: #fff; border-radius: 8px; font-size: 16px;
  }
  h1 { font-size: 19px; margin: 0; letter-spacing: -0.02em; }

  .warn {
    max-width: 720px; margin: 0 auto 12px; padding: 12px 14px;
    color: #7a3a17; background: #fff4e6; border-color: #f2d5ac; font-size: 14px;
  }

  .tabs {
    display: flex; gap: 8px; max-width: 720px;
    margin: 0 auto 4px; padding: 0 16px;
  }
  .tabs button {
    flex: 1; padding: 10px; border: 1px solid var(--border);
    background: var(--surface); color: var(--muted);
    border-radius: 10px; font-weight: 600; position: relative;
  }
  .tabs button.active { color: var(--ink); border-color: var(--have); box-shadow: inset 0 -2px 0 var(--have); }
  .tabbadge {
    background: var(--give); color: #fff; border-radius: 999px;
    font-size: 12px; padding: 1px 7px; margin-left: 6px;
  }

  main { max-width: 720px; margin: 0 auto; padding: 12px 16px calc(28px + env(safe-area-inset-bottom)); }
  .muted { color: var(--muted); text-align: center; padding: 28px; }
</style>
