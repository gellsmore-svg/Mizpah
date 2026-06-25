import { useEffect, useState } from 'react'
import SessionList from './components/SessionList'
import SessionDetail from './components/SessionDetail'
import { fetchSessionEvents, fetchSessions, openSessionStream } from './api'
import type { SessionSummary, TraceEvent } from './types'

function sortEvents(events: TraceEvent[]): TraceEvent[] {
  return [...events].sort((a, b) => {
    if (a.timestamp === b.timestamp) return a.seq - b.seq
    return a.timestamp < b.timestamp ? -1 : 1
  })
}

export default function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [events, setEvents] = useState<TraceEvent[]>([])
  const [live, setLive] = useState(false)

  const loadSessions = () => {
    setLoading(true)
    fetchSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }
  useEffect(loadSessions, [])

  const loadEvents = (id: string) => {
    fetchSessionEvents(id)
      .then((list) => setEvents(sortEvents(list)))
      .catch(() => setEvents([]))
  }

  const select = (id: string) => {
    setSelectedId(id)
    setLive(false)
    loadEvents(id)
  }

  useEffect(() => {
    if (!live || !selectedId) return
    const stream = openSessionStream(selectedId, (event) => {
      setEvents((prev) => (prev.some((existing) => existing.event_id === event.event_id) ? prev : sortEvents([...prev, event])))
    })
    return () => stream.close()
  }, [live, selectedId])

  return (
    <div className="app">
      <header className="topbar">
        <strong>Mizpah</strong> <span className="muted">log browser</span>
        <span className="topbar__count muted">{sessions.length} sessions</span>
      </header>
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
          live={live}
          onToggleLive={() => setLive((value) => !value)}
          onRefresh={() => selectedId && loadEvents(selectedId)}
        />
      </div>
    </div>
  )
}
