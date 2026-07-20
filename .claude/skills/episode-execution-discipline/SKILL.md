---
name: episode-execution-discipline
description: >
  Bench-episode-specific execution discipline — flip cooldown counted in h1 bars,
  the 40-session decision-cadence expectation, and the mandatory multi-period
  fetch before every submit. These rules depend on runtime primitives that only
  exist inside the bench episode adapter (h1 clock, fixed replay horizon,
  fetch_kline tool). Injected only when running the bench episode runner;
  the app-side agents skip them because they have no equivalent runtime.
---

# Episode Execution Discipline (Bench-only)

> Companion to [[trading-discipline]]. This file exists because three execution rules only make sense inside the bench episode adapter, which has:
>
> - A single-h1 replay clock and explicit bar indices `B0, B1, ..., Bn`.
> - A fixed 40-session replay horizon per case.
> - A `fetch_kline` tool that the agent must call to refresh multi-period structure.
>
> The app-side judgment agents (analyst / deepDive / chat) do not have those primitives — they receive a pre-built multi-period data pack, they operate on user-scoped questions with no session-count semantics, and they emit advice rather than sequenced orders. Injecting these three rules into app agents is pure noise, so `packages/core/src/ai/promptPolicy.ts`'s `BENCH_ONLY_DISCIPLINE_SKILLS` list keeps them scoped to bench only.

---

## F.bench — Bench Execution Rules

**TD-FLIP-01 — Flip cooldown.** After closing a position:
- Same-direction re-entry: minimum **5 h1 bars** wait.
- Opposite-direction re-entry: minimum **10 h1 bars** wait, AND the new submit's reason must cite specific evidence of a structural reversal (price / bar index / structure name, see TD-REASON-01 in [[trading-discipline]]).
- **Never exit and immediately reverse within the same bar.**

**TD-CADENCE-01 — Decision cadence.** A 40-session (swing) window should yield **1–4 submits** in normal conditions. More than 5 is an over-trading flag — every additional submit's reason must explicitly explain "why this is a new opportunity rather than a rehearsal of an old idea".

**TD-CTX-01 — Multi-period evidence before any submit.** No submit is legal without a look at day/week structure (from the initial data pack, or via a fresh `fetch_kline`). **Basing a submit on h1 structure alone is a violation.** The reason must cite at least one day-or-week-level fact (e.g. "day EMA20 rising", "week prior-high 145 intact").

---

## Related

- [[trading-discipline]] — the shared core discipline covering TD-TREND-01, TD-RR-01, TD-EXIT-01, TD-REASON-01, and all output / judgment rules that both bench and app-side agents obey.
