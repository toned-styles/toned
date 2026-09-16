import { resolveCssPlan } from '../backends/css/plan.ts'
import { compileRules, foldOperations, resolvePlan } from '../core/plan.ts'
import { resolveTokenStyle } from '../core/resolve.ts'
import {
  createHostIntegration,
  eventState,
  type HostIntegration,
} from '../hosts/index.ts'
import { getConfig } from '../system/config.ts'
import {
  normalizeDeclarations,
  validateDeclarations,
} from '../system/normalize.ts'
import type {
  Config,
  ElementType,
  ExtractElements,
  InferElementType,
  ModType,
  PickString,
  PreVariantsStylesheet,
  TokenStyleDeclaration,
  TokenSystem,
  Tokens,
} from '../types/index.ts'
import {
  collectAdHocConditions,
  evalExpr,
  isSimpleExpr,
  parseConditionKey,
  serializeExpr,
} from '../utils/conditions.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { PSEUDO_SIGNATURE_SEPARATOR, PSEUDO_STATES } from '../utils/pseudo.ts'
import {
  SYMBOL_DEFAULTS,
  SYMBOL_INIT,
  SYMBOL_REF,
  SYMBOL_VARIANTS,
} from '../utils/symbols.ts'
import { warnOnce } from '../utils/warn.ts'
import {
  prepareHostRelease,
  recordHostCommit,
  releaseHost,
  setStyles,
} from './applyStyles.ts'
import { registerStylesheetPlan } from './plans.ts'
import { PartRelations, type Relation, relationFactKey } from './relations.ts'
import { APPLY_OVERRIDE, RULE_LAYERS, WHEN_RULES } from './rule-protocol.ts'
import { StyleMatcher } from './StyleMatcher.ts'
import {
  deepMerge,
  mergeRules,
  processVariantRules,
} from './variantProcessing.ts'
import { createVariantSelector } from './variantSelector.ts'

// biome-ignore lint/suspicious/noExplicitAny: internal type alias for dynamic stylesheet values
type AnyValue = any

type ElementKey = string

type ApplyContext = { triggerKey?: string; pseudo?: string }
const ATTACHMENTS = new WeakMap<
  object,
  WeakMap<object, { owner: Base; generation: object }>
>()
const HOST_CLEANUPS = new WeakMap<object, WeakMap<object, Set<() => void>>>()

// Bundlers replace `process.env.NODE_ENV`; fall back to non-production when the
// global is unavailable so dev-only warnings still surface in browser bundles.
const IS_PRODUCTION =
  (globalThis as AnyValue)?.process?.env?.NODE_ENV === 'production'

type ElementStyle = AnyValue

type StyleDecl = Record<ElementKey, ElementStyle>

/*
 * Compiled matchers, shared across every Base built from the same rules.
 *
 * `flattenRules` + `compile` are pure over `(rules, cssMediaMode,
 * cssPseudoMode)`, and the bitmask-keyed match cache is instance-independent —
 * so two Buttons need one matcher, not two compilations (measured ~15.6µs per
 * instance, paid again per SSR request). Keyed weakly on the rules object (one
 * per stylesheet, module-lived) and by the two css-mode bits.
 */
const MATCHER_CACHE = new WeakMap<object, Map<number, StyleMatcher>>()

function sharedMatcher(
  rules: BaseRules,
  cssMediaMode: boolean,
  cssPseudoMode: boolean,
  stateAliases: readonly string[],
  platform?: 'web' | 'native',
  sourceOrder = false,
): StyleMatcher {
  let byMode = MATCHER_CACHE.get(rules)
  if (!byMode) {
    byMode = new Map()
    MATCHER_CACHE.set(rules, byMode)
  }
  const key =
    (cssMediaMode ? 1 : 0) |
    (cssPseudoMode ? 2 : 0) |
    (platform === 'native' ? 4 : platform === 'web' ? 8 : 0) |
    (sourceOrder ? 16 : 0)
  let matcher = byMode.get(key)
  if (!matcher) {
    // stateAliases are constant for a given rules object (one system per
    // stylesheet), so they never diverge across cache hits on the same rules.
    matcher = new StyleMatcher(rules, {
      cssMediaMode,
      cssPseudoMode,
      stateAliases,
      platform,
      sourceOrder,
    })
    byMode.set(key, matcher)
  }
  return matcher
}

// ModState represents the current state of modifiers (variants, media queries, pseudo-states)
// Kept as AnyValue because keys are dynamic: variant names, breakpoint keys, and element:pseudo combinations
type ModState = AnyValue

/** The element keys of a rules object — selectors, pseudo keys and the
 * variants symbol are not elements. */
function elementNamesOf(rules: AnyValue): Set<string> {
  const variantSymbolStr = SYMBOL_VARIANTS.toString()
  const names = new Set<string>()
  for (const key in rules as object) {
    if (
      key[0] !== '[' &&
      !key.includes(':') &&
      key !== 'prototype' &&
      key !== variantSymbolStr
    ) {
      names.add(key)
    }
  }
  return names
}

/**
 * Merge an override's variant rules into a sheet's own table.
 *
 * Selector keys sort their axes and values canonically. The sheet and an
 * override therefore agree whether a caller writes $.size('sm').variant('ghost')
 * or $.variant('ghost').size('sm'); no sheet-specific axis seeding is required.
 *
 * Where a matcher exists in both, the override's element rules merge onto the
 * sheet's, property by property, so an override changes what it names and
 * leaves the rest of that matcher standing. A matcher only the override has
 * is appended.
 */
function mergeOverrideVariants(
  sheetVariants: AnyValue,
  variantsArg: ($: AnyValue, q?: AnyValue) => AnyValue,
  baseElements: Set<string>,
  q?: AnyValue,
): AnyValue {
  const existing = sheetVariants ?? {}
  const incoming = processVariantRules(
    variantsArg(createVariantSelector([], { rejectDuplicates: true }), q),
    baseElements,
  )

  const merged: AnyValue = { ...existing }
  for (const key in incoming) {
    const before = merged[key]
    delete merged[key]
    const after = incoming[key]
    if (
      !before ||
      typeof before !== 'object' ||
      !after ||
      typeof after !== 'object'
    ) {
      merged[key] = after
      continue
    }
    const entry: AnyValue = { ...before }
    for (const el in after) {
      const incomingEl = after[el]
      const existingEl = entry[el]
      entry[el] =
        existingEl &&
        typeof existingEl === 'object' &&
        incomingEl &&
        typeof incomingEl === 'object'
          ? { ...existingEl, ...incomingEl }
          : incomingEl
    }
    merged[key] = entry
  }
  return merged
}

export function createStylesheet<
  S extends TokenStyleDeclaration,
  _Mods extends ModType,
  T,
>(
  ref: TokenSystem<S>,
  rules: T,
  variantRules?: AnyValue,
  whenRules: Array<{ predicate: AnyValue; rules: AnyValue }> = [],
  overrideLayers: AnyValue[] = [],
  defaults: Readonly<Record<string, unknown>> = {},
): PreVariantsStylesheet<
  S,
  // Element name → its declared `$$type` — see the note on StylesheetType.
  // `.variants()` routes back through here, so both entry points must record
  // the same thing or an override's typing depends on whether the sheet
  // declared variants.
  { [K in PickString<ExtractElements<T>>]: InferElementType<T, K> },
  PickString<ExtractElements<T>>
> {
  for (const [axis, value] of Object.entries(defaults)) {
    if (
      value === undefined ||
      value === null ||
      !['string', 'number', 'boolean'].includes(typeof value)
    )
      throw new Error(
        `Toned: variant default ${axis} must be a defined scalar value`,
      )
  }
  rules = normalizeDeclarations(rules)
  variantRules = normalizeDeclarations(variantRules)
  // Merge base rules with variants - StyleMatcher handles the format directly
  const mergedRules = { ...mergeRules(rules, variantRules) }
  if (whenRules.length)
    Object.defineProperty(mergedRules, WHEN_RULES, {
      value: whenRules,
      enumerable: true,
    })
  if (overrideLayers.length)
    Object.defineProperty(mergedRules, RULE_LAYERS, {
      value: overrideLayers,
      enumerable: true,
    })
  if (ref.id) validateDeclarations(mergedRules, ref.config ?? {})

  // Register the ad-hoc condition atoms this sheet uses on the system ref, so
  // a css generator that imports the stylesheet modules can emit exactly the
  // toggles in use (see utils/conditions.ts).
  if (ref.usedConditions) {
    collectAdHocConditions(mergedRules, ref.usedConditions)
  }

  class LocalBase extends Base {}

  // Get element keys (excluding selectors) - inline filter for performance
  const variantSymbolStr = SYMBOL_VARIANTS.toString()
  for (const elementKey in rules as object) {
    // Skip selectors and internal properties
    if (
      elementKey[0] === '[' ||
      elementKey.includes(':') ||
      elementKey === 'prototype' ||
      elementKey === variantSymbolStr
    )
      continue
    // Compatibility accessors must not replace controller methods. Public
    // React snapshots project every part independently of this namespace.
    if (elementKey in Base.prototype) continue
    Object.defineProperty(LocalBase.prototype, elementKey, {
      get(this: LocalBase) {
        const result = this.config.getProps.call(this, elementKey)
        return result
      },
    })
  }

  const hasDefaults = Object.keys(defaults).length > 0
  const stylesheet = Object.assign({
    [SYMBOL_REF]: ref,
    [SYMBOL_DEFAULTS]: Object.freeze({ ...defaults }),
    [SYMBOL_INIT]: (config: Config, modsState: ModState) => {
      return new LocalBase({
        // Base is system-agnostic at runtime; S is only meaningful to callers.
        ref: ref as AnyValue,
        rules: mergedRules,
        config,
        modsState: hasDefaults
          ? {
              ...defaults,
              ...Object.fromEntries(
                Object.entries(modsState ?? {}).filter(
                  ([, value]) => value !== undefined,
                ),
              ),
            }
          : modsState,
      })
    },
    // Add variants method for chaining
    variants: <M extends ModType>(variantsArg?: AnyValue): AnyValue => {
      const build = (
        input: AnyValue,
        options?: { defaults?: Record<string, unknown> },
      ) => {
        const raw =
          typeof input === 'function'
            ? input(
                createVariantSelector<M>([], { rejectDuplicates: true }),
                ref.q,
              )
            : input
        const variants = mergeOverrideVariants(
          variantRules,
          () => raw,
          elementNamesOf(rules),
          ref.q,
        )
        return createStylesheet<S, M, T>(
          ref,
          rules,
          variants,
          whenRules,
          overrideLayers,
          { ...defaults, ...options?.defaults },
        )
      }
      return variantsArg === undefined ? build : build(variantsArg)
    },
    when: (predicate: AnyValue, elementRules: AnyValue) =>
      createStylesheet<S, _Mods, T>(
        ref,
        rules,
        variantRules,
        [
          ...whenRules,
          { predicate, rules: normalizeDeclarations(elementRules) },
        ],
        overrideLayers,
        defaults,
      ),
    // Ordinary derivation changes defaults; existing matching variants retain
    // their normal precedence over those defaults.
    extend: (
      extensionRules: AnyValue,
      variantsArg?: ($: AnyValue, q?: AnyValue) => AnyValue,
    ) => {
      const extension = normalizeDeclarations(
        typeof extensionRules === 'function'
          ? extensionRules(ref.q)
          : extensionRules,
      )
      const extendedRules = deepMerge(rules as AnyValue, extension)
      const variants = variantsArg
        ? mergeOverrideVariants(
            variantRules,
            variantsArg,
            elementNamesOf(extendedRules),
            ref.q,
          )
        : variantRules
      return createStylesheet<S, _Mods, AnyValue>(
        ref,
        extendedRules,
        variants,
        whenRules,
        overrideLayers,
        defaults,
      )
    },
    // Subtree/instance override application is a separate, complete precedence
    // layer. No resolver probes or ambient theme reads occur during authoring.
    [APPLY_OVERRIDE]: (
      extensionRules: AnyValue,
      variantsArg?: ($: AnyValue, q?: AnyValue) => AnyValue,
    ) => {
      const extension = normalizeDeclarations(
        typeof extensionRules === 'function'
          ? extensionRules(ref.q)
          : extensionRules,
      )
      const variants = variantsArg
        ? processVariantRules(
            variantsArg(
              createVariantSelector([], { rejectDuplicates: true }),
              ref.q,
            ),
            elementNamesOf(rules),
          )
        : undefined
      const layer = mergeRules(extension, normalizeDeclarations(variants))
      return createStylesheet<S, _Mods, T>(
        ref,
        rules,
        variantRules,
        whenRules,
        [...overrideLayers, layer],
        defaults,
      )
    },
  })

  if (!IS_PRODUCTION && ref.id) {
    for (const diagnostic of compileRules(ref, mergedRules, 'web')
      .diagnostics) {
      warnOnce(
        `shadow:${diagnostic.earlier.id}:${diagnostic.later.id}:${diagnostic.field}`,
        `${diagnostic.later.part}.${diagnostic.field}: later declaration ${diagnostic.later.path.join(' / ')} shadows the earlier compound ${diagnostic.earlier.path.join(' / ')}; source order wins. Use renderer.explain(sheet, inputs) to inspect all writes.`,
      )
    }
  }
  registerStylesheetPlan(stylesheet, {
    ref: ref as AnyValue,
    rules: mergedRules,
  })
  return stylesheet
}

/*
 * `Base` is the untyped runtime engine — it walks rules dynamically and already
 * treats its ref as AnyValue internally. It must therefore accept a system of
 * ANY shape: TokenSystem<S> is invariant in S (StylesheetType<S> takes S in
 * parameter position), so TokenSystem<Concrete> is not assignable to
 * TokenSystem<TokenStyleDeclaration> and pinning it to the open declaration
 * rejects every real system.
 */
// biome-ignore lint/suspicious/noExplicitAny: the runtime engine is system-agnostic
type BaseRef = TokenSystem<any>
type BaseRules = AnyValue

export class Base {
  private readonly host: HostIntegration
  config: Config

  ref: BaseRef
  rules: BaseRules

  tokens: Tokens

  refs: Record<ElementKey, AnyValue>

  matcher: StyleMatcher
  modsState: ModState
  modsStyle!: StyleDecl
  modsStylePrev!: StyleDecl

  _activeEls: Record<string, Set<AnyValue>> = {}

  // Element keys already warned about unisolated cross-element interaction in
  // multi-instance mode (dev-only; warn once per key).
  private _warnedCrossElement = new Set<ElementKey>()

  // The compiled rule last written to each mounted element, so applyElementStyles

  constructor({
    ref,
    rules,
    config,
    modsState,
  }: {
    ref: BaseRef
    rules: BaseRules
    config?: Config
    modsState?: ModState
  }) {
    this.config = { ...(config ?? getConfig()) }
    const backend = this.config.backend
    if (backend) {
      if (backend.requiresBuild && !backend.manifest)
        throw new Error(
          'Toned: backend requires a validated build artifact; use buildTailwind and createTailwindRuntime',
        )
      if (this.config.platform && this.config.platform !== backend.platform) {
        throw new Error(
          `[toned] Backend ${backend.id} targets ${backend.platform}, but the installed host targets ${this.config.platform}`,
        )
      }
      this.config = {
        ...this.config,
        platform: backend.platform,
        mediaMode:
          !backend.browserConditions && this.config.mediaMode === 'css'
            ? 'runtime'
            : this.config.mediaMode,
        pseudoMode:
          !backend.browserConditions && this.config.pseudoMode === 'css'
            ? 'runtime'
            : this.config.pseudoMode,
        useClassName: backend.id === 'css-vars' && this.config.useClassName,
      }
    }

    this.ref = ref
    this.host = createHostIntegration(this.config, ref)
    // '@platform.<name>' keys resolve statically before compilation — matching
    // blocks merge in (and win over siblings), foreign platforms drop. Memoized
    // and identity-preserving, so matcher sharing keys on the resolved tree.
    rules = resolvePlatformKeys(rules, this.config.platform)
    this.rules = rules

    this.tokens = this.config.getTokens()
    this.refs = {}

    const mediaMode =
      this.config.mediaMode ?? (this.config.useMedia ? 'runtime' : false)
    const pseudoMode = this.config.pseudoMode ?? 'runtime'
    // Declared-state aliases live on the system ref (`defineSystem` spreads the
    // config, incl. `states`, into `.system`). They drive the CSS src-state
    // cross-element channel; absent, only `:hover` cross keys compile to CSS.
    const stateAliases = Object.keys(
      (this.ref as { system?: { states?: Record<string, string> } })?.system
        ?.states ?? {},
    )
    this.matcher = sharedMatcher(
      rules,
      mediaMode === 'css',
      pseudoMode === 'css',
      stateAliases,
      this.config.platform,
      !!this.ref.id,
    )

    this.relationDeclarations = Object.keys(this.matcher.scheme)
      .filter((key) => key.startsWith('relation:'))
      .map((key) => {
        const [scope, sourcePart, part, state] = JSON.parse(
          key.slice('relation:'.length),
        )
        return { scope, sourcePart, part, state } as Relation
      })

    if (mediaMode === false && this.matcher.hasMediaRules) {
      warnOnce(
        'media-disabled',
        'this stylesheet declares @breakpoint styles, but media handling is off ' +
          "(useMedia defaults to false) — they will be silently dropped. Set { useMedia: true, mediaMode: 'css' } " +
          "(or mediaMode: 'runtime') in setConfig.",
      )
    }

    // Construction is a pure render candidate. Browser listeners start only
    // when a host commits/mounts this controller.
    this.modsState = { ...modsState }
    this.matchStyles()
  }

  private stopMedia?: () => void
  private predecessor?: Base
  private family: {
    current: Base
    relations: PartRelations
    relationHosts: Map<object, { part: string; detach: () => void }>
    stopRelations: (() => void)[]
    stopStates?: () => void
  } = {
    current: this,
    relations: new PartRelations(),
    relationHosts: new Map(),
    stopRelations: [],
  }

  private readonly relationDeclarations: Relation[]
  private readonly trackedStateCache = new Map<string, readonly string[]>()

  private trackedPseudos(part: string): readonly string[] {
    if (!this.host.semanticStates) return PSEUDO_STATES
    let states = this.trackedStateCache.get(part)
    if (!states) {
      states = [
        ...new Set<string>([
          ...PSEUDO_STATES,
          ...Object.keys(this.matcher.interactions[part] ?? {}),
        ]),
      ]
      this.trackedStateCache.set(part, states)
    }
    return states
  }

  private semanticStateNames(): string[] {
    return [
      ...new Set(
        Object.values(this.matcher.interactions).flatMap((states) =>
          Object.keys(states)
            .map((state) => state.slice(1))
            .filter((state) => !eventState(state)),
        ),
      ),
    ]
  }

  private refreshHostStates(publish = false) {
    const capability = this.host.semanticStates
    if (!capability) return
    const facts: Record<string, boolean> = {}
    let changed = false
    for (const part in this.matcher.interactions) {
      const targets = this.refs[part]
      for (const pseudo of this.trackedPseudos(part)) {
        if (eventState(pseudo.slice(1))) continue
        const key = this.stateKey(part, pseudo)
        const active = new Set<object>()
        if (targets instanceof Set)
          for (const target of targets)
            if (
              this.host.connected(target) &&
              capability.read(target, pseudo.slice(1))
            )
              active.add(target)
        const previous = this._activeEls[key]
        if (
          active.size !== (previous?.size ?? 0) ||
          [...active].some((target) => !previous?.has(target))
        )
          changed = true
        this._activeEls[key] = active
        facts[key] = active.size > 0
      }
    }
    if (publish && changed) {
      // Two sibling hosts can exchange a state while the aggregate fact stays
      // true. Their own signatures still changed and must reach the writer.
      Object.assign(this.modsState, facts)
      this.matchStyles()
      this.modsStylePrev = undefined as AnyValue
      this.applyElementStyles()
    } else Object.assign(this.modsState, facts)
  }

  private startHostStates() {
    this.family.stopStates?.()
    this.family.stopStates = undefined
    if (!this.host.semanticStates) return
    const states = this.semanticStateNames()
    if (!states.length) return
    this.host.semanticStates.validate(states)
    this.refreshHostStates()
    this.family.stopStates = this.host.semanticStates.subscribe(() =>
      this.family.current.refreshHostStates(true),
    )
  }
  private relationQueries(): Relation[] {
    return this.relationDeclarations
  }

  private refreshRelations() {
    this.family.relations.batch(() => {
      this.refreshRelationParents()
      this.refreshRelationStates()
    })
  }

  private refreshRelationParents() {
    const { relationHosts, relations } = this.family
    for (const node of relationHosts.keys()) {
      let parent = this.host.parentOf(node)
      const seen = new Set<object>([node])
      while (parent && !relationHosts.has(parent)) {
        if (seen.has(parent))
          throw new Error('Toned: cyclic host parent topology')
        seen.add(parent)
        parent = this.host.parentOf(parent)
      }
      relations.move(node, parent)
    }
  }

  private refreshRelationStates() {
    for (const relation of this.relationQueries()) {
      // These states are event facts; browser matching cannot replace a
      // committed event snapshot (and native hosts have no selector engine).
      if (eventState(relation.state)) continue
      for (const [host, registration] of this.family.relationHosts) {
        if (registration.part !== relation.part) continue
        const active = this.host.readState(host, relation.state)
        this.family.relations.setState(host, relation.state, active)
      }
    }
  }

  private syncRelationFacts() {
    for (const relation of this.relationQueries())
      this.modsState[relationFactKey(relation)] =
        this.family.relations.matches(relation)
  }

  private validateRelationCapabilities() {
    this.host.validateRelations(
      this.relationQueries().map((relation) => relation.state),
    )
  }

  private startRelations() {
    for (const stop of this.family.stopRelations) stop()
    this.family.stopRelations = []
    const queries = this.relationQueries()
    if (!queries.length) return
    this.validateRelationCapabilities()
    this.refreshRelations()
    for (const relation of queries) {
      let initial = true
      const stop = this.family.relations.subscribe(relation, (value) => {
        const current = this.family.current
        const key = relationFactKey(relation)
        if (initial) current.modsState[key] = value
        else current.applyState({ [key]: value })
      })
      initial = false
      this.family.stopRelations.push(stop)
    }
    this.family.stopRelations.push(
      this.host.subscribeRelations(this.family.relationHosts.keys(), () =>
        this.family.current.refreshRelations(),
      ),
    )
  }

  /** Snapshot only; this never changes the previous committed controller. */
  prepare(previous?: Base) {
    this.predecessor = previous
    if (previous) {
      this.family = previous.family
      for (const key in previous._activeEls)
        this._activeEls[key] = new Set(previous._activeEls[key])
      for (const key in previous.modsState) {
        if (key.startsWith('@') || key.includes(':'))
          this.modsState[key] = previous.modsState[key]
      }
      this.matchStyles()
    }
  }

  /** Runs in React's layout phase, after declarative host mutations. */
  commit() {
    this.family.current = this
    if (this.predecessor) {
      for (const key in this.predecessor._activeEls) {
        this._activeEls[key] = new Set(this.predecessor._activeEls[key])
      }
      this.predecessor = undefined
    }
    for (const key in this._activeEls) {
      for (const node of this._activeEls[key]!)
        if (!this.host.connected(node)) this._activeEls[key]!.delete(node)
      this.modsState[key] = this._activeEls[key]!.size > 0
    }
    const mediaMode =
      this.config.mediaMode ?? (this.config.useMedia ? 'runtime' : false)
    if (mediaMode === 'runtime' && !this.stopMedia) {
      const media = this.host.connectMedia(
        Object.keys(this.matcher.scheme),
        (state) => this.applyState(state),
      )
      this.stopMedia = media.stop
      Object.assign(this.modsState, media.state)
      if (this.lastContainerSizes)
        Object.assign(
          this.modsState,
          this.conditionState(this.lastContainerSizes),
        )
    }
    this.startRelations()
    this.startHostStates()
    this.validateHosts()
    this.matchStyles()
    // Theme changes can change output with an identical matching rule set.
    // Host writers perform the final value diff.
    this.modsStylePrev = undefined as AnyValue
    this.applyElementStyles()
  }

  private mounts = 0
  mount() {
    this.mounts++
    this.commit()
    let mounted = true
    return () => {
      if (!mounted) return
      mounted = false
      if (--this.mounts === 0) this.dispose()
    }
  }

  dispose() {
    this.stopMedia?.()
    this.stopMedia = undefined
    if (this.family.current === this) {
      for (const stop of this.family.stopRelations) stop()
      this.family.stopRelations = []
      this.family.stopStates?.()
      this.family.stopStates = undefined
    }
  }

  attach(
    elementKey: string,
    node: AnyValue,
    toned: AnyValue,
    caller?: AnyValue,
  ) {
    if (!node) return () => {}
    this.validateRelationCapabilities()
    this.host.semanticStates?.validate(this.semanticStateNames())

    let refs = this.refs[elementKey]
    if (!(refs instanceof Set)) refs = this.refs[elementKey] = new Set()
    refs.add(node)
    const generation = {}
    let owners = ATTACHMENTS.get(node)
    if (!owners) {
      owners = new WeakMap()
      ATTACHMENTS.set(node, owners)
    }
    owners.set(this.family, { owner: this, generation })
    recordHostCommit(node, toned, caller, this.family)
    if (this.relationQueries().length) {
      const existing = this.family.relationHosts.get(node)
      if (existing && existing.part !== elementKey) {
        existing.detach()
        this.family.relationHosts.delete(node)
      }
      if (!this.family.relationHosts.has(node))
        this.family.relationHosts.set(node, {
          part: elementKey,
          detach: this.family.relations.register(node, elementKey),
        })
      this.refreshRelations()
      this.syncRelationFacts()
      this.matchStyles()
    }
    const detachHost = this.host.attach(node, this.rules[elementKey] ?? {})
    // Callback refs are commit work too. A child layout effect can dispatch
    // an event before its parent's layout effect, so its candidate must already
    // know the previously committed interaction state.
    if (this.predecessor) {
      for (const key in this.predecessor._activeEls)
        this._activeEls[key] = new Set(this.predecessor._activeEls[key])
    }
    this.refreshHostStates()
    this.reapplyInteraction(elementKey, node)
    let attached = true
    return () => {
      if (!attached) return
      attached = false
      detachHost?.()
      refs.delete(node)
      if (ATTACHMENTS.get(node)?.get(this.family)?.generation === generation)
        prepareHostRelease(node, this.family)
      // React detaches and reattaches callback refs in one commit. Retain
      // transient facts through that handoff, then discard true unmounts.
      queueMicrotask(() => {
        if (ATTACHMENTS.get(node)?.get(this.family)?.generation !== generation)
          return
        ATTACHMENTS.get(node)?.delete(this.family)
        releaseHost(node, this.family)
        const relationship = this.family.relationHosts.get(node)
        this.family.relationHosts.delete(node)
        relationship?.detach()
        this.pruneEl(elementKey, node)
        const current = this.family.current
        current.pruneEl(elementKey, node)
        const changed: Record<string, boolean> = {}
        for (const pseudo of current.trackedPseudos(elementKey)) {
          const key = `${elementKey}${pseudo}`
          const active = current.anyElementActive(elementKey, pseudo)
          if (current.modsState[key] !== active) changed[key] = active
        }
        if (Object.keys(changed).length) current.applyState(changed)
        current.refreshHostStates(true)
        for (const cleanup of HOST_CLEANUPS.get(node)?.get(this.family) ?? [])
          cleanup()
        HOST_CLEANUPS.get(node)?.delete(this.family)
      })
    }
  }

  validateHosts() {
    for (const key in this.refs) {
      const refs = this.refs[key]
      if (refs instanceof Set) for (const node of refs) this.host.validate(node)
    }
  }

  eventOwner(node: AnyValue): Base {
    return ATTACHMENTS.get(node)?.get(this.family)?.owner ?? this.family.current
  }

  onHostDetach(node: AnyValue, cleanup: () => void) {
    let owners = HOST_CLEANUPS.get(node)
    if (!owners) {
      owners = new WeakMap()
      HOST_CLEANUPS.set(node, owners)
    }
    let callbacks = owners.get(this.family)
    if (!callbacks) {
      callbacks = new Set()
      owners.set(this.family, callbacks)
    }
    callbacks.add(cleanup)
    return () => {
      callbacks.delete(cleanup)
    }
  }

  /**
   * The real elements of this stylesheet, each with its declared `$$type`.
   *
   * A binding (useBind/bind) needs both the element list and the primitive each
   * element selects. The list is exactly the matcher's `elementSet` minus the
   * cross-element target keys it also carries (`source:state`, `[attr]`), and
   * `$$type` rides on the merged rule the constructor stored in `this.rules`.
   */
  elementDescriptors(): Array<{ key: string; type?: ElementType }> {
    const out: Array<{ key: string; type?: ElementType }> = []
    for (const key of this.matcher.elementSet) {
      if (key.includes(':') || key[0] === '[') continue
      const rule = (this.rules as Record<string, { $$type?: ElementType }>)[key]
      out.push({ key, type: (rule as AnyValue)?.$kind ?? rule?.$$type })
    }
    return out
  }

  /**
   * The container NAME this element declares itself the root of, if any — the
   * resting `container` declaration, read raw (a container is a structural
   * fact, so it never varies by variant). The binding uses it to attach
   * measurement and provide sizes to descendants in runtime mode.
   */
  containerName(elementKey: ElementKey): string | undefined {
    const decl = (
      this.rules as Record<string, { container?: unknown } | undefined>
    )[elementKey]?.container
    return typeof decl === 'string' ? decl : undefined
  }

  /** The container sizes last fed to conditionState — see applyState. */
  private lastContainerSizes: Record<string, number> | null = null

  /**
   * Condition mods for the given measured ancestor sizes (px per container
   * name), or null when this sheet holds no condition the runtime must
   * evaluate here. In css mode the matcher flattens `'@…'` keys away, so this
   * self-gates to runtime mode. Pure simple breakpoint atoms (`'@md'`) are
   * skipped — sharedMedia owns those mods and the two channels must never
   * fight over one key. Everything else (container atoms, and any algebraic
   * expression) evaluates through utils/conditions.ts: an unmeasured
   * container acts as width 0 — the mobile-first base styles.
   */
  private readonly conditionExpressions = new Map<
    string,
    ReturnType<typeof parseConditionKey>
  >()

  conditionState(
    sizes: Record<string, number>,
  ): Record<string, boolean> | null {
    const containers = (
      this.ref as {
        system?: {
          containers?: Record<string, Record<string, number | string>>
        }
      }
    ).system?.containers
    let out: Record<string, boolean> | null = null
    for (const mod in this.matcher.scheme) {
      if (mod[0] !== '@') continue
      const body = mod.slice(1)
      if (body.startsWith('platform.')) continue
      if (!this.conditionExpressions.has(mod))
        this.conditionExpressions.set(mod, parseConditionKey(body))
      const expr = this.conditionExpressions.get(mod)
      if (!expr) continue
      if (isSimpleExpr(expr) && expr[0]![0]!.container === null) continue
      out ??= {}
      const environment = {
        media: (name: string) =>
          this.modsState[`@${name}`] as boolean | undefined,
        containerPx: (name: string) => sizes[name],
        stepWidth: (c: string, s: string) => containers?.[c]?.[s],
        basePx: (this.ref as { system?: { base?: number } }).system?.base ?? 4,
      }
      // Keep atomic host facts alongside matcher keys. The semantic backend
      // evaluates the same Boolean tree without reparsing composite state keys.
      for (const clause of expr)
        for (const atom of clause) {
          if (atom.container === null) continue
          const positive = { ...atom, negated: false }
          out[`@${serializeExpr([[positive]])}`] = evalExpr(
            [[positive]],
            environment,
          )
        }
      out[mod] = evalExpr(expr, environment)
    }
    // The ':rtl' declared state's runtime half: every `<element>:rtl` mod
    // answers the host's getDirection seam (unset means never matched — the
    // web half is the generated `:dir(rtl)` toggle and needs no runtime).
    const dir = (
      this.config as { getDirection?: () => 'ltr' | 'rtl' }
    ).getDirection?.()
    if (dir !== undefined) {
      for (const mod in this.matcher.scheme) {
        if (!mod.endsWith(':rtl')) continue
        out ??= {}
        out[mod] = dir === 'rtl'
      }
    }
    if (out) this.lastContainerSizes = sizes
    return out
  }

  matchStyles() {
    this.modsStylePrev = this.modsStyle
    this.modsStyle = this.matcher.match(this.modsState)

    if (this.config.debug) {
      console.log('[toned:debug] matchStyles', {
        modsState: this.modsState,
        modsStyle: this.modsStyle,
      })
    }
  }

  getCurrentStyle(key: ElementKey) {
    const result = this.applyTokens(this.modsStyle[key], key)

    return result
  }

  // biome-ignore lint/suspicious/noExplicitAny: return type is dynamic based on token system
  private readonly tokenOutputs = new Map<
    string | undefined,
    WeakMap<object, { tokens: Tokens; output: AnyValue }>
  >()
  private readonly emptyDeclaration = Object.freeze({})

  applyTokens(value: ElementStyle, part?: string, facts = this.modsState): any {
    const declaration = value ?? this.emptyDeclaration
    let cache = this.tokenOutputs.get(part)
    if (!cache) {
      cache = new WeakMap()
      this.tokenOutputs.set(part, cache)
    }
    const previous = cache.get(declaration)
    if (previous?.tokens === this.tokens) return previous.output
    const output = immutableSnapshot(
      this.resolveTokens(declaration, part, facts),
    )
    cache.set(declaration, { tokens: this.tokens, output })
    return output
  }

  private resolveTokens(
    value: ElementStyle,
    part?: string,
    facts = this.modsState,
  ): any {
    const backend = this.config.backend
    if (backend?.resolvePlan && part) {
      const plan = compileRules(
        this.ref as TokenSystem<any>,
        this.rules,
        backend.platform,
      )
      const selected = resolvePlan(
        plan,
        this.ref as TokenSystem<any>,
        this.tokens,
        facts,
        { preserveConditions: backend.browserConditions, part },
      )
      return backend.resolvePlan(selected[part] ?? [], {
        system: this.ref as TokenSystem<any>,
        part,
      })
    }
    const portable =
      this.config.platform === 'native' ||
      (backend && backend.id !== 'css-vars')
    const output: AnyValue = part
      ? portable
        ? foldOperations(
            resolvePlan(
              compileRules(this.ref, this.rules, this.config.platform ?? 'web'),
              this.ref,
              this.tokens,
              facts,
              { part },
            )[part] ?? [],
          )
        : (resolveCssPlan(
            compileRules(this.ref, this.rules, 'web'),
            this.ref,
            this.tokens,
            facts,
            {
              part,
              useClassName: this.config.useClassName,
              mediaMode: this.config.mediaMode,
              pseudoMode: this.config.pseudoMode,
            },
          )[part] ?? { style: {} })
      : portable
        ? resolveTokenStyle(
            this.ref as TokenSystem<any>,
            value ?? {},
            this.tokens,
            this.config.platform ?? 'web',
          )
        : this.ref.exec(
            {
              tokens: this.tokens,
              useClassName: this.config.useClassName,
              platform: this.config.platform,
            },
            value ?? {},
          )
    if (this.config.platform === 'native' && output.style) {
      output.style = { ...output.style }
      for (const variable in this.config.bridgeProps) {
        if (!(variable in output.style)) continue
        output[this.config.bridgeProps![variable]!] = output.style[variable]
        delete output.style[variable]
      }
      delete output.style.containerType
      delete output.style.containerName
    }
    return backend ? { ...output, ...backend.resolve(output) } : output
  }

  // --- per-element interaction state -------------------------------------
  // `_activeEls[`${elementKey}${pseudo}`]` is the single source of truth for
  // which mounted elements are in each pseudo-state. The shared boolean
  // `modsState[`${elementKey}${pseudo}`]` only records "any element active" (for
  // single-instance and cross-element rules) — never read it to answer "is
  // *this* element active?"; use these helpers instead.

  private stateKey(elementKey: ElementKey, pseudo: string): string {
    return `${elementKey}${pseudo}`
  }

  // Mark or clear an element's membership in a pseudo-state.
  setElementActive(
    elementKey: ElementKey,
    pseudo: string,
    el: AnyValue,
    on: boolean,
  ) {
    const key = this.stateKey(elementKey, pseudo)
    let set = this._activeEls[key]
    if (!set) {
      set = new Set()
      this._activeEls[key] = set
    }
    if (on) set.add(el)
    else set.delete(el)
    this.family.relations.setState(el, pseudo.replace(/^:/, ''), on)
  }

  // Are ANY mounted elements for this key in the pseudo-state? Drives the shared
  // global mod written to modsState.
  anyElementActive(elementKey: ElementKey, pseudo: string): boolean {
    return (this._activeEls[this.stateKey(elementKey, pseudo)]?.size ?? 0) > 0
  }

  // The interaction pseudo-states this element is currently in, in canonical
  // order (empty means "resting").
  private activePseudos(elementKey: ElementKey, el: AnyValue): string[] {
    const active: string[] = []
    for (const pseudo of this.trackedPseudos(elementKey)) {
      if (this._activeEls[this.stateKey(elementKey, pseudo)]?.has(el))
        active.push(pseudo)
    }
    return active
  }

  // Stable grouping key for a set of active pseudos. Joined with a separator so
  // it stays unambiguous even if a future pseudo name is a prefix of another
  // (e.g. ':focus' vs ':focus-visible').
  private pseudoSignature(activePseudos: string[]): string {
    return activePseudos.join(PSEUDO_SIGNATURE_SEPARATOR)
  }

  // The compiled match rule for an element with exactly `activePseudos` forced
  // on (and every other interaction pseudo off), ignoring the shared global
  // pseudo mods (which can only represent a single element's state at a time).
  // StyleMatcher caches by mod bitmask, so the returned reference is stable
  // across identical (pseudo + variant + media) state — which drives the
  // redundant-write skip in applyElementStyles.
  private matchedRule(
    elementKey: ElementKey,
    activePseudos: string[],
  ): AnyValue {
    const active = new Set(activePseudos)
    const elMods = { ...this.modsState }
    for (const pseudo of this.trackedPseudos(elementKey)) {
      elMods[this.stateKey(elementKey, pseudo)] = active.has(pseudo)
    }
    return this.matcher.match(elMods)[elementKey]
  }

  // Resolve an element's style for exactly `activePseudos`.
  private styleForPseudos(
    elementKey: ElementKey,
    activePseudos: string[],
  ): AnyValue {
    const facts = { ...this.modsState }
    for (const pseudo of this.trackedPseudos(elementKey))
      facts[this.stateKey(elementKey, pseudo)] = activePseudos.includes(pseudo)
    return this.applyTokens(
      this.matchedRule(elementKey, activePseudos),
      elementKey,
      facts,
    )
  }

  // The "resting" style is the element resolved with all of its own interaction
  // pseudo-states forced off. The web binding spreads this declaratively so a
  // sibling's live hover/active/focus (tracked in the shared global modsState)
  // can never leak across instances when React re-applies props on re-render.
  getRestingStyle(elementKey: ElementKey): AnyValue {
    return this.styleForPseudos(elementKey, [])
  }

  // Re-apply a single element's own interaction state imperatively. Called from
  // the web ref callback after each commit: React re-applies the pseudo-free
  // resting style to every element, so an element that is genuinely hovered/
  // active/focused needs its state restored here (and only that element).
  reapplyInteraction(elementKey: ElementKey, el: AnyValue) {
    const active = this.activePseudos(elementKey, el)
    if (active.length === 0) return
    setStyles(el, this.styleForPseudos(elementKey, active), this.family)
  }

  // Remove a single unmounted element from refs and from every interaction set.
  // O(1). Called lazily from applyElementStyles when a detached node is seen, so
  // there's no O(n) scan on every React ref detach.
  private pruneEl(elementKey: ElementKey, el: AnyValue) {
    const ref = this.refs[elementKey]
    if (ref instanceof Set) ref.delete(el)
    for (const pseudo of this.trackedPseudos(elementKey)) {
      this._activeEls[`${elementKey}${pseudo}`]?.delete(el)
    }
  }

  // A copy of modsState with every element's interaction pseudo mods forced
  // off. Used to resolve non-interactive elements in multi-instance mode so a
  // sibling's live hover/active/focus can never leak across instances.
  private restingModsState(): ModState {
    const elMods = { ...this.modsState }
    for (const triggerKey in this.matcher.interactions) {
      for (const pseudo of this.trackedPseudos(triggerKey)) {
        elMods[this.stateKey(triggerKey, pseudo)] = false
      }
    }
    return elMods
  }

  // Dev-only, once per key: warn when a shared element genuinely varies with
  // another element's interaction (its live style differs from resting) while
  // rendered multi-instance — i.e. the cross-element effect is being suppressed
  // to avoid leaking across instances.
  private warnCrossElementMultiInstance(
    elementKey: ElementKey,
    restingStyle: AnyValue,
  ) {
    if (IS_PRODUCTION || this._warnedCrossElement.has(elementKey)) return
    const liveStyle = this.getCurrentStyle(elementKey)
    if (JSON.stringify(liveStyle) === JSON.stringify(restingStyle)) return
    this._warnedCrossElement.add(elementKey)
    console.warn(
      `[toned] Cross-element interaction targeting "${elementKey}" is not ` +
        'isolated across multiple instances of a shared stylesheet, so it is ' +
        'rendered in its resting state. Use one stylesheet instance per ' +
        'element group to get per-instance cross-element hover/active/focus.',
    )
  }

  applyElementStyles(context?: ApplyContext) {
    for (const elementKey of this.matcher.elementSet) {
      const ref = this.refs[elementKey]
      // Web stores every mounted element for a key in a Set (O(1) add/has/delete);
      // native assigns a single element. `size > 1` is the multi-instance case.
      const isSet = ref instanceof Set
      const isMultiInstance = isSet && ref.size > 1
      const isSelfTarget = context?.triggerKey === elementKey
      const isInteractive = !!this.matcher.interactions[elementKey]

      // For multi-instance self-targets, bypass isEqual (element-level state differs)
      if (!(isMultiInstance && isSelfTarget)) {
        if (
          this.matcher.isEqual(elementKey, this.modsStylePrev, this.modsStyle)
        ) {
          continue
        }
      }

      if (isSet) {
        if (isInteractive) {
          // Resolve each element from its OWN hover/active/focus signature whenever
          // the element is interactive — even on a contextless update (media/
          // variant) — so the shared global modsState (which can only represent one
          // element's interaction, and may be stale after an unmount) can never leak
          // a sibling's live state onto other instances. Group by signature to reuse
          // match() results; prune disconnected nodes in-place as we iterate (Set
          // delete during for..of is safe).
          const styleBySignature = new Map<string, AnyValue>()
          for (const el of ref) {
            if (!this.host.connected(el)) {
              this.pruneEl(elementKey, el)
              continue
            }
            const active = this.activePseudos(elementKey, el)
            const signature = this.pseudoSignature(active)
            if (!styleBySignature.has(signature)) {
              styleBySignature.set(
                signature,
                this.styleForPseudos(elementKey, active),
              )
            }
            setStyles(el, styleBySignature.get(signature), this.family)
          }
        } else if (isMultiInstance) {
          // A non-interactive element shared across instances may still be a
          // cross-element *target* (e.g. `container:hover → { label }`).
          // Resolving it from the shared global state would paint EVERY instance
          // whenever ANY sibling's trigger is active. Resolve from the resting
          // (pseudo-free) state instead: the cross-element effect is suppressed
          // for multi-instance, but never leaks. Single instances keep the live
          // cross-element behavior in the branch below.
          const restingStyle = this.applyTokens(
            this.matcher.match(this.restingModsState())[elementKey],
            elementKey,
            this.restingModsState(),
          )
          this.warnCrossElementMultiInstance(elementKey, restingStyle)
          for (const el of ref) {
            if (!this.host.connected(el)) {
              this.pruneEl(elementKey, el)
              continue
            }
            setStyles(el, restingStyle, this.family)
          }
        } else {
          // Single shared instance: full cross-element behavior is safe.
          const style = this.getCurrentStyle(elementKey)
          for (const el of ref) {
            if (!this.host.connected(el)) {
              this.pruneEl(elementKey, el)
              continue
            }
            setStyles(el, style, this.family)
          }
        }
      } else if (ref) {
        // Single ref (native) — unchanged.
        setStyles(ref, this.getCurrentStyle(elementKey), this.family)
      }
    }
  }

  applyState(modsState: ModState, context?: ApplyContext) {
    if (this.config.debug) {
      console.log('[toned:debug] applyState', {
        prevState: { ...this.modsState },
        newState: modsState,
      })
    }

    Object.assign(this.modsState, modsState)

    // A media change (the sharedMedia sub calls straight in here) must also
    // refresh any ALGEBRAIC condition mods that reference breakpoint atoms —
    // they were computed against the previous media state. Recompute from the
    // last measured sizes; conditionState never calls back into applyState.
    if (this.lastContainerSizes) {
      const conditions = this.conditionState(this.lastContainerSizes)
      if (conditions) Object.assign(this.modsState, conditions)
    }

    this.matchStyles()

    this.applyElementStyles(context)
  }

  setOn = (
    elementKey: ElementKey,
    pseudo: ':hover' | ':focus' | ':active',
    onIn: string,
    onOut: string,
  ) => {
    return {
      [onIn]: () => {
        this.applyState({
          [`${elementKey}${pseudo}`]: true,
        })
      },

      [onOut]: () => {
        this.applyState({
          [`${elementKey}${pseudo}`]: false,
        })
      },
    }
  }
}
