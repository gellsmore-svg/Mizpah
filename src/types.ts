// Mirrors the family trace contract (Tirzah's tirzah.trace).

export interface TraceEvent {
  event_id: string
  trace_id: string
  session_id: string
  type: string
  status: string
  summary: string
  severity: string
  source: string
  message_id: string | null
  request_id: string | null
  seq: number
  timestamp: string
  metadata: Record<string, unknown>
}

export interface SessionSummary {
  session_id: string
  event_count: number
  sources: string[]
  trace_count: number
  started_at: string | null
  updated_at: string | null
  first_query: string | null
  last_answer_preview: string | null
}
