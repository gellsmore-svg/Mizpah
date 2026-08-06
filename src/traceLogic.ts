import type { TraceEvent } from './types'

/** Stable chronological order for a session timeline (timestamp, then seq). */
export function sortEvents(events: TraceEvent[]): TraceEvent[] {
  return [...events].sort((a, b) => {
    if (a.timestamp === b.timestamp) return a.seq - b.seq
    return a.timestamp < b.timestamp ? -1 : 1
  })
}
