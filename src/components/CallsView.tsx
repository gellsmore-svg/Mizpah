import { useEffect, useMemo, useState } from 'react'
import { fetchLlmCalls } from '../api'
import type { LlmCall } from '../types'

/**
 * The LLM debugging view: every captured call across the family, rendered as
 * clean In → Out blocks. Chains (parent_call_id) nest as a tree. The default
 * is deliberately noise-free; the technical layer (model, timing, metadata)
 * appears only with the Advanced toggle, and long payloads clamp until
 * expanded.
 */

interface CallNode extends LlmCall {
  children: CallNode[]
}

export function buildForest(calls: LlmCall[]): CallNode[] {
  const byId = new Map<string, CallNode>()
  calls.forEach((call) => byId.set(call.call_id, { ...call, children: [] }))
  const roots: CallNode[] = []
  byId.forEach((node) => {
    const parent = node.parent_call_id ? byId.get(node.parent_call_id) : undefined
    if (parent && parent !== node) parent.children.push(node)
    else roots.push(node)
  })
  return roots
}

export function matches(call: LlmCall, needle: string): boolean {
  const haystack = [
    call.step_name,
    call.session_id,
    call.trace_id,
    call.model,
    call.prompt,
    call.output,
    call.error,
    ...(call.messages ?? []).map((message) => message.content),
  ]
  return haystack.some((value) => value && value.toLowerCase().includes(needle))
}

function Payload({ label, text, tone }: { label: string; text: string; tone?: 'error' }) {
  const [expanded, setExpanded] = useState(false)
  const clamp = 1200
  const long = text.length > clamp
  const shown = expanded || !long ? text : text.slice(0, clamp)
  return (
    <div className="call__payload">
      <span className="call__label">{label}</span>
      <pre className={`call__text ${tone === 'error' ? 'call__text--error' : ''}`}>{shown}</pre>
      {long && (
        <button className="call__more" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'collapse' : `+ ${text.length - clamp} more chars`}
        </button>
      )}
    </div>
  )
}

function CallCard({ node, advanced, depth }: { node: CallNode; advanced: boolean; depth: number }) {
  return (
    <div className="call" style={{ marginLeft: depth * 22 }}>
      <div className="call__head">
        <span className={`dot ${node.status === 'failed' ? 'dot--failed' : 'dot--ok'}`} />
        <span className="call__step">{node.step_name || node.model || node.call_id.slice(0, 12)}</span>
        {advanced && (
          <span className="muted mono call__tech">
            {node.source} · {node.model ?? '?'}
            {node.duration_ms != null ? ` · ${node.duration_ms}ms` : ''} · {node.call_id.slice(0, 12)}
          </span>
        )}
        <span className="muted mono call__time">{(node.completed_at ?? '').slice(11, 19)}</span>
      </div>
      {node.messages?.length ? (
        <div className="call__payload">
          <span className="call__label">In</span>
          {node.messages.map((message, index) => (
            <pre key={index} className="call__text">
              <span className="call__role">[{message.role}]</span> {message.content}
            </pre>
          ))}
        </div>
      ) : node.prompt != null ? (
        <Payload label="In" text={node.prompt} />
      ) : null}
      {node.error ? (
        <Payload label="Out" text={node.error} tone="error" />
      ) : (
        <Payload label="Out" text={node.output ?? '(no output)'} />
      )}
      {advanced && Object.keys(node.metadata ?? {}).length > 0 && (
        <pre className="call__meta mono">{JSON.stringify(node.metadata, null, 2)}</pre>
      )}
      {node.children.map((child) => (
        <CallCard key={child.call_id} node={child} advanced={advanced} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function CallsView() {
  const [calls, setCalls] = useState<LlmCall[]>([])
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('')
  const [advanced, setAdvanced] = useState(() => localStorage.getItem('mizpah.advanced') === 'true')

  useEffect(() => {
    localStorage.setItem('mizpah.advanced', String(advanced))
  }, [advanced])

  const load = () => {
    fetchLlmCalls({ source: source || undefined })
      .then((rows) => {
        setCalls(rows)
        setConnectionError(null)
      })
      .catch((error: Error) => {
        // Distinguish "backend unreachable" from "no captures yet".
        setConnectionError(error.message || 'trace API unreachable')
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    setLoading(true)
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  const sources = useMemo(
    () => Array.from(new Set(calls.map((call) => call.source))).sort(),
    [calls],
  )

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return calls
    return calls.filter((call) => matches(call, needle))
  }, [calls, search])

  // Group by trace so a chained flow reads as one block, newest trace first.
  const traces = useMemo(() => {
    const groups = new Map<string, LlmCall[]>()
    filtered.forEach((call) => {
      const group = groups.get(call.trace_id) ?? []
      group.push(call)
      groups.set(call.trace_id, group)
    })
    return Array.from(groups.entries()).reverse()
  }, [filtered])

  return (
    <div className="calls">
      <div className="calls__bar">
        <input
          className="calls__search"
          placeholder="Search step names, prompts, outputs…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="calls__source" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="">all sources</option>
          {sources.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <label className="calls__advanced muted">
          <input type="checkbox" checked={advanced} onChange={() => setAdvanced((value) => !value)} /> advanced
        </label>
      </div>
      <div className="calls__list">
        {loading && <p className="muted">loading…</p>}
        {!loading && connectionError && (
          <p className="calls__error">
            Trace API unreachable ({connectionError}) — is `galeed serve` (or a
            Tirzah with /api/llm-calls) running behind the proxy? Retrying every 5s.
          </p>
        )}
        {!loading && !connectionError && traces.length === 0 && (
          <p className="muted">
            No captured LLM calls. Emission is opt-in: Hoglah needs galeed_enabled +
            galeed_capture_io; other tools use galeed.capture_llm_call.
          </p>
        )}
        {traces.map(([traceId, group]) => (
          <section key={traceId} className="trace">
            <div className="trace__head mono muted">
              {traceId} · {group[0].session_id} · {group.length} call(s)
            </div>
            {buildForest(group).map((node) => (
              <CallCard key={node.call_id} node={node} advanced={advanced} depth={0} />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
