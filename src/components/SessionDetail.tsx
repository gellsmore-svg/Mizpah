import type { TraceEvent } from '../types'

interface Props {
  sessionId: string | null
  events: TraceEvent[]
  live: boolean
  onToggleLive: () => void
  onRefresh: () => void
}

export default function SessionDetail({ sessionId, events, live, onToggleLive, onRefresh }: Props) {
  if (!sessionId) {
    return (
      <main className="detail detail--empty">
        <p className="muted">Select a session to view its full trace.</p>
      </main>
    )
  }

  const copyAll = () => {
    void navigator.clipboard?.writeText(JSON.stringify(events, null, 2))
  }

  return (
    <main className="detail">
      <header className="detail__head">
        <div>
          <strong>Session</strong> <span className="muted mono">{sessionId}</span>
        </div>
        <div className="detail__actions">
          <button className={`icon-btn ${live ? 'icon-btn--on' : ''}`} title="Live tail" onClick={onToggleLive}>
            {live ? '● live' : '○ live'}
          </button>
          <button className="icon-btn" title="Refresh" onClick={onRefresh}>
            ⟳
          </button>
          <button className="icon-btn" title="Copy all events as JSON" onClick={copyAll}>
            ⧉
          </button>
        </div>
      </header>
      <div className="detail__body">
        {events.length === 0 && <p className="muted">No events for this session.</p>}
        {events.map((event) => (
          <div key={event.event_id} className={`logrow logrow--${event.severity}`}>
            <div className="logrow__top">
              <span className="logrow__ts">{event.timestamp?.slice(11, 23)}</span>
              <span className={`badge badge--${event.status}`}>{event.status}</span>
              <span className="logrow__type">{event.type}</span>
              <span className="logrow__src muted">{event.source}</span>
            </div>
            <div className="logrow__summary">{event.summary}</div>
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <pre className="logrow__meta">{JSON.stringify(event.metadata, null, 2)}</pre>
            )}
            <div className="logrow__ids muted">
              {event.trace_id} · seq {event.seq}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
