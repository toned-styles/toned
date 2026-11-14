/**
 * `defineMotion(system, spec)`: motion declared against a system, so its
 * transitions can be keyed by the same declared states that style a part
 * (`':open'`, `':saving'`, or `q.all(…)` of them), and so a system that
 * renders only static targets refuses motion at the call.
 */
import type { QueryPredicate } from '../system/queries.ts'
import { decodeQuery, isQueryKey, type QueryKey } from '../system/query-key.ts'
import type { DidYouMean, QuoteList, TonedError } from '../types/errors.ts'
import type { StaticTarget, TargetsOf } from '../types/targets.ts'
import type { MotionOptionsBase, MotionTransition } from './index.ts'
import { validateOptions } from './validate.ts'

/** States every system has; declared ones come from `conditions.states`. */
export const builtInMotionStates = [
  'hover',
  'active',
  'focus',
  'focus-within',
  'focus-visible',
] as const
type BuiltIn = (typeof builtInMotionStates)[number]

type DeclaredStates<Sys> = Sys extends { system: infer S }
  ? S extends { states: infer St }
    ? keyof St & string
    : never
  : never

type StateKeyError<
  K extends string,
  Declared extends string,
> = TonedError<`Unknown state '${K}'.${DidYouMean<K, `:${Declared | BuiltIn}`>} Declared states: ${[Declared] extends [never] ? 'none' : QuoteList<Declared, 8, ':'>}; built-in: ':hover', ':active', ':focus', ':focus-within', ':focus-visible'`>

/** Each `states` key is a declared state, a built-in one, or a `q` query of them. */
export type ValidMotionStates<States, Declared extends string> = {
  [K in keyof States]: K extends `:${Declared | BuiltIn}` | QueryKey
    ? MotionTransition
    : StateKeyError<K & string, Declared>
}

type SystemTargetsOf<Sys> = Sys extends { system: infer S }
  ? TargetsOf<S>
  : never

/** A system that declares only static targets has nothing to animate. */
export type MotionTargetCheck<Sys> = [SystemTargetsOf<Sys>] extends [never]
  ? unknown
  : [Exclude<SystemTargetsOf<Sys>, StaticTarget>] extends [never]
    ? TonedError<`Motion runs on web and native targets; this system declares only ${QuoteList<SystemTargetsOf<Sys>>}. Show the end state with a variant, or declare 'web' or 'native' in targets`>
    : unknown

export type MotionSpec = MotionOptionsBase & {
  /** Transitions keyed by state; the last matching entry wins, else `transition`. */
  states?: Readonly<Record<string, MotionTransition>>
}

/** Type-only key marking a value `defineMotion` returned; never at runtime. */
export declare const MOTION_DECLARATION: unique symbol

/** What `defineMotion` returns: pass it to `attachMotion` or `useMotion`. */
export type MotionDeclaration = Readonly<MotionSpec> & {
  readonly [MOTION_DECLARATION]: true
}

type StateEntry = { predicate: QueryPredicate; transition: MotionTransition }
export type DeclaredMotion = {
  entries: readonly StateEntry[]
  /** Every state name an entry reads, without its colon. */
  names: readonly string[]
  /** Web selectors by state name: the declared selector, or the pseudo-class. */
  selectors: Readonly<Record<string, string>>
}

const declarations = new WeakMap<object, DeclaredMotion>()
export const declaredMotion = (options: object) => declarations.get(options)

const fail = (message: string): never => {
  throw new Error(`[toned/motion] ${message}`)
}

type AnySystem = {
  readonly id?: string
  readonly targets?: readonly string[]
  readonly system: object
  readonly q: unknown
}

export function defineMotion<
  const Sys extends AnySystem,
  const Spec extends MotionSpec,
>(
  system: Sys & MotionTargetCheck<Sys>,
  spec: Spec & {
    states?: ValidMotionStates<Spec['states'], DeclaredStates<Sys>>
  },
): MotionDeclaration {
  validateOptions(spec)
  const targets = system.targets
  if (targets && targets.every((t) => t === 'email' || t === 'pdf'))
    fail(
      `Motion runs on web and native targets; ${system.id ? `'${system.id}'` : 'this system'} declares only ${targets.map((t) => `'${t}'`).join(', ')}. Show the end state with a variant, or declare 'web' or 'native' in targets`,
    )
  const declared =
    (system.system as { states?: Record<string, string> }).states ?? {}
  const names = new Set<string>()
  const atom = (key: string): QueryPredicate => {
    const name = key.startsWith(':') ? key.slice(1) : undefined
    if (
      !name ||
      !(
        name in declared ||
        (builtInMotionStates as readonly string[]).includes(name)
      )
    )
      fail(
        `Unknown state '${key}' in motion states. Declared states: ${
          Object.keys(declared)
            .map((n) => `':${n}'`)
            .join(', ') || 'none'
        }; built-in: ${builtInMotionStates.map((n) => `':${n}'`).join(', ')}`,
      )
    names.add(name!)
    return { op: 'atom', key: name! }
  }
  const bind = (query: QueryPredicate): QueryPredicate => {
    if (query.op === 'atom') return atom(query.key)
    if (query.op === 'not') return { op: 'not', operand: bind(query.operand) }
    if (query.op === 'all' || query.op === 'any')
      return { op: query.op, operands: query.operands.map(bind) }
    return fail(
      'Motion states combine states with q.all, q.any and q.not; a cross-part relation cannot key a transition',
    )
  }
  const entries = Object.entries(spec.states ?? {}).map(
    ([key, transition]) => ({
      predicate: isQueryKey(key) ? bind(decodeQuery(key)) : atom(key),
      transition: transition as MotionTransition,
    }),
  )
  const selectors = Object.fromEntries(
    [...names].map((name) => [name, declared[name] ?? `:${name}`]),
  )
  const declaration = Object.freeze({
    ...spec,
    ...(spec.states ? { states: Object.freeze({ ...spec.states }) } : {}),
  }) as unknown as MotionDeclaration
  declarations.set(declaration, {
    entries,
    names: [...names],
    selectors,
  })
  return declaration
}

export function matches(
  predicate: QueryPredicate,
  facts: ReadonlySet<string>,
): boolean {
  switch (predicate.op) {
    case 'atom':
      return facts.has(predicate.key)
    case 'not':
      return !matches(predicate.operand, facts)
    case 'all':
      return predicate.operands.every((operand) => matches(operand, facts))
    case 'any':
      return predicate.operands.some((operand) => matches(operand, facts))
    default:
      return false
  }
}
