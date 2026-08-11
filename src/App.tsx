import { useEffect, useState } from 'react'
import CallsView from './components/CallsView'
import SessionList from './components/SessionList'
import SessionDetail from './components/SessionDetail'
import { fetchSessionEvents, fetchSessions, openSessionStream } from './api'
import { insertEvent, sortEvents } from './traceLogic'
import type { SessionSummary, TraceEvent } from './types'

export default function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [events, setEvents] = useState<TraceEvent[]>([])
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [live, setLive] = useState(false)
  const [streamHint, setStreamHint] = useState<string | null>(null)
  const [view, setView] = useState<'sessions' | 'calls'>(
    () => (localStorage.getItem('mizpah.view') === 'calls' ? 'calls' : 'sessions'),
  )

  useEffect(() => {
    localStorage.setItem('mizpah.view', view)
  }, [view])

  const [sessionsError, setSessionsError] = useState<string | null>(null)

  const loadSessions = () => {
    setLoading(true)
    fetchSessions()
      .then((rows) => {
        setSessions(rows)
        setSessionsError(null)
      })
      .catch((error: Error) => setSessionsError(error.message || 'trace API unreachable'))
      .finally(() => setLoading(false))
  }
  useEffect(loadSessions, [])

  const loadEvents = (id: string) => {
    setEventsLoading(true)
    setEventsError(null)
    fetchSessionEvents(id)
      .then((list) => {
        setEvents(sortEvents(list))
        setEventsError(null)
      })
      .catch((error: Error) => {
        setEvents([])
        setEventsError(error.message || 'failed to load session events')
      })
      .finally(() => setEventsLoading(false))
  }

  const select = (id: string) => {
    setSelectedId(id)
    setLive(false)
    setStreamHint(null)
    loadEvents(id)
  }

  useEffect(() => {
    if (!live || !selectedId) {
      setStreamHint(null)
      return
    }
    setStreamHint(null)
    const stream = openSessionStream(
      selectedId,
      (event) => {
        setStreamHint(null)
        // Insert in place rather than re-sorting the whole timeline on every
        // frame: arrivals are almost always simply the newest event, and
        // sessions here hold 1 500+.
        setEvents((prev) => insertEvent(prev, event))
      },
      () => {
        // EventSource reconnects automatically; surface the drop so live tail
        // is never a silent no-op (Mizpah #10).
        setStreamHint('Live tail interrupted — reconnecting…')
      },
    )
    return () => stream.close()
  }, [live, selectedId])

  return (
    <div className="app">
      <header className="topbar">
        <strong>Mizpah</strong> <span className="muted">family watchtower</span>
        <nav className="topbar__views">
          <button
            className={`viewtab ${view === 'sessions' ? 'viewtab--active' : ''}`}
            onClick={() => setView('sessions')}
          >
            Sessions
          </button>
          <button
            className={`viewtab ${view === 'calls' ? 'viewtab--active' : ''}`}
            onClick={() => setView('calls')}
          >
            LLM Calls
          </button>
        </nav>
        <span className="topbar__count muted">
          {sessionsError ? `⚠ ${sessionsError}` : `${sessions.length} sessions`}
        </span>
      </header>
      {view === 'calls' ? (
        <CallsView />
      ) : (
        <div className="layout">
          <SessionList
            sessions={sessions}
            selectedId={selectedId}
            onSelect={select}
            onRefresh={loadSessions}
            loading={loading}
          />
          <SessionDetail
            sessionId={selectedId}
            events={events}
            eventsError={eventsError}
            eventsLoading={eventsLoading}
            live={live}
            streamHint={streamHint}
            onToggleLive={() => setLive((value) => !value)}
            onRefresh={() => selectedId && loadEvents(selectedId)}
          />
        </div>
      )}
    </div>
  )
}
