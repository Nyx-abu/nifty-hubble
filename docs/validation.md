# Validation: 2026-10-04

The infinite canvas has been replaced with one phone-sized grid and separate Draw, Memory cues, and History pages. Explicit result actions record tries; history correction edits the latest result without adding a try. Mobile result buttons stay above the bottom navigation.

## Automated checks

- `npm test`: 30 passing regression tests covering Android midpoint rules, directional identity, legal and unique suggestions, history-aware ranking, retry weights, family labels, history validation/migration, stable IDs, idempotent backups, and swept pointer geometry.
- `npm run lint`: clean.
- `npm run build`: clean, with separately loaded prediction/history page chunks.
- `scripts/browser-qa.mjs`: 11 passing browser checks through gstack `/browse`. Covers drawing without saving, duplicates/repeated outcomes, refresh persistence, keyboard entry, untested records, actual backup upload/export, outcome correction, gallery regeneration/loading, pointer cancellation/capture loss, corrupted-storage protection, and all pages at 320/375/768/1440px.
- Visual review: light/dark mobile drawing and desktop prediction gallery screenshots. Screenshots and machine-readable results are saved locally under ignored `.gstack/`.

Clicks, keyboard entry, and upload exercise browser input. Gesture geometry and React event bindings use synthetic PointerEvents with capture stubbed for that synthetic pointer. This is not a physical-device certification.

## Review fixes and reusable guardrails

Review found and fixed repeated-import count inflation, stale imported outcomes, conflicting record IDs, duplicate numeral routes, misleading custom-retry labels, a slow-drag threshold measured per event, and small mobile/tablet targets. The tests and browser harness now check these behaviors.

Fixed-position mobile controls require an ancestor without a persistent CSS transform. The drawing page disables its entry transform on mobile, and the browser harness asserts that the result button remains inside the viewport.

## Prediction scope

Suggestions are local qualitative memory cues. Public research supports selection biases and some recognizable motifs; the remaining alphabet/numeral shapes are curated. No raw participant corpus or calibrated phone-unlock probability is claimed. See [ADR-001](adr/ADR-001-pattern-notebook.md) for the source and trade-offs.
