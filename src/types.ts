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

// One captured LLM call (galeed llm_calls): the full In→Out debugging record.
export interface LlmCall {
  call_id: string
  trace_id: string
  session_id: string
  source: string
  step_name: string | null
  parent_call_id: string | null
  model: string | null
  prompt: string | null
  messages: { role: string; content: string }[] | null
  output: string | null
  error: string | null
  status: 'completed' | 'failed'
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  metadata: Record<string, unknown>
}
