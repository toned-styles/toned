/** Exact unsigned bitsets. Small plans keep the allocation-free numeric path. */
export type BitSet = number | Uint32Array

export interface BitPosition {
  readonly word: number
  readonly bit: number
}

export function position(index: number): BitPosition {
  return { word: index >>> 5, bit: (1 << (index & 31)) >>> 0 }
}

export function emptyBits(size: number): BitSet {
  return size <= 32 ? 0 : new Uint32Array(Math.ceil(size / 32))
}

export function addBit(bits: BitSet, at: BitPosition): BitSet {
  if (typeof bits === 'number') return (bits | at.bit) >>> 0
  bits[at.word] = (bits[at.word]! | at.bit) >>> 0
  return bits
}

/** The full vector is the key; a folded/hash-only key can alias states. */
export function bitKey(bits: BitSet): number | string {
  return typeof bits === 'number' ? bits : bits.join(':')
}

export function equalBits(
  a: BitSet | undefined,
  b: BitSet | undefined,
): boolean {
  if (a === b) return true
  if (
    a === undefined ||
    b === undefined ||
    typeof a === 'number' ||
    typeof b === 'number'
  )
    return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export interface WordRequirement {
  readonly word: number
  readonly mask: number
  readonly value: number
}

/** One axis may accept several values without expanding the rule into DNF. */
export interface AnyRequirement {
  readonly words: readonly { readonly word: number; readonly mask: number }[]
}

export interface CompiledPredicate {
  readonly bitMask: number
  readonly bitValue: number
  readonly words: readonly WordRequirement[]
  readonly any: readonly AnyRequirement[]
}

export function matchesBits(
  state: BitSet,
  predicate: CompiledPredicate,
): boolean {
  if (typeof state === 'number') {
    if ((state & predicate.bitMask) >>> 0 !== predicate.bitValue) return false
  } else {
    for (const { word, mask, value } of predicate.words) {
      if ((state[word]! & mask) >>> 0 !== value) return false
    }
  }
  for (const requirement of predicate.any) {
    let found = false
    for (const { word, mask } of requirement.words) {
      if ((typeof state === 'number' ? state : state[word]!) & mask) {
        found = true
        break
      }
    }
    if (!found) return false
  }
  return true
}
