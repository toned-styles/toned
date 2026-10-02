import type { BitSet, CompiledPredicate } from './bitset.ts'

/** A conservative index: select by one necessary positive fact, then let the
 * complete predicate decide. OR-only, negated and residual CSS expressions stay
 * in the fallback bucket; neither partial predicates nor source order change. */
export class CandidateIndex<Rule extends CompiledPredicate> {
  private readonly byFact: number[][] = []
  private readonly unconditional: number[] = []
  private readonly indexed: boolean

  constructor(private readonly rules: readonly Rule[]) {
    rules.forEach((rule, index) => {
      const required = rule.words.find((word) => word.value !== 0)
      if (!required) this.unconditional.push(index)
      else {
        const bit = (required.value & -required.value) >>> 0
        const fact = required.word * 32 + (31 - Math.clz32(bit))
        const bucket = this.byFact[fact] ?? []
        this.byFact[fact] = bucket
        bucket.push(index)
      }
    })
    this.indexed = this.unconditional.length < rules.length
  }

  select(state: BitSet): readonly Rule[] {
    if (!this.indexed) return this.rules
    const indices = [...this.unconditional]
    const length = typeof state === 'number' ? 1 : state.length
    for (let word = 0; word < length; word++) {
      let bits = typeof state === 'number' ? state : (state[word] ?? 0)
      while (bits) {
        const bit = (bits & -bits) >>> 0
        const bucket = this.byFact[word * 32 + (31 - Math.clz32(bit))]
        if (bucket) for (const index of bucket) indices.push(index)
        bits = (bits & (bits - 1)) >>> 0
      }
    }
    if (indices.length === this.rules.length) return this.rules
    // Every rule belongs to exactly one bucket. Restore its declaration order
    // before replaying operations, including unconditional override layers.
    indices.sort((a, b) => a - b)
    return indices.map((index) => this.rules[index] as Rule)
  }
}
