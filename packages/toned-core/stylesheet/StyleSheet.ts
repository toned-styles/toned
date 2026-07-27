import { getConfig } from '../system/config.ts'
import type {
  Config,
  ModType,
  TokenStyleDeclaration,
  TokenSystem,
  Tokens,
} from '../types/index.ts'
import { SYMBOL_INIT, SYMBOL_REF, SYMBOL_VARIANTS } from '../utils/symbols.ts'
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

// Interaction pseudo-states that can be tracked per-element for multi-instance
// stylesheets. Order only affects the internal signature key, not output.
const PSEUDO_STATES = [':hover', ':active', ':focus'] as const

type ElementStyle = AnyValue

type StyleDecl = Record<ElementKey, ElementStyle>

// ModState represents the current state of modifiers (variants, media queries, pseudo-states)
// Kept as AnyValue because keys are dynamic: variant names, breakpoint keys, and element:pseudo combinations
type ModState = AnyValue

export function createStylesheet<
  S extends TokenStyleDeclaration,
  _Mods extends ModType,
  T,
>(ref: TokenSystem<S>, rules: T, variantRules?: AnyValue) {
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
        // Cast needed: TokenSystem generic S doesn't match BaseRef's TokenStyleDeclaration
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

type BaseRef = TokenSystem<TokenStyleDeclaration>
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

  interactiveState: Record<string, Record<string, boolean>> = {}

  _activeEls: Record<string, Set<AnyValue>> = {}

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
    this.rules = rules

    this.tokens = this.config.getTokens()
    this.refs = {}

    const mediaMode =
      this.config.mediaMode ?? (this.config.useMedia ? 'runtime' : false)
    const pseudoMode = this.config.pseudoMode ?? 'runtime'
    this.matcher = new StyleMatcher(rules, {
      cssMediaMode: mediaMode === 'css',
      cssPseudoMode: pseudoMode === 'css',
    })

    if (mediaMode === 'runtime') {
      const mediaEmitter = initMedia(this.ref)

      // Merge initial mods state with current media query state
      // Note: Object spread is O(n) but n is small (few variants + breakpoints)
      this.modsState = {
        ...modsState,
        ...mediaEmitter.data,
      }

      this.matchStyles()

      mediaEmitter.sub(() => {
        this.applyState(mediaEmitter.data || {})
      })
    } else {
      // CSS mode or disabled: no runtime media listeners needed
      this.modsState = { ...modsState }
      this.matchStyles()
    }
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

  // Concatenation of the interaction pseudo-states a single element is currently
  // in (e.g. ':hover:active'), derived from its per-element tracking sets. An
  // empty string means "resting" (no active interaction).
  private elementSignature(elementKey: ElementKey, el: AnyValue): string {
    let signature = ''
    for (const pseudo of PSEUDO_STATES) {
      if (this._activeEls[`${elementKey}${pseudo}`]?.has(el))
        signature += pseudo
    }
    return signature
  }

  // Resolve an element's style for a specific interaction signature, forcing its
  // own pseudo mods to match `signature` and ignoring the shared global ones
  // (which can only represent a single element's state at a time).
  private styleForSignature(
    elementKey: ElementKey,
    signature: string,
  ): AnyValue {
    const elMods = { ...this.modsState }
    for (const pseudo of PSEUDO_STATES) {
      elMods[`${elementKey}${pseudo}`] = signature.includes(pseudo)
    }
    return this.applyTokens(this.matcher.match(elMods)[elementKey])
  }

  // The "resting" style is the element resolved with all of its own interaction
  // pseudo-states forced off. The web binding spreads this declaratively so a
  // sibling's live hover/active/focus (tracked in the shared global modsState)
  // can never leak across instances when React re-applies props on re-render.
  getRestingStyle(elementKey: ElementKey): AnyValue {
    return this.styleForSignature(elementKey, '')
  }

  // Re-apply a single element's own interaction signature imperatively. Called
  // from the web ref callback after each commit: React re-applies the pseudo-free
  // resting style to every element, so an element that is genuinely hovered/
  // active/focused needs its state restored here (and only that element).
  reapplyInteraction(elementKey: ElementKey, el: AnyValue) {
    const signature = this.elementSignature(elementKey, el)
    if (!signature) return
    setStyles(el, this.styleForSignature(elementKey, signature))
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

      const style = this.getCurrentStyle(elementKey)

      if (isSet) {
        // Resolve each element from its OWN hover/active/focus signature whenever
        // the element is interactive — even on a contextless update (media/
        // variant) — so the shared global modsState (which can only represent one
        // element's interaction, and may be stale after an unmount) can never leak
        // a sibling's live state onto other instances. Non-interactive elements
        // share one style. Group by signature to reuse match() results; prune
        // disconnected nodes in-place as we iterate (Set delete during for..of is
        // safe).
        const perElement = isInteractive
        const styleBySignature = perElement ? new Map<string, AnyValue>() : null
        for (const el of ref) {
          if (!el.isConnected) {
            this.pruneEl(elementKey, el)
            continue
          }
          if (styleBySignature) {
            const signature = this.elementSignature(elementKey, el)
            if (!styleBySignature.has(signature)) {
              styleBySignature.set(
                signature,
                this.styleForSignature(elementKey, signature),
              )
            }
            setStyles(el, styleBySignature.get(signature))
          } else {
            setStyles(el, style)
          }
        }
      } else if (ref) {
        // Single ref (native) — unchanged.
        setStyles(ref, style)
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
