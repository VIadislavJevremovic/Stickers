# Sticker Tracker

A personal, fully-static sticker collection + live-swap tracker. No backend, no
accounts, no shared database — everything lives in your browser's
`localStorage`, and you back it up with an export file. Built with Svelte +
Vite, deploys to GitHub Pages, installs to the iOS Home Screen as a PWA.

## What it does

- **Collection** — a grid of sticker cards grouped by set, each showing
  *missing*, *have*, or *spare*. Tap a card for a detail sheet with a `+ / −`
  stepper (owned stickers keep their album copy — only spares come off) and a
  revert button. Filter by state or set, search by number/name, sort by group
  or A–Z. Live counts of have / missing / spares.
- **Swap** — a staging area for a live trade. You stage stickers from the
  Collection: open a sticker and **Add to Giving** (offered for your spares)
  or **Add to Getting** (offered for missing ones) — at most one per sticker
  per side. The Swap tab shows both sides as cards (tap one to take it back),
  the running balance, and per-side counts on the tab itself. **Commit**
  applies the trade; **Cancel** throws it away, collection untouched. The
  session is saved as you go, so closing the app mid-trade doesn't lose it.
  Staged stickers are marked with diagonal stripes in the Collection grid.
- **Backup** — export your collection to a JSON file and re-import it (to move
  between your own devices, or just as a safety net since `localStorage` isn't
  permanent).
- **Dark mode** — follows your system appearance automatically.

## Run locally

```bash
npm install
npm run dev
```

## Your catalog

Replace `public/catalog.json` with your real set. It's an array; only `id` is
required:

```json
[
  { "id": "1", "name": "Team Captain", "set": "Series A" },
  { "id": "2", "name": "Goalkeeper",   "set": "Series A" }
]
```

- `name` (optional) shows next to the number.
- `set` (optional) turns on a set filter/grouping. Omit it entirely if your
  collection is one flat set.

The catalog is reference data shared by everyone; your personal ownership is the
only thing kept in `localStorage`, keyed by `id`. Keep the ids stable — if you
renumber the catalog later, existing saved counts won't line up.

## Deploy to GitHub Pages

1. Create a repo and push this project to the `main` branch.
2. Set the base path: in `vite.config.js` change `base` to `'/<your-repo>/'`
   (e.g. `'/sticker-tracker/'`). For a user site at `<you>.github.io`, use
   `'/'`.
3. In the repo: **Settings → Pages → Build and deployment → Source =
   GitHub Actions**.
4. Push. The included workflow (`.github/workflows/deploy.yml`) builds and
   publishes automatically. Your app appears at
   `https://<you>.github.io/<your-repo>/`.

## Install on iPhone

Open the deployed URL in **Safari** → Share → **Add to Home Screen**. It then
launches full-screen, works offline (service worker), and — because it's a real
`https://` origin — persists your data. (Opening the raw `.html` from the Files
app will *not* persist; Safari blocks storage on `file://`.)

## Notes on persistence

`localStorage` on iOS Safari can be evicted after long periods of no use
(Intelligent Tracking Prevention). Installing to the Home Screen gives the app
its own, more durable storage bucket — but export a backup now and then anyway.
