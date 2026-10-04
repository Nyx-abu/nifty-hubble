# ADR-001: A single pattern grid and local familiarity suggestions

## Status: Accepted

## Context

The infinite canvas makes phone-sized interaction awkward and allows gestures to travel between visual grids. Outcome recording is separated from the pattern being tried. Existing pattern history is stored in this browser and must survive the redesign.

## Decision

Replace the canvas with one bounded, responsive 3×3 grid. Use Android's directional, unique-dot rules, including automatic insertion of unvisited midpoint dots. Drawing and loading a suggestion do not record an attempt. Explicit Failed or Worked actions record outcomes; Save untested keeps a memory cue without asserting a result.

Provide separate Draw, Predictions, and History pages. Generate legal letter, number, and shape motifs locally, with mirrored, rotated, and reversed variants. Rank them using qualitative population priors and similarity to saved history. Refresh changes the exploration batch; an explicit retry option admits previously failed patterns. Previously successful and saved untested patterns remain excluded from suggestions.

Keep the original browser-storage key and accept old history records. Use sequence identity rather than former canvas coordinates. Imports are validated, exports provide a portable backup, and repeat imports must be idempotent. Surface persistence failures instead of silently losing data.

## Consequences

Touch, mouse, and keyboard interaction share one bounded drawing surface. No external model service or new runtime dependency is required, and private patterns remain local. Suggestions offer recognizable memory cues, not calibrated unlock probabilities. A curated motif library covers a finite set of plausible patterns rather than every legal Android path. Clearing browser storage or changing browser/device requires an exported backup.

## Evidence and limits

[Aviv and Dürmuth, A Survey of Collection Methods and Cross-Data Set Comparison of Android Unlock Patterns (2018)](https://arxiv.org/abs/1811.10548) compares nine datasets, illustrates a common Z-shaped pattern, describes Android drawing constraints, and observes preference for upper-left starts and lower-right ends. It also shows that collection methods affect length-related properties. These findings justify qualitative priors, not precise frequency claims for this user's pattern.

Other alphabet and numeral templates are hand-curated shape interpretations. The app does not contain the paper's raw participant dataset and is not a trained or statistically calibrated reproduction of its model.
