# Mizpah

**Mizpah is a browser for reading what the family's tools actually did, in
any session, after the fact.** It shows every session in the trace store,
each session's full event timeline, and every captured model call as an
In→Out card.

It is the viewer half of a pair. [Galeed](https://github.com/gellsmore-svg/galeed)
records the trace events and model calls; Mizpah views them. (Genesis 31:49:
*"The Lord watch between us"*, a watchtower over the record.)

## Is it for you?

**Good fit:** you run family tools (Tirzah, Mahalath, Hoglah, Huldah, Milcah
and others) that emit to Galeed, and you want to find an old session, follow
a request step by step, or read exactly what a model was sent and returned.

**Not a fit:** watching only the conversation you are in right now. The
dev-log popup in [Mahlah](https://github.com/gellsmore-svg/Mahlah) does that
inline.

## Try it

You need Node and a running Galeed trace API over your trace database:

```bash
pip install "galeed[web]" && galeed serve      # trace API on :8785
npm install && npm run dev                      # Mizpah on http://localhost:5274
```

Mizpah proxies `/api` to `http://localhost:8785`. To use another source, set
`VITE_TRACE_API`. For example, a running Tirzah on `:8765` serves the same
session and event API but not model calls, so the **LLM Calls** tab stays
empty:

```bash
VITE_TRACE_API=http://localhost:8765 npm run dev
```

## What you see

- **Sessions** (left): every session in the store, with its sources,
  request and event counts, first query and last activity. Filter by id, query
  or source.
- **Session detail** (right): the full event timeline (time, status, type,
  source, summary, metadata, ids) with a **live tail** toggle and copy-all as
  JSON. Filter chips narrow it to **Orchestration**, **Decisions**,
  **Negotiation**, **Open Q**, **Phases** and **Process**.
- **LLM Calls** (tab): every captured model call as an In→Out card, grouped by
  trace, with recursive chains nested via `parent_call_id`. Full-text search,
  source filter, expandable long payloads, and an **Advanced** toggle for
  model, duration and metadata. Broken or cyclic chains are shown and flagged,
  never dropped.

The UI is e-ink friendly by default (high-contrast monochrome, no animation),
like the other family UIs.

## Handle with care

The **LLM Calls** view shows complete prompts and outputs, including any
retrieved memory or user content a tool put into a prompt. Treat the screen
and the trace database with the same sensitivity as that source data.
`galeed serve` and Tirzah are unauthenticated and bind to localhost: do not
expose them beyond your machine without authentication. Galeed's
[SECURITY.md](https://github.com/gellsmore-svg/galeed/blob/main/SECURITY.md)
covers storage and purging.

## The API it reads

Mizpah depends only on this public API, never on a product's internals:

| Endpoint | Returns |
|---|---|
| `GET /api/trace/sessions` | Session summaries |
| `GET /api/trace/events?session_id=…` or `?trace_id=…` | A session's or trace's events |
| `GET /api/trace/stream?session_id=…&replay=true` | Live tail (SSE) |
| `GET /api/llm-calls` | Captured model calls (Galeed only) |

## Develop

```bash
npm run typecheck && npm test      # tsc + vitest
npm run build                      # production bundle in dist/
```

[2026-08-11 review](docs/review-2026-08-11.md): all findings were actioned,
except half of M3, which was withdrawn on inspection (the reasoning is
recorded inline).
