import { eventState } from '../hosts/types.ts'
import {
  evalExpr,
  isSimpleExpr,
  parseConditionKey,
  serializeExpr,
} from '../utils/conditions.ts'
import { PSEUDO_STATES } from '../utils/pseudo.ts'
import type { Relation } from './relations.ts'
import type { StyleMatcher } from './StyleMatcher.ts'

type Expression = NonNullable<ReturnType<typeof parseConditionKey>>
type Condition = { key: string; expression: Expression }
export interface ControllerPlan {
  readonly keys: readonly string[]
  readonly relations: readonly Relation[]
  readonly relationStates: readonly string[]
  readonly semanticStates: readonly string[]
  readonly trackedPseudos: Readonly<Record<string, readonly string[]>>
  readonly conditions: readonly (Condition & { atoms: readonly Condition[] })[]
  readonly containerNames: readonly string[]
  readonly partContainers: Readonly<Record<string, readonly string[]>>
  readonly directionKeys: readonly string[]
}
const plans = new WeakMap<StyleMatcher, ControllerPlan>()

/** Every node here is freshly authored metadata, never a caller's declaration
 * or an opaque host value. Freeze it in place instead of cloning a snapshot. */
function freezeMetadata<T extends object>(value: T): T {
  for (const key in value) {
    const member = value[key]
    if (member && typeof member === 'object' && !Object.isFrozen(member))
      freezeMetadata(member)
  }
  return Object.freeze(value)
}

/** Declaration-derived controller metadata is immutable and shared. No tokens,
 * measurements, active hosts or selected variants belong in this plan. */
export function controllerPlan(matcher: StyleMatcher): ControllerPlan {
  const existing = plans.get(matcher)
  if (existing) return existing
  const keys = Object.keys(matcher.scheme)
  const relations = keys
    .filter((key) => key.startsWith('relation:'))
    .map((key) => {
      const [scope, sourcePart, part, state] = JSON.parse(
        key.slice('relation:'.length),
      )
      return { scope, sourcePart, part, state } as Relation
    })
  const trackedPseudos: Record<string, readonly string[]> = Object.create(null)
  const semanticStates = new Set<string>()
  for (const [part, states] of Object.entries(matcher.interactions)) {
    trackedPseudos[part] = Object.freeze([
      ...new Set<string>([
        ...PSEUDO_STATES,
        ...Object.keys(states).filter((state) => state !== ':rtl'),
      ]),
    ])
    for (const state of Object.keys(states)) {
      const name = state.slice(1)
      if (name !== 'rtl' && !eventState(name)) semanticStates.add(name)
    }
  }
  const conditions: Array<Condition & { atoms: Condition[] }> = []
  for (const key of keys) {
    if (!key.startsWith('@') || key.startsWith('@platform.')) continue
    const expression = parseConditionKey(key.slice(1))
    if (
      !expression ||
      (isSimpleExpr(expression) && expression[0]![0]!.container === null)
    )
      continue
    const atoms: Condition[] = []
    for (const clause of expression)
      for (const atom of clause) {
        if (atom.container === null) continue
        const positive: Expression = [[{ ...atom, negated: false }]]
        atoms.push({ key: `@${serializeExpr(positive)}`, expression: positive })
      }
    conditions.push({ key, expression, atoms })
  }
  const containerNames = new Set<string>()
  const partContainers: Record<string, string[]> = Object.create(null)
  for (const condition of conditions) {
    const names = new Set(
      condition.expression
        .flat()
        .flatMap((atom) => (atom.container === null ? [] : [atom.container])),
    )
    for (const name of names) containerNames.add(name)
    for (const part of matcher.partsForFacts([
      condition.key,
      ...condition.atoms.map((atom) => atom.key),
    ])) {
      const entries = partContainers[part] ?? []
      partContainers[part] = entries
      for (const name of names) if (!entries.includes(name)) entries.push(name)
    }
  }
  const result: ControllerPlan = freezeMetadata({
    keys,
    relations,
    relationStates: relations.map((relation) => relation.state),
    semanticStates: [...semanticStates],
    trackedPseudos: Object.freeze(trackedPseudos),
    conditions,
    containerNames: [...containerNames],
    partContainers,
    directionKeys: keys.filter((key) => key.endsWith(':rtl')),
  })
  plans.set(matcher, result)
  return result
}

/** Resolve the precompiled condition vocabulary against this candidate's facts.
 * It neither remembers sizes nor publishes anything to a mounted family. */
export function evaluateControllerConditions(
  plan: ControllerPlan,
  system:
    | {
        containers?: Record<string, Record<string, number | string>>
        base?: number
      }
    | undefined,
  facts: Readonly<Record<string, unknown>>,
  sizes: Readonly<Record<string, number>>,
  direction?: 'ltr' | 'rtl',
): Record<string, boolean> | null {
  let result: Record<string, boolean> | null = null
  if (plan.conditions.length) {
    result = {}
    const environment = {
      media: (name: string) => facts[`@${name}`] as boolean | undefined,
      containerPx: (name: string) => sizes[name],
      stepWidth: (container: string, step: string) =>
        system?.containers?.[container]?.[step],
      basePx: system?.base ?? 4,
    }
    for (const condition of plan.conditions) {
      for (const atom of condition.atoms)
        result[atom.key] = evalExpr(atom.expression, environment)
      result[condition.key] = evalExpr(condition.expression, environment)
    }
  }
  if (direction !== undefined)
    for (const key of plan.directionKeys) {
      result ??= {}
      result[key] = direction === 'rtl'
    }
  return result
}
