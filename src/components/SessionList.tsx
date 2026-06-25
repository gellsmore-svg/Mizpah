import { useState } from 'react'
import type { SessionSummary } from '../types'

interface Props {
  sessions: SessionSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRefresh: () => void
  loading: boolean
}

function relTime(iso: string | null): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function SessionList({ sessions, selectedId, onSelect, onRefresh, loading }: Props) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const filtered = term
    ? sessions.filter(
        (session) =>
          session.session_id.toLowerCase().includes(term) ||
          (session.first_query ?? '').toLowerCase().includes(term) ||
          session.sources.some((src) => src.toLowerCase().includes(term)),
      )
    : sessions

  return (
    <aside className="sessions">
      <div className="sessions__head">
        <strong>Sessions</strong>
        <button className="icon-btn" title="Refresh" onClick={onRefresh}>
          ⟳
        </button>
      </div>
      <input
        className="sessions__search"
        placeholder="Filter by id, query, source…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="sessions__list">
        {loading && <p className="muted sessions__empty">Loading…</p>}
        {!loading && filtered.length === 0 && <p className="muted sessions__empty">No sessions.</p>}
        {filtered.map((session) => (
          <button
            key={session.session_id}
            className={`session ${session.session_id === selectedId ? 'session--active' : ''}`}
            onClick={() => onSelect(session.session_id)}
          >
            <div className="session__title">{session.first_query || session.session_id}</div>
            <div className="session__meta muted">
              {session.sources.join(', ')} · {session.trace_count} req · {session.event_count} ev ·{' '}
              {relTime(session.updated_at)}
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
