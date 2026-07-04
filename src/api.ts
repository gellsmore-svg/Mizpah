import type { LlmCall, SessionSummary, TraceEvent } from './types'

export async function fetchSessions(limit = 200): Promise<SessionSummary[]> {
  const res = await fetch(`/api/trace/sessions?limit=${limit}`)
  if (!res.ok) throw new Error(`/api/trace/sessions failed: ${res.status}`)
  const body = await res.json()
  return (body.sessions ?? []) as SessionSummary[]
}

export async function fetchSessionEvents(sessionId: string, limit = 1000): Promise<TraceEvent[]> {
  const res = await fetch(`/api/trace/events?session_id=${encodeURIComponent(sessionId)}&limit=${limit}`)
  if (!res.ok) throw new Error(`/api/trace/events failed: ${res.status}`)
  const body = await res.json()
  return (body.events ?? []) as TraceEvent[]
}

/** Live tail for a session (data-only SSE frames). Returns the EventSource. */
export function openSessionStream(sessionId: string, onEvent: (event: TraceEvent) => void): EventSource {
  const source = new EventSource(`/api/trace/stream?session_id=${encodeURIComponent(sessionId)}&replay=true`)
  source.onmessage = (event) => {
    if (!event.data) return
    try {
      onEvent(JSON.parse(event.data) as TraceEvent)
    } catch {
      /* keepalive */
    }
  }
  return source
}

export async function fetchLlmCalls(params: {
  sessionId?: string
  source?: string
  limit?: number
}): Promise<LlmCall[]> {
  const query = new URLSearchParams()
  if (params.sessionId) query.set('session_id', params.sessionId)
  if (params.source) query.set('source', params.source)
  query.set('limit', String(params.limit ?? 200))
  const res = await fetch(`/api/llm-calls?${query}`)
  if (!res.ok) throw new Error(`/api/llm-calls failed: ${res.status}`)
  const body = await res.json()
  return (body.calls ?? []) as LlmCall[]
}
