import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// For a GitHub Pages *project* site the app is served from
//   https://<user>.github.io/<repo>/
// so `base` MUST be "/<repo>/". Change this to match your repo name.
// (For a *user* site at <user>.github.io, set base to "/".)
export default defineConfig({
  base: '/sticker-tracker/',
  plugins: [svelte()],
});
