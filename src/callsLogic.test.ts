import { describe, expect, it } from 'vitest'
import { buildForest, matches } from './callsLogic'
import type { LlmCall } from './types'

const call = (over: Partial<LlmCall>): LlmCall => ({
  call_id: 'c1', trace_id: 't', session_id: 's', source: 'hoglah',
  step_name: null, parent_call_id: null, model: null, prompt: null,
  messages: null, output: null, error: null, status: 'completed',
  started_at: null, completed_at: null, duration_ms: null, metadata: {},
  ...over,
})

describe('buildForest', () => {
  it('nests children under parents and treats orphans as roots', () => {
    const forest = buildForest([
      call({ call_id: 'root' }),
      call({ call_id: 'child', parent_call_id: 'root' }),
      call({ call_id: 'orphan', parent_call_id: 'not-in-batch' }),
    ])
    expect(forest.map((n) => n.call_id).sort()).toEqual(['orphan', 'root'])
    expect(forest.find((n) => n.call_id === 'root')!.children[0].call_id).toBe('child')
  })

  // A dropped record is indistinguishable from an event that never happened.
  it('keeps both calls in a 2-cycle instead of losing them', () => {
    const forest = buildForest([
      call({ call_id: 'a', parent_call_id: 'b' }),
      call({ call_id: 'b', parent_call_id: 'a' }),
    ])
    expect(forest.map((n) => n.call_id).sort()).toEqual(['a', 'b'])
    expect(forest.every((n) => n.anomaly === 'cycle')).toBe(true)
  })

  it('keeps calls in a longer cycle', () => {
    const forest = buildForest([
      call({ call_id: 'a', parent_call_id: 'c' }),
      call({ call_id: 'b', parent_call_id: 'a' }),
      call({ call_id: 'c', parent_call_id: 'b' }),
    ])
    expect(forest.length).toBe(3)
    expect(forest.every((n) => n.anomaly === 'cycle')).toBe(true)
  })

  it('keeps a self-parented call', () => {
    const [node] = buildForest([call({ call_id: 'self', parent_call_id: 'self' })])
    expect(node.call_id).toBe('self')
    expect(node.anomaly).toBe('cycle')
  })

  it('keeps both calls when call_id is duplicated', () => {
    const forest = buildForest([
      call({ call_id: 'dup', prompt: 'first' }),
      call({ call_id: 'dup', prompt: 'second' }),
    ])
    expect(forest.map((n) => n.prompt).sort()).toEqual(['first', 'second'])
    expect(forest.filter((n) => n.anomaly === 'duplicate-id').length).toBe(1)
  })

  it('does not spin on a chain longer than the batch', () => {
    const calls = Array.from({ length: 200 }, (_, i) =>
      call({ call_id: `c${i}`, parent_call_id: i === 0 ? 'c199' : `c${i - 1}` }),
    )
    expect(buildForest(calls).length).toBe(200)
  })
})

describe('matches', () => {
  it('searches step names, payloads, and message contents', () => {
    expect(matches(call({ step_name: 'initial_research' }), 'research')).toBe(true)
    expect(matches(call({ output: 'The Watchtower' }), 'watchtower')).toBe(true)
    expect(matches(call({ messages: [{ role: 'user', content: 'Hello spine' }] }), 'spine')).toBe(true)
    expect(matches(call({}), 'nomatch')).toBe(false)
  })

  // The needle used to require pre-lowercasing, and failed by finding nothing.
  it('is case-insensitive in both directions', () => {
    const c = call({ output: 'The Watchtower' })
    expect(matches(c, 'Watchtower')).toBe(true)
    expect(matches(c, 'WATCHTOWER')).toBe(true)
    expect(matches(call({ step_name: 'InitialResearch' }), 'initialresearch')).toBe(true)
  })

  it('an empty needle matches everything', () => {
    expect(matches(call({}), '')).toBe(true)
  })
})
