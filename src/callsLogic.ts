import type { LlmCall } from './types'

/**
 * Pure logic behind the LLM Calls debugging view — chain building and search.
 *
 * Kept out of the component deliberately. Mizpah is the watchtower: it is the
 * one place in the family where a dropped record is indistinguishable from the
 * event never having happened, so this module's rule is **over-report rather
 * than under-report**. Anything it cannot place cleanly still gets rendered,
 * flagged, rather than silently disappearing.
 */

export interface CallNode extends LlmCall {
  children: CallNode[]
  /** Set when the call could not be placed normally, so the UI can say why. */
  anomaly?: 'cycle' | 'duplicate-id'
}

/**
 * Group calls into parent → child trees.
 *
 * Three cases that used to lose data:
 *
 * - **Cycles.** If A's parent is B and B's parent is A, neither is a root, so
 *   under a naive attach-then-collect both vanish. Ancestry is now walked
 *   before attaching; a call whose chain revisits itself is promoted to a root
 *   and marked `anomaly: 'cycle'`.
 * - **Duplicate `call_id`.** A Map keyed on the id silently overwrote the
 *   first call. Duplicates are now all kept, marked `anomaly: 'duplicate-id'`;
 *   `call_id` uniqueness is an assumption about every emitter in the family,
 *   and Mizpah cannot verify it.
 * - **Orphans.** A `parent_call_id` outside the fetched batch already became a
 *   root, which is correct, and still does.
 */
export function buildForest(calls: LlmCall[]): CallNode[] {
  const byId = new Map<string, CallNode>()
  const nodes: CallNode[] = []

  for (const call of calls) {
    const node: CallNode = { ...call, children: [] }
    if (byId.has(call.call_id)) {
      // Keep both. The first one owns the id for parent lookups; the later
      // one is shown as a root so it cannot be lost.
      node.anomaly = 'duplicate-id'
    } else {
      byId.set(call.call_id, node)
    }
    nodes.push(node)
  }

  const roots: CallNode[] = []
  for (const node of nodes) {
    if (node.anomaly === 'duplicate-id') {
      roots.push(node)
      continue
    }
    const parent = resolveParent(node, byId)
    if (parent === 'cycle') {
      node.anomaly = 'cycle'
      roots.push(node)
    } else if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

/**
 * The node's parent, `undefined` when it has none (or none in this batch), or
 * the literal `'cycle'` when following the chain returns to the node itself.
 * Bounded by the map size, so a malformed chain cannot spin.
 */
function resolveParent(
  node: CallNode,
  byId: Map<string, CallNode>,
): CallNode | undefined | 'cycle' {
  if (!node.parent_call_id) return undefined
  const parent = byId.get(node.parent_call_id)
  if (!parent || parent === node) return parent === node ? 'cycle' : undefined

  const seen = new Set<string>([node.call_id])
  let cursor: CallNode | undefined = parent
  for (let steps = 0; cursor && steps <= byId.size; steps += 1) {
    if (seen.has(cursor.call_id)) return 'cycle'
    seen.add(cursor.call_id)
    cursor = cursor.parent_call_id ? byId.get(cursor.parent_call_id) : undefined
  }
  return parent
}

/**
 * Case-insensitive search across a call's text.
 *
 * Lowercases the needle itself: this is exported and reusable, and an
 * undocumented "must be pre-lowercased" precondition failed by returning no
 * matches, which is indistinguishable from a search that legitimately found
 * nothing.
 */
export function matches(call: LlmCall, needle: string): boolean {
  const target = needle.toLowerCase()
  if (!target) return true
  const haystack = [
    call.step_name,
    call.session_id,
    call.trace_id,
    call.model,
    call.prompt,
    call.output,
    call.error,
    ...(call.messages ?? []).map((message) => message.content),
  ]
  return haystack.some((value) => value && value.toLowerCase().includes(target))
}
