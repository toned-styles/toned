import type { QueryPredicate } from '../system/queries.ts'

/** Shared metadata carried from authoring through matching to output resolution.
 * Keep these registry keys stable for declarations crossing package boundaries. */
export const WHEN_RULES = Symbol.for('@toned/when')
export const RULE_LAYERS = Symbol.for('@toned/layers')
export const CONDITIONAL_RULES = Symbol.for('@toned/conditionalRules')
export const TOKEN_OPERATIONS = Symbol.for('@toned/operations')
export interface TokenOperation {
  readonly key: string
  readonly value: unknown
  readonly layer: number
  readonly conditional?: ConditionalRule
}
export interface WhenRule {
  readonly predicate: QueryPredicate
  readonly rules: RuleObject
}
export interface ConditionalRule {
  readonly predicate: QueryPredicate
  readonly style: RuleObject
  readonly part: string
  readonly order: number
}

// The authoring grammar is dynamic at this boundary; the compiler consumes the
// structured rule metadata and never reparses a selector during an update.
// biome-ignore lint/suspicious/noExplicitAny: authoring syntax boundary
export type RuleObject = Record<string, any>
