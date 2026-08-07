import { describe, expect, it } from 'vitest'
import {
  countByPreset,
  filterEventsByPreset,
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
  ]

  it('filters decisions', () => {
    expect(filterEventsByPreset(sample, 'decisions').map((e) => e.event_id)).toEqual(['1'])
  })

  it('filters orchestration bucket', () => {
    const ids = filterEventsByPreset(sample, 'orchestration').map((e) => e.event_id)
    expect(ids).toEqual(['1', '2', '3', '4'])
  })

  it('counts presets', () => {
    const c = countByPreset(sample)
    expect(c.all).toBe(5)
    expect(c.decisions).toBe(1)
    expect(c.open_questions).toBe(1)
    expect(c.negotiation).toBe(1)
  })
})
