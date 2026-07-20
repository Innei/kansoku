---
name: journal-discipline
description: >
  Write-rules for the `journal/` and `stocks/` directories — trading-day
  file naming, append-not-overwrite for same-day re-runs, and per-symbol
  notes that grow incrementally instead of being rewritten. Injected into
  the app-side judgment agents alongside [[trading-discipline]].
---

# Journal & Notes Discipline

> Maintained separately from [[trading-discipline]]. This file covers only how to write into `journal/` and `stocks/`. Core cross-context trading priors live in `trading-discipline`.

---

## E. Journal and Notes Conventions (applies to any agent that reads the account or writes journal / stocks notes)

**TD-JOURNAL-01 — Journal file names use the US trading day; same-day re-runs append a section, never overwrite.** The date in the filename is the US trading day, not the Asian local calendar day.

**TD-NOTES-01 — `stocks/{SYMBOL}.md` grows incrementally; do not rewrite the whole file.** Add new events to the relevant section; delete only paragraphs that are clearly stale. Tickers and CLI / API names stay in English.
