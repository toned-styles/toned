import {
  addBit,
  type BitPosition,
  type BitSet,
  bitKey,
  type CompiledPredicate,
  emptyBits,
  equalBits,
  matchesBits,
  position,
  type WordRequirement,
} from './matcher/bitset.ts'
import { CandidateIndex } from './matcher/candidates.ts'
import {
  applyOperations,
  type Conditions,
  type NormalizedRule,
  normalizeRules,
} from './matcher/normalizeRules.ts'
import {
  compilePredicate,
  evaluatePredicate,
  type PredicatePlan,
} from './matcher/predicate.ts'
import {
  CONDITIONAL_RULES,
  type ConditionalRule,
  type RuleObject,
  TOKEN_OPERATIONS,
  type TokenOperation,
} from './rule-protocol.ts'

const DEFAULT_CACHE_MAX = 1024

type PropertyMap = Record<string, Record<string, BitPosition>>
interface CompiledPart {
  readonly name: string
  readonly style: RuleObject
  readonly operations: readonly TokenOperation[]
}
interface CompiledRule extends CompiledPredicate {
  readonly original: string
  readonly rule: RuleObject
  readonly membership: BitPosition
  readonly expression?: PredicatePlan
  readonly parts: readonly CompiledPart[]
}

function compileParts(rule: RuleObject): CompiledPart[] {
  return Object.entries(rule).map(([name, style]) => ({
    name,
    style,
    operations:
      style[TOKEN_OPERATIONS] ??
      Object.entries(style).map(([key, value]) => ({ key, value, layer: 0 })),
  }))
}

/** Immutable normalized plan and bounded cache. No selector parsing on updates. */
export class StyleMatcher<Schema extends RuleObject = RuleObject> {
  propertyBits: PropertyMap = Object.create(null)
  compiledRules: CompiledRule[] = []
  readonly cssMediaMode: boolean
  readonly cssPseudoMode: boolean
  readonly useAtPrefix = false
  readonly platform: 'web' | 'native'
  readonly scheme: Record<string, Set<string>>
  readonly list: Record<string, { rule: RuleObject }>
  readonly interactions: Record<string, Record<string, boolean>>
  readonly elementSet: Set<string>
  readonly hasMediaRules: boolean
  readonly cacheMax: number
  readonly bits: Array<[string, PropertyMap[string]]>
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous element token values
  readonly cache = new Map<number | string, any>()
  private bitCount = 0
  private readonly candidates?: CandidateIndex<CompiledRule>
  private readonly baseParts: readonly CompiledPart[]
  private readonly results = new WeakMap<
    object,
    {
      membership: Record<string, BitSet>
      predicates: Record<string, string>
    }
  >()

  constructor(
    rules: RuleObject,
    options?: {
      cssMediaMode?: boolean
      cssPseudoMode?: boolean
      cacheMax?: number
      stateAliases?: readonly string[]
      platform?: 'web' | 'native'
      /** Explicit descriptors resolve nested declarations in source order. */
      sourceOrder?: boolean
    },
    /** Internal shared compilation input; omitted for standalone matchers. */
    prepared?: ReturnType<typeof normalizeRules>,
  ) {
    this.cssMediaMode = options?.cssMediaMode ?? false
    this.cssPseudoMode = options?.cssPseudoMode ?? false
    this.platform = options?.platform ?? 'web'
    this.cacheMax = options?.cacheMax ?? DEFAULT_CACHE_MAX
    if (!Number.isInteger(this.cacheMax) || this.cacheMax < 0) {
      throw new Error('StyleMatcher cacheMax must be a non-negative integer')
    }
    const normalized =
      prepared ??
      normalizeRules(rules, {
        cssMediaMode: this.cssMediaMode,
        cssPseudoMode: this.cssPseudoMode,
        stateAliases: options?.stateAliases,
        sourceOrder: options?.sourceOrder,
        platform: options?.platform,
      })
    this.scheme = normalized.scheme
    this.list = normalized.list
    this.interactions = normalized.interactions
    this.elementSet = normalized.elementSet
    this.hasMediaRules = normalized.hasMediaRules
    this.baseParts = compileParts(this.list['']?.rule ?? {})
    this.compile(normalized.ordered)
    this.bits = Object.entries(this.propertyBits)
    // Indexing pays off only for larger plans; keep the small scan allocation-free.
    if (this.compiledRules.length > 32)
      this.candidates = new CandidateIndex(this.compiledRules)
  }

  private compile(rules: readonly NormalizedRule[]) {
    for (const [property, values] of Object.entries(this.scheme)) {
      const entries: Record<string, BitPosition> = Object.create(null)
      this.propertyBits[property] = entries
      for (const value of values) entries[value] = position(this.bitCount++)
    }
    for (const normalized of rules) {
      const entries = normalized.predicate
        ? Object.entries(normalized.rule).map(([part, style]) => ({
            [part]: style,
          }))
        : [normalized.rule]
      for (const rule of entries) {
        const part = Object.keys(rule)[0]!
        this.compiledRules.push({
          ...this.compileMask(normalized.conditions),
          original: normalized.original,
          rule,
          parts: compileParts(rule),
          membership: position(this.compiledRules.length),
          ...(normalized.predicate
            ? {
                expression: compilePredicate(
                  normalized.predicate,
                  { ...this, part },
                  (conditions) => this.compileMask(conditions),
                ),
              }
            : {}),
        })
      }
    }
  }

  private compileMask(conditions: Conditions): CompiledPredicate {
    const required = new Map<number, { mask: number; value: number }>()
    const any: CompiledPredicate['any'][number][] = []
    for (const [property, allowed] of conditions) {
      if (!allowed.length) continue
      const values = this.propertyBits[property]!
      if (allowed.length > 1) {
        const masks = new Map<number, number>()
        for (const value of allowed) {
          const at = values[value]!
          masks.set(at.word, ((masks.get(at.word) ?? 0) | at.bit) >>> 0)
        }
        any.push({ words: [...masks].map(([word, mask]) => ({ word, mask })) })
        continue
      }
      for (const at of Object.values(values)) {
        const word = required.get(at.word) ?? { mask: 0, value: 0 }
        word.mask = (word.mask | at.bit) >>> 0
        required.set(at.word, word)
      }
      const at = values[allowed[0]!]!
      const word = required.get(at.word)!
      word.value = (word.value | at.bit) >>> 0
    }
    const words: WordRequirement[] = [...required].map(([word, rule]) => ({
      word,
      ...rule,
    }))
    return {
      words,
      any,
      bitMask: required.get(0)?.mask ?? 0,
      bitValue: required.get(0)?.value ?? 0,
    }
  }

  /** Numeric for <=32 facts; larger schemes return the complete unsigned vector. */
  getPropsBits(props: Partial<Schema>): BitSet {
    let bits = emptyBits(this.bitCount)
    for (const [property, values] of this.bits) {
      const value = props[property]
      if (value === undefined) continue
      const at = values[value]
      if (at) bits = addBit(bits, at)
    }
    return bits
  }

  match(
    props: Partial<
      Schema &
        Record<`${string}:${string}`, boolean> &
        Record<`@${string}.${string}`, boolean>
    >,
  ) {
    const propsBits = this.getPropsBits(props)
    const key = bitKey(propsBits)
    const cached = this.cache.get(key)
    if (cached !== undefined) {
      this.cache.delete(key)
      this.cache.set(key, cached)
      return cached
    }

    // biome-ignore lint/suspicious/noExplicitAny: output maps tokens for each element
    const result: Record<string | symbol, any> = Object.create(null)
    for (const element of this.elementSet) result[element] = {}
    for (const part of this.baseParts)
      applyOperations(result[part.name], part.operations)
    const membership: Record<string, BitSet> = Object.create(null)
    const predicates: Record<string, string> = Object.create(null)

    for (const rule of this.candidates?.select(propsBits) ??
      this.compiledRules) {
      if (!matchesBits(propsBits, rule)) continue
      const predicate = rule.expression
        ? evaluatePredicate(rule.expression, propsBits)
        : true
      if (predicate === false) continue
      if (rule.expression && (this.cssMediaMode || this.cssPseudoMode)) {
        for (const part of rule.parts) {
          result[part.name][CONDITIONAL_RULES] ??= []
          const entries: ConditionalRule[] =
            result[part.name][CONDITIONAL_RULES]
          const record: ConditionalRule = {
            predicate:
              predicate === true ? { op: 'all', operands: [] } : predicate,
            style: part.style,
            part: part.name,
            order: rule.membership.word * 32 + Math.log2(rule.membership.bit),
          }
          entries.push(record)
          applyOperations(result[part.name], [
            {
              key: '$when',
              value: undefined,
              layer: part.operations[0]?.layer ?? 0,
              conditional: record,
            },
          ])
          const identity = JSON.stringify(predicate)
          predicates[part.name] =
            `${predicates[part.name] ?? ''}${identity.length}:${identity}`
        }
      } else
        for (const part of rule.parts)
          applyOperations(result[part.name], part.operations)
      for (const part of rule.parts) {
        membership[part.name] = addBit(
          membership[part.name] ?? emptyBits(this.compiledRules.length),
          rule.membership,
        )
      }
    }
    this.results.set(result, { membership, predicates })

    if (this.cacheMax > 0) {
      if (this.cache.size >= this.cacheMax) {
        const oldest = this.cache.keys().next().value
        if (oldest !== undefined) this.cache.delete(oldest)
      }
      this.cache.set(key, result)
    }
    return result
  }

  /** Exact rule membership within this plan; different plans never compare equal. */
  // biome-ignore lint/suspicious/noExplicitAny: result metadata is private to the matcher
  isEqual(elementKey: string, style1: any, style2: any) {
    const before = this.results.get(style1)
    const after = this.results.get(style2)
    if (!before || !after) return false
    return (
      before.predicates[elementKey] === after.predicates[elementKey] &&
      equalBits(before.membership[elementKey], after.membership[elementKey])
    )
  }
}
