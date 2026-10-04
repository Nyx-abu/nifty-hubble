# Pattern Notebook

A responsive Android-pattern memory notebook. Draw one pattern at a time, keep an honest record of attempts, and explore familiar shapes that might jog your memory.

[Live site](https://nifty-hubble-mu.vercel.app) · [GitHub](https://github.com/Nyx-abu/nifty-hubble)

## Using the notebook

- **Draw:** use the single 3×3 phone grid. Drag a continuous path or use tap/keyboard entry. Android rules automatically include an unvisited middle dot when a line crosses it. Patterns require four to nine unique dots.
- **Record:** choose **Failed**, **Worked**, or **Save untested**. Drawing alone does not record an attempt. The same directional sequence shows its previous result; recording another result updates the existing record and retry count.
- **Memory cues:** browse letter, number, and geometric routes on a separate page. Generate another set, filter by shape family, learn from saved history, or deliberately include failed retries. Loading a suggestion does not save it or count as trying it.
- **History:** review results and repeated outcomes, add notes, load a saved path, and import/export JSON backups. Old canvas history is retained using the original storage key.

All pattern history stays in this browser. No model API, analytics upload, or backend receives it. Export a backup before switching browsers/devices or clearing site data. Light and dark themes, narrow-screen navigation, reduced-motion styles, and keyboard controls are included.

## How familiarity suggestions work

The local TypeScript engine expands curated motifs into legal rotations, reflections, and reversed directions, then removes duplicate routes. Direction matters: a reversed route is a different Android pattern.

Ranking combines qualitative starting-point and shape priors with the starting dots, lengths, turns, ordered connections, motif families, and repeat counts in saved history. A bounded seeded variation supplies fresh batches. Saved patterns are excluded by default; only previously failed routes can return through the explicit retry option.

[Aviv and Dürmuth's survey comparing nine pattern datasets](https://arxiv.org/abs/1811.10548) documents human selection biases, a common Z-shaped pattern, and Android drawing rules. Other letter/number motifs are hand-curated memory cues. The app does not train on the study's raw participant data or estimate the probability of unlocking a phone.

## Development

Requires Node.js 22.15+ and npm. There are no new runtime dependencies beyond React, Zustand, and Lucide already used by the app.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For a fixed loopback address:

```sh
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort
```

```sh
npm test
npm run lint
npm run build
npm run preview
```

Tests use Node's built-in test runner and TypeScript stripping. Node 22 may print an experimental-feature notice; no separate test dependency is needed.

For a reproducible browser check with gstack `/browse`, start the local Vite server and run:

```sh
node scripts/browser-qa.mjs /path/to/gstack/browse http://127.0.0.1:5174/
```

On Windows, pass the path to `browse.exe`. The harness uses temporary fixtures, restores the browser's original notebook storage, checks responsive controls, and saves screenshots/results in the ignored `.gstack/` directory. Pointer geometry uses synthetic browser events; clicks, keyboard entry, and JSON upload use browser input.

## Structure

```text
src/
  components/       Single grid, read-only previews, Draw/Memory cues/History pages
  domain/           Framework-independent pattern rules, ranking, history validation
  store.ts          Local persistence and explicit outcome recording
  App.tsx           Navigation and lazy page loading
tests/              Drawing-rule, prediction, and history regression tests
docs/adr/           Design decision and research provenance
```

The app builds as a static Vite site. Hash-based navigation works without server route rewrites. [ADR-001](docs/adr/ADR-001-pattern-notebook.md) explains the data and predictor trade-offs.
