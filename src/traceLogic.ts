import type { TraceEvent } from './types'

/** Stable chronological order for a session timeline (timestamp, then seq). */
export function sortEvents(events: TraceEvent[]): TraceEvent[] {
  return [...events].sort((a, b) => {
    if (a.timestamp === b.timestamp) return a.seq - b.seq
    return a.timestamp < b.timestamp ? -1 : 1
  })
}

/** Preset filters for Deborah/Galeed orchestration spine events. */
export const EVENT_FILTER_PRESETS = {
  all: null as string[] | null,
  decisions: ['decision.recorded'],
  negotiation: ['negotiation.started', 'negotiation.finished'],
  open_questions: ['open_question.recorded'],
  process: [
    'plan.started',
    'plan.step.started',
    'plan.step.finished',
    'plan.finished',
    'process.step',
    'process.completed',
  ],
  orchestration: [
    'decision.recorded',
    'negotiation.started',
    'negotiation.finished',
    'open_question.recorded',
    'plan.started',
    'plan.finished',
  ],
} as const

export type EventFilterPreset = keyof typeof EVENT_FILTER_PRESETS

export function filterEventsByTypes(
  events: TraceEvent[],
  types: string[] | null | undefined,
): TraceEvent[] {
  if (!types || types.length === 0) return events
  const set = new Set(types)
  return events.filter((e) => set.has(e.type))
}

export function filterEventsByPreset(
  events: TraceEvent[],
  preset: EventFilterPreset,
): TraceEvent[] {
  return filterEventsByTypes(events, EVENT_FILTER_PRESETS[preset])
}

/** Count how many events match each orchestration preset (for chip badges). */
export function countByPreset(events: TraceEvent[]): Record<EventFilterPreset, number> {
  return {
    all: events.length,
    decisions: filterEventsByPreset(events, 'decisions').length,
    negotiation: filterEventsByPreset(events, 'negotiation').length,
    open_questions: filterEventsByPreset(events, 'open_questions').length,
    process: filterEventsByPreset(events, 'process').length,
    orchestration: filterEventsByPreset(events, 'orchestration').length,
  }
}
