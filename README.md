# Garage Arcade

A grease-stained, turbo-charged hub for hosting browser games and puzzles —
built with Node.js + Express on the back end and plain HTML/CSS/JS on the
front end (no build step required).

## Quick start

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

## Project layout

```
garage-arcade/
├── server.js              Express server (static files + tiny JSON API)
├── data/
│   └── games.json          The library — every game & puzzle card comes from here
└── public/
    ├── index.html          Main site (Game Bay, Puzzle Workshop, Build Sheet)
    ├── styles.css           Theme: brushed steel, chrome, grease, turbo glow
    ├── script.js            Renders cards from /api/games & /api/puzzles
    └── games/
        ├── voidrunner/      3D space shooter (Three.js)
        └── wiring-match/    ECU wiring memory puzzle
```

## Adding a new game or puzzle

1. Drop your game's files in `public/games/your-game-name/` (an `index.html`
   that runs standalone is simplest).
2. Add an entry to `data/games.json`:

```json
{
  "id": "your-game-name",
  "title": "Your Game Title",
  "tagline": "One-line hook",
  "description": "A couple of sentences for the card.",
  "category": "game",          // or "puzzle"
  "status": "live",             // or "coming-soon"
  "difficulty": 3,               // 1-5, drives the dial on the card
  "tags": ["Tag1", "Tag2"],
  "icon": "turbo",                // turbo | ecu | wheel | wrench | stopwatch | gear
  "url": "/games/your-game-name/index.html"
}
```

3. Restart the server (or just refresh — `games.json` is read on every
   request, no restart needed). The new card appears automatically in the
   Game Bay or Puzzle Workshop, with its difficulty dial and tags.

For a "coming soon" placeholder, set `"status": "coming-soon"` and
`"url": null` — the card will render with a dashed "Coming Soon" badge
instead of a Play button.

## Notes

- `public/script.js` includes a bundled fallback copy of the library, so the
  page still renders correctly even if opened without the Express server
  running (the `/api/*` routes just won't be available in that case).
- Icons are inline SVG, keyed by the `icon` field. Add new ones to the
  `ICONS` map in `public/script.js` if you need more than the six provided.
