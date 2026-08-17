<script>
  import { codeOf, numOf } from '../lib/sticker.js';

  export let sticker;        // { id, set?, name? }
  export let state;          // 'have' | 'spare' | 'miss'
  export let badge = null;   // optional top-right badge text (spares / staged qty)
</script>

<button class="cell {state}" on:click title={sticker.name || 'Sticker ' + sticker.id}>
  {#if sticker.set === 'Special' || !codeOf(sticker.id)}
    <span class="cid">{sticker.id}</span>
    {#if badge}<span class="dupe">{badge}</span>{/if}
  {:else}
    <div class="ctop">
      <span class="ccode">{codeOf(sticker.id)}</span>
      {#if badge}<span class="dupe">{badge}</span>{/if}
    </div>
    <span class="cnum">{numOf(sticker.id)}</span>
  {/if}
</button>

<style>
  .cell {
    position: relative;
    aspect-ratio: 3 / 4;
    display: grid; place-items: center;
    width: 100%;
    border-radius: 10px; border: 1px solid var(--border);
    background: var(--surface); color: var(--ink);
    padding: 2px;
  }
  .cid { font-weight: 700; font-size: 14px; font-variant-numeric: tabular-nums; }
  .ccode { font-size: 10px; font-weight: 700; letter-spacing: 0.02em; opacity: 0.8; }
  .cnum { font-size: 21px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .ctop {
    position: absolute; top: 4px; left: 6px; right: 6px;
    display: flex; align-items: center; justify-content: space-between; gap: 4px;
  }
  .cell.have { background: var(--have); border-color: var(--have); color: #fff; }
  .cell.spare { background: var(--spare); border-color: var(--spare); color: #fff; }
  .cell.miss { background: var(--surface-2); border: 1px dashed var(--miss); color: var(--miss); }
  .dupe {
    position: absolute; top: 3px; right: 3px;
    font-size: 10px; font-weight: 700; line-height: 1;
    padding: 2px 4px; border-radius: 6px;
    background: rgba(0, 0, 0, 0.28); color: #fff;
  }
  .ctop .dupe { position: static; }
  @media (prefers-reduced-motion: no-preference) {
    .cell:active { transform: scale(0.95); }
  }
</style>
