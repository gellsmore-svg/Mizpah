import { describe, expect, it } from 'vitest'
import { buildForest, matches } from './components/CallsView'
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
})

describe('matches', () => {
  it('searches step names, payloads, and message contents', () => {
    expect(matches(call({ step_name: 'initial_research' }), 'research')).toBe(true)
    expect(matches(call({ output: 'The Watchtower' }), 'watchtower')).toBe(true)
    expect(matches(call({ messages: [{ role: 'user', content: 'Hello spine' }] }), 'spine')).toBe(true)
    expect(matches(call({}), 'nomatch')).toBe(false)
  })
})
