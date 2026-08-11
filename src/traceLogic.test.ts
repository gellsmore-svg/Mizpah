import { describe, expect, it } from 'vitest'
import {
  countByPreset,
  eventMetaChips,
  filterEventsByPreset,
  formatClockTime,
  insertEvent,
  negotiationPhaseLabel,
  sortEvents,
} from './traceLogic'
import type { TraceEvent } from './types'

const event = (over: Partial<TraceEvent>): TraceEvent => ({
  event_id: 'e1',
  trace_id: 't',
  session_id: 's',
  type: 'test',
  status: 'ok',
  summary: '',
  severity: 'info',
  source: 'test',
  message_id: null,
  request_id: null,
  seq: 0,
  timestamp: '2026-07-06T12:00:00.000Z',
  metadata: {},
  ...over,
})

describe('sortEvents', () => {
  it('orders by timestamp then seq', () => {
    const sorted = sortEvents([
      event({ event_id: 'c', timestamp: '2026-07-06T12:00:02.000Z', seq: 1 }),
      event({ event_id: 'a', timestamp: '2026-07-06T12:00:01.000Z', seq: 2 }),
      event({ event_id: 'b', timestamp: '2026-07-06T12:00:01.000Z', seq: 1 }),
    ])
    expect(sorted.map((e) => e.event_id)).toEqual(['b', 'a', 'c'])
  })

  it('does not mutate the input array', () => {
    const input = [
      event({ event_id: 'later', timestamp: '2026-07-06T12:00:02.000Z', seq: 1 }),
      event({ event_id: 'earlier', timestamp: '2026-07-06T12:00:01.000Z', seq: 1 }),
    ]
    const before = input.map((e) => e.event_id)
    sortEvents(input)
    expect(input.map((e) => e.event_id)).toEqual(before)
  })
})

describe('orchestration event filters', () => {
  const sample = [
    event({ event_id: '1', type: 'decision.recorded' }),
    event({ event_id: '2', type: 'negotiation.finished' }),
    event({ event_id: '3', type: 'open_question.recorded' }),
    event({ event_id: '4', type: 'plan.finished' }),
    event({ event_id: '5', type: 'llm.call.completed' }),
    event({
      event_id: '6',
      type: 'slice.phase.split',
      metadata: { pre_steps: 3, post_steps: 4 },
    }),
    event({
      event_id: '7',
      type: 'negotiation.finished',
      summary: 'post_retrieve finished → partial',
      metadata: {
        note: 'post_retrieve',
        negotiation_status: 'partial',
        evidence_count: 0,
      },
    }),
  ]

  it('filters decisions', () => {
    expect(filterEventsByPreset(sample, 'decisions').map((e) => e.event_id)).toEqual(['1'])
  })

  it('filters orchestration bucket', () => {
    const ids = filterEventsByPreset(sample, 'orchestration').map((e) => e.event_id)
    expect(ids).toEqual(['1', '2', '3', '4', '6', '7'])
  })

  it('filters phases', () => {
    expect(filterEventsByPreset(sample, 'phases').map((e) => e.event_id)).toEqual(['6'])
  })

  it('counts presets', () => {
    const c = countByPreset(sample)
    expect(c.all).toBe(7)
    expect(c.decisions).toBe(1)
    expect(c.open_questions).toBe(1)
    expect(c.negotiation).toBe(2)
    expect(c.phases).toBe(1)
  })

  it('labels post-retrieve negotiation phase', () => {
    const post = sample.find((e) => e.event_id === '7')!
    expect(negotiationPhaseLabel(post)).toBe('post-retrieve')
    const pre = sample.find((e) => e.event_id === '2')!
    expect(negotiationPhaseLabel(pre)).toBe('pre-plan')
  })

  it('builds metadata chips', () => {
    const post = sample.find((e) => e.event_id === '7')!
    const chips = eventMetaChips(post)
    expect(chips).toContain('post-retrieve')
    expect(chips).toContain('partial')
    expect(chips).toContain('ev=0')
  })
})

describe('timestamp handling', () => {
  const at = (id: string, timestamp: string, seq = 1) =>
    event({ event_id: id, timestamp, seq })

  // Both of these inverted when timestamps were compared as strings.
  it('orders a fractional second after the whole second it follows', () => {
    const out = sortEvents([
      at('later', '2026-01-01T09:00:00.500000+00:00'),
      at('earlier', '2026-01-01T09:00:00Z'),
    ])
    expect(out.map((e) => e.event_id)).toEqual(['earlier', 'later'])
  })

  it('orders across differing UTC offsets', () => {
    const out = sortEvents([
      at('first', '2026-01-01T09:00:00+01:00'), // 08:00Z
      at('second', '2026-01-01T08:30:00Z'),
    ])
    expect(out.map((e) => e.event_id)).toEqual(['first', 'second'])
  })

  it('breaks exact ties on seq', () => {
    const out = sortEvents([
      at('b', '2026-01-01T09:00:00Z', 2),
      at('a', '2026-01-01T09:00:00Z', 1),
    ])
    expect(out.map((e) => e.event_id)).toEqual(['a', 'b'])
  })

  it('puts unparseable timestamps last rather than scrambling the run', () => {
    const out = sortEvents([
      at('bad', 'not-a-timestamp'),
      at('good', '2026-01-01T09:00:00Z'),
    ])
    expect(out.map((e) => e.event_id)).toEqual(['good', 'bad'])
  })

  it('formats the clock column without assuming a character offset', () => {
    expect(formatClockTime('2026-01-01T08:17:12.259049+00:00')).toBe('08:17:12.259')
    expect(formatClockTime('2026-01-01T08:17:12Z')).toBe('08:17:12.000')
    expect(formatClockTime('2026-01-01T09:17:12+01:00')).toBe('08:17:12.000')
    expect(formatClockTime(null)).toBe('')
    expect(formatClockTime('rubbish')).toBe('—')
  })
})

describe('insertEvent', () => {
  const at = (id: string, timestamp: string) => event({ event_id: id, timestamp })

  it('appends the newest event without re-sorting', () => {
    const existing = [at('a', '2026-01-01T09:00:00Z'), at('b', '2026-01-01T09:00:01Z')]
    const out = insertEvent(existing, at('c', '2026-01-01T09:00:02Z'))
    expect(out.map((e) => e.event_id)).toEqual(['a', 'b', 'c'])
  })

  it('places a late-arriving out-of-order event correctly', () => {
    const existing = [at('a', '2026-01-01T09:00:00Z'), at('c', '2026-01-01T09:00:02Z')]
    const out = insertEvent(existing, at('b', '2026-01-01T09:00:01Z'))
    expect(out.map((e) => e.event_id)).toEqual(['a', 'b', 'c'])
  })

  it('returns the same array reference for a duplicate, so React can skip', () => {
    const existing = [at('a', '2026-01-01T09:00:00Z')]
    expect(insertEvent(existing, at('a', '2026-01-01T09:00:00Z'))).toBe(existing)
  })
})

describe('chip rendering', () => {
  it('skips non-scalar metadata instead of printing [object Object]', () => {
    const chips = eventMetaChips(
      event({
        event_id: 'x',
        type: 'negotiation.finished',
        metadata: { negotiation_status: { nested: 'object' }, evidence_count: 3 },
      }),
    )
    expect(chips.some((c) => c.includes('[object'))).toBe(false)
    expect(chips).toContain('ev=3')
  })

  it('deduplicates chips so they are safe as React keys', () => {
    const chips = eventMetaChips(
      event({
        event_id: 'x',
        type: 'negotiation.finished',
        metadata: { note: 'post_retrieve', negotiation_status: 'post-retrieve' },
      }),
    )
    expect(new Set(chips).size).toBe(chips.length)
  })

  it('ignores free text in note rather than showing it as a phase', () => {
    const label = negotiationPhaseLabel(
      event({
        event_id: 'x',
        type: 'negotiation.finished',
        metadata: { note: 'unrelated operator commentary' },
      }),
    )
    expect(label).toBe('pre-plan') // the domain default, not the note text
  })
})
