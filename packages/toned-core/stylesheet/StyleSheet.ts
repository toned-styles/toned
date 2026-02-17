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

  applyElementStyles() {
    for (const elementKey of this.matcher.elementSet) {
      if (
        this.matcher.isEqual(elementKey, this.modsStylePrev, this.modsStyle)
      ) {
        continue
      }

      setStyles(this.refs[elementKey], this.getCurrentStyle(elementKey))
    }
  }

  applyState(modsState: ModState) {
    if (this.config.debug) {
      console.log('[toned:debug] applyState', {
        prevState: { ...this.modsState },
        newState: modsState,
      })
    }

    Object.assign(this.modsState, modsState)

    this.matchStyles()

    this.applyElementStyles()
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
