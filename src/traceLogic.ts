import type { TraceEvent } from './types'

/**
 * Parse an emitter timestamp to epoch milliseconds; NaN when unparseable.
 *
 * Every current emitter writes `2026-08-11T08:17:12.259049+00:00`, but nothing
 * enforces that: Galeed's `SCHEMA_VERSION` says nothing about timestamp format
 * and is not checked on read. Comparing the strings directly was therefore
 * chronological only by convention, and two realistic formats invert it —
 * `…T09:00:00.5+00:00` sorts before `…T09:00:00Z` (`.` < `Z`), and
 * `…T09:00:00+01:00` (08:00 UTC) sorts after `…T08:30:00Z`. Parsing removes the
 * coupling entirely.
 */
export function timestampMs(timestamp: string | null | undefined): number {
  if (!timestamp) return Number.NaN
  return Date.parse(timestamp)
}

/**
 * Stable chronological order for a session timeline (timestamp, then seq).
 *
 * Unparseable timestamps sort last rather than scrambling the run: an event we
 * cannot place should be visibly at the end, not silently in the middle. `seq`
 * breaks exact ties — microsecond timestamps rarely collide, but replayed and
 * synthesised events do.
 */
export function sortEvents(events: TraceEvent[]): TraceEvent[] {
  return [...events].sort(compareEvents)
}

export function compareEvents(a: TraceEvent, b: TraceEvent): number {
  const at = timestampMs(a.timestamp)
  const bt = timestampMs(b.timestamp)
  const aBad = Number.isNaN(at)
  const bBad = Number.isNaN(bt)
  if (aBad || bBad) {
    if (aBad && bBad) return a.seq - b.seq
    return aBad ? 1 : -1
  }
  if (at === bt) return a.seq - b.seq
  return at - bt
}

/**
 * Insert one event into an already-sorted list, preserving order.
 *
 * The live tail used to re-sort the whole array per frame — an O(n) copy plus
 * an O(n log n) sort for every arrival, on sessions holding 1 500+ events, to
 * place an event that is almost always simply the newest. Returns the original
 * array unchanged when the event is already present, so React can skip the
 * re-render.
 */
export function insertEvent(events: TraceEvent[], event: TraceEvent): TraceEvent[] {
  if (events.some((existing) => existing.event_id === event.event_id)) return events
  const next = [...events]
  let index = next.length
  while (index > 0 && compareEvents(next[index - 1], event) > 0) index -= 1
  next.splice(index, 0, event)
  return next
}

/**
 * `HH:MM:SS.mmm` for the timeline column, or null when unparseable.
 *
 * Previously a character-offset slice, which produced the right answer for one
 * emitter format and quiet nonsense for any other.
 */
export function formatClockTime(timestamp: string | null | undefined): string {
  const ms = timestampMs(timestamp)
  if (Number.isNaN(ms)) return timestamp ? '—' : ''
  const date = new Date(ms)
  const pad = (value: number, width = 2) => String(value).padStart(width, '0')
  return (
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:` +
    `${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`
  )
}

/** Mid-slice phase markers from Deborah substrate (Galeed extensible types). */
export const SLICE_PHASE_TYPES = [
  'slice.phase.split',
  'slice.phase.pre_complete',
  'slice.phase.post_complete',
  'slice.phase.evidence_stats',
  'slice.post_retrieve_negotiation.finished',
] as const

/** Preset filters for Deborah/Galeed orchestration spine events. */
export const EVENT_FILTER_PRESETS = {
  all: null as string[] | null,
  decisions: ['decision.recorded'],
  negotiation: ['negotiation.started', 'negotiation.finished'],
  open_questions: ['open_question.recorded'],
  phases: [...SLICE_PHASE_TYPES],
  process: [
    'plan.started',
    'plan.step.started',
    'plan.step.finished',
    'plan.finished',
    'process.step',
    'process.completed',
    ...SLICE_PHASE_TYPES,
  ],
  orchestration: [
    'decision.recorded',
    'negotiation.started',
    'negotiation.finished',
    'open_question.recorded',
    'plan.started',
    'plan.finished',
    ...SLICE_PHASE_TYPES,
  ],
} as const

export type EventFilterPreset = keyof typeof EVENT_FILTER_PRESETS

export function filterEventsByTypes(
  events: TraceEvent[],
  types: readonly string[] | null | undefined,
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
    phases: filterEventsByPreset(events, 'phases').length,
    process: filterEventsByPreset(events, 'process').length,
    orchestration: filterEventsByPreset(events, 'orchestration').length,
  }
}

/** The phases a negotiation event may declare, and how each is displayed. */
const NEGOTIATION_PHASES: Record<string, string> = {
  post_retrieve: 'post-retrieve',
  'post-retrieve': 'post-retrieve',
  pre_plan: 'pre-plan',
  'pre-plan': 'pre-plan',
}

/**
 * Label for negotiation phase (pre-plan vs post-retrieve mid-gate), or null.
 *
 * Only recognised phase values are accepted. `metadata.note` is a
 * general-purpose field, and reading it as a phase meant any emitter that put
 * prose there had it rendered as a phase chip — "unrelated commentary" became
 * the displayed phase.
 *
 * The `'pre-plan'` default is kept deliberately. It looks like asserting a
 * phase the event never declared, but in Deborah's slice negotiation IS
 * pre-plan unless it says otherwise: `post_retrieve` is the explicitly-marked
 * mid-gate. Dropping the default would lose a real distinction the view was
 * making. Revisit if an emitter ever labels pre-plan explicitly.
 */
export function negotiationPhaseLabel(event: TraceEvent): string | null {
  if (!event.type.startsWith('negotiation.')) return null
  const meta = event.metadata || {}
  for (const candidate of [meta.negotiation_phase, meta.note]) {
    if (typeof candidate === 'string' && NEGOTIATION_PHASES[candidate]) {
      return NEGOTIATION_PHASES[candidate]
    }
  }
  // The summary may already say "post_retrieve finished → agreed".
  if (/post[_-]?retrieve/i.test(event.summary || '')) return 'post-retrieve'
  return 'pre-plan'
}

/** Renderable chip text for a metadata value, or null if it is not scalar. */
function chipValue(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null // objects and arrays previously rendered as "[object Object]"
}

/**
 * Short chips derived from event metadata for the detail row.
 *
 * Chips are deduplicated: a status and a phase can carry the same word, and the
 * detail row keys chips by value, so repeats collided as React keys.
 */
export function eventMetaChips(event: TraceEvent): string[] {
  const chips: string[] = []
  const meta = event.metadata || {}
  const push = (value: string | null) => {
    if (value && !chips.includes(value)) chips.push(value)
  }
  push(negotiationPhaseLabel(event))
  push(chipValue(meta.negotiation_status))
  if (typeof meta.evidence_count === 'number') push(`ev=${meta.evidence_count}`)
  if (meta.novel_detected === true) push('novel')
  push(chipValue(meta.selected))
  if (typeof meta.pre_steps === 'number' && typeof meta.post_steps === 'number') {
    push(`pre=${meta.pre_steps}/post=${meta.post_steps}`)
  }
  return chips
}
