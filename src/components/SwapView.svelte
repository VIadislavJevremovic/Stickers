<script>
  import {
    catalog, collection, session, history,
    startSession, setPartner, stage, commitSession, cancelSession,
  } from '../lib/stores.js';
  import AddPicker from './AddPicker.svelte';

  let picker = null; // 'give' | 'get' | null
  let partnerInput = '';

  const nameOf = (id) => {
    const s = $catalog.find((x) => String(x.id) === String(id));
    return s ? (s.name || 'Sticker ' + s.id) : 'Sticker ' + id;
  };

  // Totals for the balance ledger.
  $: giveTotal = Object.values($session.outgoing).reduce((a, b) => a + b, 0);
  $: getTotal = Object.values($session.incoming).reduce((a, b) => a + b, 0);
  $: diff = getTotal - giveTotal; // + means you're receiving more

  // Give options: anything you own. Spares first, then singles (for equalizing).
  // Disabled once you've staged every copy you actually have.
  $: giveOptions = $catalog
    .map((s) => ({ ...s, count: $collection[s.id] || 0 }))
    .filter((s) => s.count >= 1)
    .sort((a, b) => (b.count - 1) - (a.count - 1) || String(a.id).localeCompare(String(b.id)))
    .map((s) => {
      const staged = $session.outgoing[s.id] || 0;
      const remaining = s.count - staged;
      const spare = s.count - 1;
      return {
        id: s.id,
        name: s.name,
        note: spare > 0 ? `${spare} spare` : 'last copy',
        disabled: remaining <= 0,
      };
    });

  // Get options: any catalog sticker; note whether it fills a miss.
  $: getOptions = $catalog.map((s) => {
    const owned = $collection[s.id] || 0;
    return {
      id: s.id,
      name: s.name,
      note: owned === 0 ? 'fills a miss' : `you have ${owned}`,
    };
  });

  function pick(side, id) {
    stage(side, id, +1);
  }

  function begin() {
    startSession(partnerInput.trim());
    partnerInput = '';
  }

  function doCommit() {
    if (confirm('Apply this swap to your collection?')) commitSession();
  }
  function doCancel() {
    if (confirm('Discard this swap? Your collection stays unchanged.')) {
      cancelSession();
      picker = null;
    }
  }
</script>

{#if !$session.active}
  <div class="start card">
    <h2>Start a swap</h2>
    <p class="muted">
      Nothing you stage here touches your collection until you commit — so a
      trade that falls through leaves your counts untouched.
    </p>
    <div class="startrow">
      <input placeholder="Who are you trading with? (optional)" bind:value={partnerInput} />
      <button class="primary" on:click={begin}>Start</button>
    </div>
  </div>

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
  <!-- Live session -->
  <div class="partner card">
    <label>Trading with</label>
    <input value={$session.partner} on:input={(e) => setPartner(e.target.value)} placeholder="name / label" />
  </div>

  <!-- Balance ledger — the running tally that nudges you to equalize -->
  <div class="ledger card" class:even={diff === 0} class:off={diff !== 0}>
    <div class="col"><span class="give">{giveTotal}</span><small>giving</small></div>
    <div class="arrows">⇄</div>
    <div class="col"><span class="get">{getTotal}</span><small>getting</small></div>
    <div class="verdict">
      {#if diff === 0 && giveTotal === 0}Add stickers to each side
      {:else if diff === 0}Even trade
      {:else if diff > 0}They owe {diff} — or add {diff} to your give
      {:else}You owe {-diff} — add {-diff} to your get{/if}
    </div>
  </div>

  <div class="cols">
    <!-- GIVING -->
    <section>
      <div class="sechead give">
        <h3>Giving</h3>
        <button on:click={() => (picker = picker === 'give' ? null : 'give')}>+ Add</button>
      </div>
      {#if picker === 'give'}
        <AddPicker title="Give a sticker" options={giveOptions}
          on:pick={(e) => pick('outgoing', e.detail)} on:close={() => (picker = null)} />
      {/if}
      {#if Object.keys($session.outgoing).length === 0}
        <p class="empty">Pick spares (or any copy) to hand over.</p>
      {:else}
        {#each Object.entries($session.outgoing) as [id, qty] (id)}
          <div class="line card">
            <span class="lid">{id}</span>
            <span class="lname">{nameOf(id)}</span>
            <div class="stepper">
              <button on:click={() => stage('outgoing', id, -1)} aria-label="Give one less">−</button>
              <span class="n">{qty}</span>
              <button on:click={() => stage('outgoing', id, +1)}
                disabled={qty >= ($collection[id] || 0)} aria-label="Give one more">+</button>
            </div>
          </div>
        {/each}
      {/if}
    </section>

    <!-- GETTING -->
    <section>
      <div class="sechead get">
        <h3>Getting</h3>
        <button on:click={() => (picker = picker === 'get' ? null : 'get')}>+ Add</button>
      </div>
      {#if picker === 'get'}
        <AddPicker title="Receive a sticker" options={getOptions}
          on:pick={(e) => pick('incoming', e.detail)} on:close={() => (picker = null)} />
      {/if}
      {#if Object.keys($session.incoming).length === 0}
        <p class="empty">Add whatever you receive.</p>
      {:else}
        {#each Object.entries($session.incoming) as [id, qty] (id)}
          <div class="line card">
            <span class="lid" class:fills={!($collection[id] > 0)}>{id}</span>
            <span class="lname">{nameOf(id)}</span>
            <div class="stepper">
              <button on:click={() => stage('incoming', id, -1)} aria-label="Get one less">−</button>
              <span class="n">{qty}</span>
              <button on:click={() => stage('incoming', id, +1)} aria-label="Get one more">+</button>
            </div>
          </div>
        {/each}
      {/if}
    </section>
  </div>

  <div class="actions">
    <button class="ghost" on:click={doCancel}>Cancel</button>
    <button class="primary" on:click={doCommit}
      disabled={giveTotal === 0 && getTotal === 0}>Commit swap</button>
  </div>
{/if}

<style>
  h2 { font-size: 18px; margin: 0 0 6px; }
  .muted { color: var(--muted); font-size: 14px; }
  .start { padding: 16px; }
  .startrow { display: flex; gap: 8px; margin-top: 12px; }
  .startrow input { flex: 1; padding: 11px 13px; border: 1px solid var(--border); border-radius: 10px; }

  .primary { background: var(--have); color: #fff; border: 0; padding: 11px 18px; border-radius: 10px; font-weight: 600; }
  .primary:disabled { opacity: 0.45; }
  .ghost { background: var(--surface); color: var(--muted); border: 1px solid var(--border); padding: 11px 18px; border-radius: 10px; font-weight: 600; }

  .partner { padding: 12px; margin-bottom: 12px; }
  .partner label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
  .partner input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; }

  .ledger {
    display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
    gap: 6px; padding: 14px; margin-bottom: 14px; text-align: center;
  }
  .ledger .col span { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; display: block; }
  .ledger .col small { color: var(--muted); font-size: 12px; }
  .ledger .give { color: var(--give); }
  .ledger .get { color: var(--get); }
  .ledger .arrows { font-size: 20px; color: var(--muted); }
  .ledger .verdict { grid-column: 1 / -1; font-size: 13px; font-weight: 600; padding-top: 8px; border-top: 1px solid var(--border); margin-top: 4px; }
  .ledger.even .verdict { color: var(--have); }
  .ledger.off .verdict { color: var(--give); }

  .cols { display: flex; flex-direction: column; gap: 18px; }
  .sechead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .sechead h3 { margin: 0; font-size: 15px; }
  .sechead.give h3 { color: var(--give); }
  .sechead.get h3 { color: var(--get); }
  .sechead button { border: 1px solid var(--border); background: var(--surface); border-radius: 9px; padding: 6px 12px; font-weight: 600; font-size: 13px; }

  .line { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 6px; }
  .lid { font-weight: 700; font-variant-numeric: tabular-nums; min-width: 36px; text-align: center; }
  .lid.fills { color: var(--miss); }
  .lname { flex: 1; }
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

  @media (min-width: 560px) {
    .cols { flex-direction: row; }
    .cols section { flex: 1; }
  }
</style>
