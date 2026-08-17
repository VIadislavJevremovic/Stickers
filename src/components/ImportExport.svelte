<script>
  import { get } from 'svelte/store';
  import { collection, exportData, parseImport, cancelSession } from '../lib/stores.js';

  let open = false;
  let fileInput;

  function download() {
    const data = exportData(get(collection));
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stickers-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    open = false; // dismiss the Backup menu after exporting
  }

  function startImport() {
    open = false; // dismiss immediately, whatever happens with the picker
    fileInput.click();
  }

  async function onFile(e) {
    const file = e.target.files[0];
    fileInput.value = '';
    if (!file) return;
    const result = parseImport(await file.text());
    if (!result.ok) {
      alert(result.error); // menu is already closed, so surface via alert
    } else if (confirm('Replace your current collection with the imported one?')) {
      collection.set(result.collection);
      cancelSession(); // a fresh collection invalidates any in-progress swap
    }
  }
</script>

<div class="wrap">
  <button class="trigger" on:click={() => (open = !open)} aria-expanded={open}>Backup</button>
  {#if open}
    <div class="menu card">
      <button on:click={download}>Export to file</button>
      <button on:click={startImport}>Import from file</button>
    </div>
  {/if}
  <!-- kept outside the menu so it survives the menu closing on tap -->
  <input bind:this={fileInput} type="file" accept="application/json,.json" on:change={onFile} hidden />
</div>

<style>
  .wrap { position: relative; }
  .trigger { border: 1px solid var(--border); background: var(--surface); border-radius: 10px; padding: 8px 14px; font-weight: 600; color: var(--ink); }
  .menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 10; padding: 8px; display: flex; flex-direction: column; gap: 6px; min-width: 190px; }
  .menu button { text-align: left; border: 0; background: transparent; padding: 9px 10px; border-radius: 8px; color: var(--ink); }
  .menu button:active { background: var(--surface-2); }
</style>
