import { validateGridDeclarations } from '../grid/validation.ts'
import { normalizeRules } from '../stylesheet/matcher/normalizeRules.ts'
import { getStylesheetPlan } from '../stylesheet/plans.ts'
import {
  TOKEN_OPERATIONS,
  type TokenOperation,
} from '../stylesheet/rule-protocol.ts'
import type {
  TokenStyleDeclaration,
  TokenSystem,
  Tokens,
} from '../types/index.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import {
  conditionPredicate,
  evaluatePredicate,
  FALSE,
  type Fact,
  type Facts,
  type Predicate,
  queryPredicate,
  specializePlatform,
  TRUE,
} from './predicates.ts'
import { resolveToken } from './resolve.ts'
import { logicalFields } from './values.ts'

export type { Fact, Facts, Predicate } from './predicates.ts'
export { evaluatePredicate, factKey } from './predicates.ts'

export interface DeclarationOrigin {
  readonly id: string
  readonly part: string
  readonly path: readonly string[]
  readonly token: string
  readonly layer: number
  readonly order: number
  /** Legacy CSS source scope; portable backends retain the ordinary state fact. */
  readonly legacyChannel?: {
    readonly source: string
    readonly state: string
    readonly scope: 'ancestor' | 'sibling'
  }
  readonly source?: {
    readonly file: string
    readonly line: number
    readonly column: number
  }
}
export interface ResolvedOperation {
  /** Original token input, for finite output mappings; never a resolved field. */
  readonly tokenValue?: unknown
  readonly field: string
  readonly value: unknown
  readonly predicate: Predicate
  readonly origin: DeclarationOrigin
}
export interface DeclarationOperation {
  readonly token: string
  readonly value: unknown
  readonly predicate: Predicate
  readonly origin: DeclarationOrigin
}
export interface CompiledPlan {
  readonly id: string
  readonly platform: 'web' | 'native'
  readonly parts: readonly string[]
  readonly kinds: Readonly<Record<string, string>>
  readonly requiredExtensions: readonly string[]
  /** Opaque capability-owned payloads, kept outside portable field operations. */
  readonly extensions: readonly DeclarationOperation[]
  readonly operations: readonly DeclarationOperation[]
  readonly diagnostics: readonly ShadowDiagnostic[]
}
export interface ShadowDiagnostic {
  readonly code: 'shadowed-field'
  readonly field: string
  readonly earlier: DeclarationOrigin
  readonly later: DeclarationOrigin
}

// Stable IDs are content-addressed, never request/mount counters. Hash collisions
// cannot alias plans: caches are keyed by declaration identity, not this label.
function digest(value: string): string {
  let a = 2166136261
  let b = 2246822507
  for (let i = 0; i < value.length; i++) {
    a = Math.imul(a ^ value.charCodeAt(i), 16777619)
    b = Math.imul(b ^ value.charCodeAt(i), 3266489909)
  }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`
}

const partIndexes = new WeakMap<
  CompiledPlan,
  Readonly<Record<string, readonly DeclarationOperation[]>>
>()

function operationsByPart(plan: CompiledPlan) {
  let parts = partIndexes.get(plan)
  if (!parts) {
    const index: Record<string, DeclarationOperation[]> = Object.fromEntries(
      plan.parts.map((part) => [part, []]),
    )
    for (const operation of plan.operations)
      index[operation.origin.part]!.push(operation)
    parts = Object.freeze(
      Object.fromEntries(
        Object.entries(index).map(([part, entries]) => [
          part,
          Object.freeze(entries),
        ]),
      ),
    )
    partIndexes.set(plan, parts)
  }
  return parts
}

const cache = new WeakMap<object, WeakMap<object, Map<string, CompiledPlan>>>()

export function compilePlan(
  system: TokenSystem<any>,
  sheet: object,
  platform: 'web' | 'native',
): CompiledPlan {
  const declaration = getStylesheetPlan(sheet)
  if (declaration.ref !== system)
    throw new Error('Toned: stylesheet belongs to a different system')
  return compileRules(system, declaration.rules, platform)
}

/** Shared declaration compiler. Its result contains only immutable declaration
 * data and semantic facts; CSS selectors/classes and host state are adapters. */
export function compileRules(
  system: TokenSystem<any>,
  rules: Readonly<Record<string, unknown>>,
  platform: 'web' | 'native',
): CompiledPlan {
  const cached = cache.get(rules)?.get(system)?.get(platform)
  if (cached) return cached
  const prepared = resolvePlatformKeys(rules, platform)
  const normalized = normalizeRules(prepared, {
    cssMediaMode: false,
    cssPseudoMode: false,
    sourceOrder: !!system.id,
  })
  const layers = normalized.layers
  const operations: DeclarationOperation[] = []
  const extensions: DeclarationOperation[] = []
  let nextOrder = 0
  const kinds: Record<string, string> = {}
  const requiredExtensions = new Set<string>()
  const append = (
    rule: Record<string, any>,
    predicate: Predicate,
    path: readonly string[],
  ) => {
    predicate = specializePlatform(predicate, platform)
    if (predicate === FALSE) return
    for (const [part, style] of Object.entries(rule)) {
      const entries: readonly TokenOperation[] = style[TOKEN_OPERATIONS] ?? []
      for (const entry of entries) {
        if (entry.key === '$$type' || entry.key === '$kind') {
          kinds[part] = String(entry.value)
          continue
        }
        const extension = ['$grid', '$area', '$webRules', 'className'].includes(
          entry.key,
        )
        if (extension) requiredExtensions.add(entry.key)
        const order = nextOrder++
        const cross =
          path.length === 1 && typeof path[0] === 'string'
            ? /^([^:@[\]]+):([^:]+)$/.exec(path[0])
            : null
        const state = cross?.[2]
        const source = cross?.[1]?.replace(/~$/, '')
        const scope = cross?.[1]?.endsWith('~') ? 'sibling' : 'ancestor'
        const legacyChannel =
          source &&
          source !== part &&
          state &&
          (state === 'hover' ||
            (state === 'focus-within' && scope === 'ancestor') ||
            state in (system.system.states ?? {})) &&
          Object.hasOwn(layers[entry.layer] ?? {}, path[0]!)
            ? { source, state, scope: scope as 'ancestor' | 'sibling' }
            : undefined
        const operation: DeclarationOperation = {
          token: entry.key,
          value: entry.value,
          predicate,
          origin: {
            id: '',
            part,
            path: [...path, part, entry.key],
            token: entry.key,
            layer: entry.layer,
            order,
            ...(legacyChannel ? { legacyChannel } : {}),
          },
        }
        ;(extension ? extensions : operations).push(operation)
        if (typeof system.system[entry.key]?.pseudoRules === 'function') {
          requiredExtensions.add('$pseudoRules')
          extensions.push({
            ...operation,
            token: '$pseudoRules',
            value: { token: entry.key, value: entry.value },
          })
        }
      }
    }
  }
  append(normalized.list['']?.rule ?? {}, TRUE, [])
  for (const entry of normalized.ordered) {
    const operands = [...entry.conditions].map(([key, values]) =>
      conditionPredicate(key, values),
    )
    if (entry.predicate) operands.push(queryPredicate(entry.predicate))
    append(entry.rule, { op: 'all', operands }, [
      ...entry.conditions.keys(),
      ...(entry.predicate ? ['when'] : []),
    ])
  }
  if (platform === 'web') validateGridDeclarations(prepared, extensions)
  if (system.id)
    for (const part of normalized.elementSet) kinds[part] ??= 'view'
  // Override layers are authoritative even when legacy nested traversal was
  // deferred beyond a later unconditional occurrence by the spelling adapter.
  operations.sort((left, right) => left.origin.layer - right.origin.layer)
  extensions.sort((left, right) => left.origin.layer - right.origin.layer)
  const id = `${system.id ?? 'legacy'}-${digest(JSON.stringify({ operations, kinds, extensions }))}`
  for (const entry of [...operations, ...extensions])
    (entry.origin as { id: string }).id = `${id}/${entry.origin.order}`
  // These containers were just created by this compiler. Freeze them directly
  // rather than deep-cloning the complete plan and every shared TRUE predicate.
  // Author-provided token values still cross an immutable snapshot boundary.
  const predicates = new Map<Predicate, Predicate>()
  const freezeOperation = (
    operation: DeclarationOperation,
  ): DeclarationOperation => {
    let predicate = predicates.get(operation.predicate)
    if (!predicate) {
      predicate = immutableSnapshot(operation.predicate)
      predicates.set(operation.predicate, predicate)
    }
    Object.freeze(operation.origin.path)
    if (operation.origin.legacyChannel)
      Object.freeze(operation.origin.legacyChannel)
    if (operation.origin.source) Object.freeze(operation.origin.source)
    Object.freeze(operation.origin)
    return Object.freeze({
      ...operation,
      value: immutableSnapshot(operation.value),
      predicate,
    })
  }
  const immutableOperations = Object.freeze(operations.map(freezeOperation))
  const immutableExtensions = Object.freeze(extensions.map(freezeOperation))
  const plan: CompiledPlan = Object.freeze({
    id,
    platform,
    parts: Object.freeze([...normalized.elementSet]),
    kinds: Object.freeze(kinds),
    requiredExtensions: Object.freeze([...requiredExtensions]),
    operations: immutableOperations,
    extensions: immutableExtensions,
    diagnostics: Object.freeze(
      shadowDiagnostics(system, immutableOperations, platform).map(
        (diagnostic) => Object.freeze(diagnostic),
      ),
    ),
  })
  let systems = cache.get(rules)
  if (!systems) {
    systems = new WeakMap()
    cache.set(rules, systems)
  }
  let platforms = systems.get(system)
  if (!platforms) {
    platforms = new Map()
    systems.set(system, platforms)
  }
  operationsByPart(plan)
  platforms.set(platform, plan)
  return plan
}

/** Only prove conjunction/subset relationships. General Boolean implication is
 * deliberately not guessed, and token resolvers are never probed for footprints. */
function conjunction(predicate: Predicate): Fact[] | undefined {
  if (predicate.op === 'atom') return [predicate.fact]
  if (predicate.op !== 'all') return undefined
  const children = predicate.operands.map(conjunction)
  return children.some((child) => !child)
    ? undefined
    : (children.flat() as Fact[])
}

function implies(earlier: readonly Fact[], later: Fact): boolean {
  if (later.kind === 'variant' && !later.values.length) return true
  return earlier.some((fact) => {
    if (fact.kind !== 'variant' || later.kind !== 'variant')
      return JSON.stringify(fact) === JSON.stringify(later)
    return (
      fact.axis === later.axis &&
      fact.values.length > 0 &&
      fact.values.every((value) => later.values.includes(value))
    )
  })
}

function footprint(
  system: TokenSystem<any>,
  operation: DeclarationOperation,
  platform: 'web' | 'native',
): readonly string[] {
  if (operation.token === 'style' || operation.token === '$style')
    return Object.keys((operation.value ?? {}) as object).flatMap((field) =>
      logicalFields(field, {
        platform,
        ...system.system.layoutContext,
        canonicalFields: !!system.id,
      }),
    )
  const token = system.system[operation.token] as
    | { properties?: readonly string[] }
    | undefined
  return (token?.properties ?? []).flatMap((field) =>
    logicalFields(field, {
      platform,
      ...system.system.layoutContext,
      canonicalFields: !!system.id,
    }),
  )
}

function shadowDiagnostics(
  system: TokenSystem<any>,
  operations: readonly DeclarationOperation[],
  platform: 'web' | 'native',
): ShadowDiagnostic[] {
  const diagnostics: ShadowDiagnostic[] = []
  // A part cannot shadow another part. Prepare facts/footprints once, then
  // compare only its own later writes while retaining global diagnostic order.
  const prepared = operations.map((operation) => ({
    operation,
    facts: conjunction(operation.predicate),
    fields: footprint(system, operation, platform),
    partIndex: 0,
  }))
  const byPart = new Map<string, typeof prepared>()
  for (const entry of prepared) {
    const part = entry.operation.origin.part
    const candidates = byPart.get(part) ?? []
    entry.partIndex = candidates.length
    candidates.push(entry)
    byPart.set(part, candidates)
  }
  for (const earlier of prepared) {
    const before = earlier.facts
    if (!before?.length || !earlier.fields.length) continue
    const candidates = byPart.get(earlier.operation.origin.part)!
    for (
      let index = earlier.partIndex + 1;
      index < candidates.length;
      index++
    ) {
      const later = candidates[index]!
      const after = later.facts
      if (
        !after ||
        !later.fields.length ||
        !after.every((fact) => implies(before, fact))
      )
        continue
      for (const field of earlier.fields) {
        if (later.fields.includes(field))
          diagnostics.push({
            code: 'shadowed-field',
            field,
            earlier: earlier.operation.origin,
            later: later.operation.origin,
          })
      }
    }
  }
  return diagnostics
}

export function resolvePlan(
  plan: CompiledPlan,
  system: TokenSystem<any>,
  tokens: Tokens,
  facts: Facts = {},
  options: {
    preserveConditions?: boolean
    evaluate?: boolean
    part?: string
    /** Explicit backend capability acceptance; payloads remain in plan.extensions. */
    extensions?: readonly string[]
    /** Adapter compatibility may specialize legacy source facts before reduction. */
    predicate?: (operation: DeclarationOperation) => Predicate
  } = {},
): Readonly<Record<string, readonly ResolvedOperation[]>> {
  const unsupported = plan.requiredExtensions.filter(
    (name) => !options.extensions?.includes(name),
  )
  if (unsupported.length)
    throw new Error(
      `Toned portable resolver: ${unsupported.join(', ')} requires the CSS extension backend`,
    )
  const names = options.part === undefined ? plan.parts : [options.part]
  const parts: Record<string, ResolvedOperation[]> = Object.fromEntries(
    names.map((part) => [part, []]),
  )
  const operations =
    options.part === undefined
      ? plan.operations
      : (operationsByPart(plan)[options.part] ?? [])
  for (const operation of operations) {
    const selectedPredicate =
      options.predicate?.(operation) ?? operation.predicate
    const predicate =
      options.evaluate === false
        ? selectedPredicate
        : evaluatePredicate(
            selectedPredicate,
            facts,
            plan.platform,
            options.preserveConditions,
            operation.origin.part,
          )
    if (predicate === FALSE) continue
    const fields = resolveToken(
      system as TokenSystem<TokenStyleDeclaration>,
      operation.token,
      operation.value,
      tokens,
      plan.platform,
    )
    for (const [field, value] of Object.entries(fields)) {
      parts[operation.origin.part]!.push({
        field,
        value,
        tokenValue: operation.value,
        predicate,
        origin: operation.origin,
      })
    }
  }
  return immutableSnapshot(parts)
}

export function foldOperations(operations: readonly ResolvedOperation[]) {
  const style: Record<string, unknown> = {}
  let className: string | undefined
  for (const operation of operations) {
    if (operation.value === undefined) continue
    if (
      operation.predicate !== TRUE &&
      !(
        operation.predicate.op === 'all' &&
        operation.predicate.operands.length === 0
      )
    )
      throw new Error('Toned: symbolic predicates need a build-backed backend')
    if (operation.field === 'className')
      className = [className, operation.value].filter(Boolean).join(' ')
    else style[operation.field] = operation.value
  }
  return { style, ...(className ? { className } : {}) }
}

/** Inspect winners and every competing write without retaining host objects. */
export function explain(
  plan: CompiledPlan,
  system: TokenSystem<any>,
  tokens: Tokens,
  facts: Facts = {},
) {
  const parts = resolvePlan(
    plan.requiredExtensions.length ? { ...plan, requiredExtensions: [] } : plan,
    system,
    tokens,
    facts,
  )
  return immutableSnapshot({
    plan: plan.id,
    diagnostics: plan.diagnostics,
    parts: Object.fromEntries(
      Object.entries(parts).map(([part, operations]) => {
        const fields: Record<
          string,
          {
            value: unknown
            winner: DeclarationOrigin
            writes: DeclarationOrigin[]
          }
        > = {}
        for (const operation of operations) {
          const writes = fields[operation.field]?.writes ?? []
          writes.push(operation.origin)
          fields[operation.field] = {
            value: operation.value,
            winner: operation.origin,
            writes,
          }
        }
        return [part, fields]
      }),
    ),
  })
}
