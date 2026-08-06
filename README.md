# Mizpah

**A standalone log browser for the family trace stream** — *"the Lord watch between us"* (Gen 31:49). A watchtower over what the family's tools actually did.

Mizpah is the cross-project viewer for the structured trace/event log emitted by
[Tirzah](https://github.com/gellsmore-svg/tirzah) (and, in time, Mahalath, Hoglah,
Deborah, Huldah, Milcah). It lets you **browse sessions** — not just the one you're currently
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
- **LLM Calls** (tab): the family **debugging view** — every captured model call
  as clean In→Out cards grouped by trace, chains nested via `parent_call_id`,
  full-text search, source filter, clamp/expand for long payloads, and a
  persisted **Advanced** toggle for the technical layer (model, duration,
  metadata). Reads galeed's `llm_calls` store.

## Backend

Mizpah's dev proxy points at **`galeed serve`** (the family trace API, default
`http://localhost:8785`) — run `galeed serve` (`pip install galeed[web]`) against
the shared Mongo. Override with `VITE_TRACE_API` (e.g. a running Tirzah on
`:8765` speaks the same `/api/trace/*` shapes, minus `/api/llm-calls`).

E-ink-friendly by default (high-contrast monochrome, no animation), matching the
family UIs.

## Running it

```bash
# Preferred: Galeed family trace API on :8785
cd ../Galeed && galeed serve
# Mizpah (http://localhost:5274, proxies /api → :8785)
npm install && npm run dev
```

Fallback — point at a running Tirzah instead (same `/api/trace/*` shapes; no
`/api/llm-calls`, so the **LLM Calls** tab needs Galeed):

```bash
# VITE_TRACE_API=http://localhost:8765 npm run dev
```

## Trace API it consumes

- `GET /api/trace/sessions` → session summaries
- `GET /api/trace/events?session_id=…|trace_id=…` → a session/trace's events
- `GET /api/trace/stream?session_id=…&replay=true` → live tail (SSE)
- `GET /api/llm-calls` → model call captures (**Galeed only**)

## Scope / status

**This repo is the viewer** — the "browse any session" interface over the family
trace stream.

The trace **library and HTTP host** live in
[Galeed](https://github.com/gellsmore-svg/galeed): Galeed records structured
process events and serves `/api/trace/*` plus `/api/llm-calls`. Mizpah remains
decoupled from any one product's internals and talks only to that public API.
Tirzah still speaks the same `/api/trace/*` shapes, so `VITE_TRACE_API` can
target it when Galeed is not running (session browser only).

## Security note

The **LLM Calls** view renders full-fidelity captures: complete prompts and
outputs, including any retrieved memory or user content the emitting tool put
into a prompt. Treat the Mizpah screen — and the trace database behind it —
with the same sensitivity as the source data. The backing APIs (`galeed
serve` / Tirzah) are unauthenticated and bind localhost; do not proxy them
beyond your machine without authentication. See Galeed's SECURITY.md for the
storage posture and purge guidance.
