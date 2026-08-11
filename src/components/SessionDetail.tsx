import { useMemo, useState } from 'react'
import {
  countByPreset,
  eventMetaChips,
  filterEventsByPreset,
  formatClockTime,
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
  phases: 'Phases',
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
  const [copyHint, setCopyHint] = useState<string | null>(null)
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

  // A copy that quietly does nothing (no clipboard API outside a secure
  // context) is indistinguishable from one that worked, so say which it was.
  const copyAll = async () => {
    const payload = JSON.stringify(visible, null, 2)
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable (needs https or localhost)')
      await navigator.clipboard.writeText(payload)
      setCopyHint(`copied ${visible.length} event(s)`)
    } catch (error) {
      setCopyHint(`copy failed: ${(error as Error).message}`)
    }
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
          <button className="icon-btn" title="Copy filtered events as JSON" onClick={() => void copyAll()}>
            ⧉
          </button>
          {copyHint && (
            <span className="detail__copy-hint muted" role="status">
              {copyHint}
            </span>
          )}
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
        {visible.map((event) => {
          const chips = eventMetaChips(event)
          return (
          <div key={event.event_id} className={`logrow logrow--${event.severity}`}>
            <div className="logrow__top">
              <span className="logrow__ts">{formatClockTime(event.timestamp)}</span>
              <span className={`badge badge--${event.status}`}>{event.status}</span>
              <span className="logrow__type">{event.type}</span>
              <span className="logrow__src muted">{event.source}</span>
              {chips.map((chip, index) => (
                <span key={`${chip}:${index}`} className="metachip">
                  {chip}
                </span>
              ))}
            </div>
            <div className="logrow__summary">{event.summary}</div>
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <pre className="logrow__meta">{JSON.stringify(event.metadata, null, 2)}</pre>
            )}
            <div className="logrow__ids muted">
              {event.trace_id} · seq {event.seq}
            </div>
          </div>
          )
        })}
      </div>
    </main>
  )
}
