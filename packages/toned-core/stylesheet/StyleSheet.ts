import { getConfig } from '../system/config.ts'
import type {
  Config,
  ElementType,
  ExtractElements,
  ModType,
  PickString,
  PreVariantsStylesheet,
  TokenStyle,
  TokenStyleDeclaration,
  TokenSystem,
  Tokens,
} from '../types/index.ts'
import { PSEUDO_SIGNATURE_SEPARATOR, PSEUDO_STATES } from '../utils/pseudo.ts'
import { SYMBOL_INIT, SYMBOL_REF, SYMBOL_VARIANTS } from '../utils/symbols.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { warnOnce } from '../utils/warn.ts'
import { setStyles } from './applyStyles.ts'
import { initMedia } from './media.ts'
import { StyleMatcher } from './StyleMatcher.ts'
import {
  deepMerge,
  extractOrderedKeys,
  mergeRules,
  processVariantRules,
} from './variantProcessing.ts'
import { createVariantSelector } from './variantSelector.ts'

// biome-ignore lint/suspicious/noExplicitAny: internal type alias for dynamic stylesheet values
type AnyValue = any

type ElementKey = string

type ApplyContext = { triggerKey?: string; pseudo?: string }

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
): StyleMatcher {
  let byMode = MATCHER_CACHE.get(rules)
  if (!byMode) {
    byMode = new Map()
    MATCHER_CACHE.set(rules, byMode)
  }
  const key = (cssMediaMode ? 1 : 0) | (cssPseudoMode ? 2 : 0)
  let matcher = byMode.get(key)
  if (!matcher) {
    // stateAliases are constant for a given rules object (one system per
    // stylesheet), so they never diverge across cache hits on the same rules.
    matcher = new StyleMatcher(rules, {
      cssMediaMode,
      cssPseudoMode,
      stateAliases,
    })
    byMode.set(key, matcher)
  }
  return matcher
}

/*
 * One media emitter per token system, not per Base.
 *
 * `initMedia` registers matchMedia listeners that are never removed, so a
 * per-Base emitter leaked a listener set per component instance for the page's
 * life. Shared per system (weakly), with each Base subscribing through a
 * WeakRef so a garbage-collected instance's subscription self-prunes on the
 * next media change instead of pinning the Base forever.
 */
const MEDIA_CACHE = new WeakMap<object, ReturnType<typeof initMedia>>()

function sharedMedia(ref: TokenSystem<AnyValue>): ReturnType<typeof initMedia> {
  let emitter = MEDIA_CACHE.get(ref)
  if (!emitter) {
    emitter = initMedia(ref)
    MEDIA_CACHE.set(ref, emitter)
  }
  return emitter
}

// ModState represents the current state of modifiers (variants, media queries, pseudo-states)
// Kept as AnyValue because keys are dynamic: variant names, breakpoint keys, and element:pseudo combinations
type ModState = AnyValue

export function createStylesheet<
  S extends TokenStyleDeclaration,
  _Mods extends ModType,
  T,
>(
  ref: TokenSystem<S>,
  rules: T,
  variantRules?: AnyValue,
): PreVariantsStylesheet<
  S,
  { [K in PickString<ExtractElements<T>>]: TokenStyle<S> },
  PickString<ExtractElements<T>>
> {
  // Merge base rules with variants - StyleMatcher handles the format directly
  const mergedRules = mergeRules(rules, variantRules)

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
    Object.defineProperty(LocalBase.prototype, elementKey, {
      get(this: LocalBase) {
        const result = this.config.getProps.call(this, elementKey)
        return result
      },
    })
  }

  const stylesheet = Object.assign({
    [SYMBOL_REF]: ref,
    [SYMBOL_INIT]: (config: Config, modsState: ModState) => {
      return new LocalBase({
        // Base is system-agnostic at runtime; S is only meaningful to callers.
        ref: ref as AnyValue,
        rules: mergedRules,
        config,
        modsState,
      })
    },
    // Add variants method for chaining
    variants: <M extends ModType>(
      variantsArg: AnyValue | (($: AnyValue) => AnyValue),
    ) => {
      let newVariantRules: AnyValue

      if (typeof variantsArg === 'function') {
        // Callback-based API
        // First, we need to call the callback to get the rules
        // We'll use a preliminary call to extract keys, then create the real selector
        const preliminaryRules = variantsArg(
          createVariantSelector<M>([] as (keyof M)[]),
        )
        const orderedKeys = extractOrderedKeys(preliminaryRules)

        // Now create the real selector with ordered keys and call again
        const $ = createVariantSelector<M>(orderedKeys as (keyof M)[])
        const rawRules = variantsArg($)

        // Collect base element names
        const baseElements = new Set<string>()
        for (const key in rules as object) {
          if (
            key[0] !== '[' &&
            !key.includes(':') &&
            key !== 'prototype' &&
            key !== SYMBOL_VARIANTS.toString()
          ) {
            baseElements.add(key)
          }
        }

        // Process $compose
        newVariantRules = processVariantRules(rawRules, baseElements)
      } else {
        // Legacy object-based API
        newVariantRules = variantsArg
      }

      return createStylesheet<S, M, T>(ref, rules, newVariantRules)
    },
    // Add extend method for composition
    extend: (extensionRules: AnyValue) => {
      // Deep merge base rules with extension rules
      const extendedRules = deepMerge(rules as AnyValue, extensionRules)
      return createStylesheet<S, never, AnyValue>(
        ref,
        extendedRules,
        variantRules,
      )
    },
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
    this.config = config ?? getConfig()

    this.ref = ref
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
    )

    if (mediaMode === false && this.matcher.hasMediaRules) {
      warnOnce(
        'media-disabled',
        'this stylesheet declares @breakpoint styles, but media handling is off ' +
          "(useMedia defaults to false) — they will be silently dropped. Set { useMedia: true, mediaMode: 'css' } " +
          "(or mediaMode: 'runtime') in setConfig.",
      )
    }

    if (mediaMode === 'runtime') {
      const mediaEmitter = sharedMedia(this.ref)

      // Merge initial mods state with current media query state
      // Note: Object spread is O(n) but n is small (few variants + breakpoints)
      this.modsState = {
        ...modsState,
        ...mediaEmitter.data,
      }

      this.matchStyles()

      // Subscribe through a WeakRef: the emitter outlives any one instance, so
      // a strong `this` here would pin every Base ever mounted. A collected
      // instance unsubscribes itself on the next media change.
      const weakSelf = new WeakRef(this)
      const unsub = mediaEmitter.sub(() => {
        const self = weakSelf.deref()
        if (!self) {
          unsub()
          return
        }
        self.applyState(mediaEmitter.data || {})
      })
    } else {
      // CSS mode or disabled: no runtime media listeners needed
      this.modsState = { ...modsState }
      this.matchStyles()
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
      out.push({ key, type: rule?.$$type })
    }
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
    const result = this.applyTokens(this.modsStyle[key])

    return result
  }

  // biome-ignore lint/suspicious/noExplicitAny: return type is dynamic based on token system
  applyTokens(value: ElementStyle): any {
    return this.ref.exec(
      { tokens: this.tokens, useClassName: this.config.useClassName },
      value,
    )
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
    for (const pseudo of PSEUDO_STATES) {
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
    for (const pseudo of PSEUDO_STATES) {
      elMods[this.stateKey(elementKey, pseudo)] = active.has(pseudo)
    }
    return this.matcher.match(elMods)[elementKey]
  }

  // Resolve an element's style for exactly `activePseudos`.
  private styleForPseudos(
    elementKey: ElementKey,
    activePseudos: string[],
  ): AnyValue {
    return this.applyTokens(this.matchedRule(elementKey, activePseudos))
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
    setStyles(el, this.styleForPseudos(elementKey, active))
  }

  // Remove a single unmounted element from refs and from every interaction set.
  // O(1). Called lazily from applyElementStyles when a detached node is seen, so
  // there's no O(n) scan on every React ref detach.
  private pruneEl(elementKey: ElementKey, el: AnyValue) {
    const ref = this.refs[elementKey]
    if (ref instanceof Set) ref.delete(el)
    for (const pseudo of PSEUDO_STATES) {
      this._activeEls[`${elementKey}${pseudo}`]?.delete(el)
    }
  }

  // A copy of modsState with every element's interaction pseudo mods forced
  // off. Used to resolve non-interactive elements in multi-instance mode so a
  // sibling's live hover/active/focus can never leak across instances.
  private restingModsState(): ModState {
    const elMods = { ...this.modsState }
    for (const triggerKey in this.matcher.interactions) {
      for (const pseudo of PSEUDO_STATES) {
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
            if (!el.isConnected) {
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
            setStyles(el, styleBySignature.get(signature))
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
          )
          this.warnCrossElementMultiInstance(elementKey, restingStyle)
          for (const el of ref) {
            if (!el.isConnected) {
              this.pruneEl(elementKey, el)
              continue
            }
            setStyles(el, restingStyle)
          }
        } else {
          // Single shared instance: full cross-element behavior is safe.
          const style = this.getCurrentStyle(elementKey)
          for (const el of ref) {
            if (!el.isConnected) {
              this.pruneEl(elementKey, el)
              continue
            }
            setStyles(el, style)
          }
        }
      } else if (ref) {
        // Single ref (native) — unchanged.
        setStyles(ref, this.getCurrentStyle(elementKey))
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
