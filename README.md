# Mizpah

**A standalone log browser for the family trace stream** — *"the Lord watch between us"* (Gen 31:49). A watchtower over what the family's tools actually did.

Mizpah is the cross-project viewer for the structured trace/event log emitted by
[Tirzah](https://github.com/gellsmore-svg/tirzah) (and, in time, Mahalath, Hoglah,
Cairn, Milcah). It lets you **browse sessions** — not just the one you're currently
in — and inspect a session's full request lifecycle.

It pairs with the per-conversation dev-log popup in
[Mahlah](https://github.com/gellsmore-svg/Mahlah): that shows the *current* session
inline; Mizpah is where you go to find and read *any* session after the fact.

## What it does

- **Session list** (left): every session in the trace store, with its sources,
  request/event counts, first query, and last activity — filterable by id, query,
  or source.
- **Session detail** (right): the full event timeline for the selected session
  (timestamp, status, type, source, summary, metadata, ids), with a **live tail**
  toggle and copy-all-as-JSON.

E-ink-friendly by default (high-contrast monochrome, no animation), matching the
family UIs.

## Running it

```bash
# Tirzah backend (serves the trace API) on :8765
cd ../tirzah && tirzah serve
# Mizpah
npm install && npm run dev   # http://localhost:5274  (proxies /api -> :8765)
```
Override the trace API with `VITE_TRACE_API`.

## Trace API it consumes

- `GET /api/trace/sessions` → session summaries
- `GET /api/trace/events?session_id=…|trace_id=…` → a session/trace's events
- `GET /api/trace/stream?session_id=…&replay=true` → live tail (SSE)

## Scope / status

**This repo starts as the viewer** — the missing "browse any session" interface.

The trace **library** (emit/record/stream) currently lives single-source in Tirzah
(`tirzah/trace/`, extraction-ready: zero Tirzah imports, `source`-parameterized). It
will **move here** when a second project needs to emit, so all family tools import
one library — deliberately not duplicated now. A central **collector** service
(receive events from any project) is a later addition; today Mizpah reads Tirzah's
trace API directly.
