<script>
  import {
    catalog, collection, session, history,
    startSession, stage, commitSession, cancelSession,
  } from '../lib/stores.js';
  import { tap } from '../lib/haptics.js';
  import { stateClass } from '../lib/sticker.js';
  import StickerCard from './StickerCard.svelte';

  const stickerOf = (id) => $catalog.find((x) => String(x.id) === String(id)) || { id };

  // Totals for the balance ledger.
  $: giveTotal = Object.values($session.outgoing).reduce((a, b) => a + b, 0);
  $: getTotal = Object.values($session.incoming).reduce((a, b) => a + b, 0);

  function begin() {
    startSession();
  }

  // Tap a staged card to take one copy back off that side.
  function unstage(side, id) {
    tap();
    stage(side, id, -1);
  }

  function doCommit() {
    if (confirm('Apply this swap to your collection?')) commitSession();
  }
  function doCancel() {
    if (confirm('Discard this swap? Your collection stays unchanged.')) cancelSession();
  }
</script>

{#if !$session.active}
  <button class="primary start" on:click={begin}>Start a swap</button>

  {#if $history.length}
    <h3 class="histhead">Recent swaps</h3>
    <ul class="hist">
      {#each $history.slice(0, 8) as h}
        <li class="card">
          <div class="histtop">
            <strong>{h.partner || 'Someone'}</strong>
            <span class="muted">{new Date(h.when).toLocaleDateString()}</span>
          </div>
          <div class="histbody">
            <span class="give">gave {Object.values(h.gave).reduce((a, b) => a + b, 0)}</span>
            <span class="get">got {Object.values(h.got).reduce((a, b) => a + b, 0)}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
{:else}
  <!-- Balance ledger — the running tally of each side. -->
  <div class="ledger card">
    <div class="col"><span class="give">{giveTotal}</span><small>giving</small></div>
    <div class="arrows">⇄</div>
    <div class="col"><span class="get">{getTotal}</span><small>getting</small></div>
  </div>

  <section>
    <h3 class="give">Giving <span class="hint">tap to remove</span></h3>
    {#if giveTotal === 0}
      <p class="empty">Add spares from a sticker in the Collection tab.</p>
    {:else}
      <div class="grid">
        {#each Object.entries($session.outgoing) as [id, qty] (id)}
          <StickerCard
            sticker={stickerOf(id)}
            state={stateClass($collection[id] || 0)}
            badge={qty > 1 ? '×' + qty : null}
            on:click={() => unstage('outgoing', id)}
          />
        {/each}
      </div>
    {/if}
  </section>

  <section>
    <h3 class="get">Getting <span class="hint">tap to remove</span></h3>
    {#if getTotal === 0}
      <p class="empty">Add missing ones from the Collection tab.</p>
    {:else}
      <div class="grid">
        {#each Object.entries($session.incoming) as [id, qty] (id)}
          <StickerCard
            sticker={stickerOf(id)}
            state={stateClass($collection[id] || 0)}
            badge={qty > 1 ? '×' + qty : null}
            on:click={() => unstage('incoming', id)}
          />
        {/each}
      </div>
    {/if}
  </section>

  <div class="actions">
    <button class="ghost" on:click={doCancel}>Cancel</button>
    <button class="primary" on:click={doCommit}
      disabled={giveTotal === 0 && getTotal === 0}>Commit</button>
  </div>
{/if}

<style>
  .muted { color: var(--muted); font-size: 14px; }

  .primary { background: var(--have); color: #fff; border: 0; padding: 11px 18px; border-radius: 10px; font-weight: 600; }
  .primary:disabled { opacity: 0.45; }
  .ghost { background: var(--surface); color: var(--muted); border: 1px solid var(--border); padding: 11px 18px; border-radius: 10px; font-weight: 600; }

  .start { display: block; width: 100%; padding: 13px; font-size: 15px; }

  .ledger {
    display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
    gap: 6px; padding: 14px; margin-bottom: 16px; text-align: center;
  }
  .ledger .col span { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; display: block; }
  .ledger .col small { color: var(--muted); font-size: 12px; }
  .ledger .give { color: var(--give); }
  .ledger .get { color: var(--get); }
  .ledger .arrows { font-size: 20px; color: var(--muted); }

  section { margin-bottom: 18px; }
  section h3 { margin: 0 0 8px; font-size: 15px; display: flex; align-items: baseline; gap: 8px; }
  section h3.give { color: var(--give); }
  section h3.get { color: var(--get); }
  .hint { font-size: 12px; font-weight: 400; color: var(--muted); }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
    gap: 8px;
  }
  .empty { color: var(--muted); font-size: 14px; padding: 6px 2px 10px; }

  .actions { display: flex; gap: 10px; margin-top: 20px; }
  .actions .ghost { flex: 1; }
  .actions .primary { flex: 2; }

  .histhead { font-size: 14px; color: var(--muted); margin: 18px 0 8px; }
  .hist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .hist li { padding: 10px 12px; }
  .histtop { display: flex; justify-content: space-between; }
  .histbody { display: flex; gap: 14px; margin-top: 2px; font-size: 13px; font-weight: 600; }
  .histbody .give { color: var(--give); }
  .histbody .get { color: var(--get); }
</style>
