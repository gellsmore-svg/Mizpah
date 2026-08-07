import { useMemo, useState } from 'react'
import {
  countByPreset,
  filterEventsByPreset,
  type EventFilterPreset,
} from '../traceLogic'
import type { TraceEvent } from '../types'

interface Props {
  sessionId: string | null
  events: TraceEvent[]
  eventsError?: string | null
  eventsLoading?: boolean
  live: boolean
  streamHint?: string | null
  onToggleLive: () => void
  onRefresh: () => void
}

const PRESET_LABELS: Record<EventFilterPreset, string> = {
  all: 'All',
  orchestration: 'Orchestration',
  decisions: 'Decisions',
  negotiation: 'Negotiation',
  open_questions: 'Open Q',
  process: 'Process',
}

export default function SessionDetail({
  sessionId,
  events,
  eventsError = null,
  eventsLoading = false,
  live,
  streamHint = null,
  onToggleLive,
  onRefresh,
}: Props) {
  const [preset, setPreset] = useState<EventFilterPreset>('all')
  const counts = useMemo(() => countByPreset(events), [events])
  const visible = useMemo(
    () => filterEventsByPreset(events, preset),
    [events, preset],
  )

  if (!sessionId) {
    return (
      <main className="detail detail--empty">
        <p className="muted">Select a session to view its full trace.</p>
      </main>
    )
  }

  const copyAll = () => {
    void navigator.clipboard?.writeText(JSON.stringify(visible, null, 2))
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
          <button className="icon-btn" title="Copy filtered events as JSON" onClick={copyAll}>
            ⧉
          </button>
        </div>
      </header>
      <div className="detail__filters" role="toolbar" aria-label="Event type filters">
        {(Object.keys(PRESET_LABELS) as EventFilterPreset[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`filterchip ${preset === key ? 'filterchip--active' : ''}`}
            onClick={() => setPreset(key)}
            title={key}
          >
            {PRESET_LABELS[key]}
            <span className="filterchip__count muted">{counts[key]}</span>
          </button>
        ))}
      </div>
      <div className="detail__body">
        {eventsError && (
          <p className="detail__error" role="alert">
            ⚠ Could not load events: {eventsError}
          </p>
        )}
        {streamHint && live && (
          <p className="detail__stream-hint" role="status">
            {streamHint}
          </p>
        )}
        {!eventsError && eventsLoading && events.length === 0 && (
          <p className="muted">Loading events…</p>
        )}
        {!eventsError && !eventsLoading && events.length === 0 && (
          <p className="muted">No events for this session.</p>
        )}
        {!eventsError && events.length > 0 && visible.length === 0 && (
          <p className="muted">No events match this filter.</p>
        )}
        {visible.map((event) => (
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
