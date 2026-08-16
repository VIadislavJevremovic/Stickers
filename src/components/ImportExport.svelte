<script>
  import { get } from 'svelte/store';
  import { collection, exportData, parseImport } from '../lib/stores.js';

  let open = false;
  let fileInput;
  let msg = '';

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

  async function onFile(e) {
    msg = '';
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const result = parseImport(text);
    if (!result.ok) {
      msg = result.error; // keep the menu open so the error is visible
    } else {
      if (confirm('Replace your current collection with the imported one?')) {
        collection.set(result.collection);
      }
      msg = '';
      open = false; // dismiss the Backup menu whether confirmed or cancelled
    }
    fileInput.value = '';
  }
</script>

<div class="wrap">
  <button class="trigger" on:click={() => (open = !open)} aria-expanded={open}>Backup</button>
  {#if open}
    <div class="menu card">
      <button on:click={download}>Export to file</button>
      <button on:click={() => fileInput.click()}>Import from file</button>
      {#if msg}<p class="msg">{msg}</p>{/if}
      <input bind:this={fileInput} type="file" accept="application/json,.json" on:change={onFile} hidden />
    </div>
  {/if}
</div>

<style>
  .wrap { position: relative; }
  .trigger { border: 1px solid var(--border); background: var(--surface); border-radius: 10px; padding: 8px 14px; font-weight: 600; color: var(--ink); }
  .menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 10; padding: 8px; display: flex; flex-direction: column; gap: 6px; min-width: 190px; }
  .menu button { text-align: left; border: 0; background: transparent; padding: 9px 10px; border-radius: 8px; color: var(--ink); }
  .menu button:active { background: var(--surface-2); }
  .msg { font-size: 12px; color: var(--muted); margin: 4px 8px 2px; }
</style>
