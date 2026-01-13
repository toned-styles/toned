import { getConfig } from '../system/config.ts'
import type {
  Config,
  ModType,
  TokenStyleDeclaration,
  TokenSystem,
  Tokens,
} from '../types/index.ts'
import { SYMBOL_INIT, SYMBOL_REF, SYMBOL_VARIANTS } from '../utils/symbols.ts'
import { initMedia } from './media.ts'
import { StyleMatcher } from './StyleMatcher.ts'
import { unitlessNumbers } from './unitlessNumbers.ts'

type PseudoState = ':hover' | ':focus' | ':active'

// biome-ignore lint/suspicious/noExplicitAny: internal type alias for dynamic stylesheet values
type AnyValue = any

type Ref = AnyValue
type RefStyle = AnyValue

const setStyles = (curr: Ref | undefined, styleObject: RefStyle) => {
  if (!curr) return

  // React Native path - uses setNativeProps for direct style updates
  // Note: Could be abstracted to config.applyStyles for platform-specific handling
  if (curr.setNativeProps) {
    // Note: Currently replaces all styles; merging would require tracking previous toned styles
    curr.setNativeProps({ style: styleObject.style })
  } else {
    if (styleObject.style) {
      // can't remove style completely as element might styles from other sources
      // curr.removeAttribute('style');
      const result: Record<string, unknown> = {}

      for (const key in styleObject.style) {
        const v = styleObject.style[key]
        if (typeof v === 'number' && !unitlessNumbers.has(key)) {
          result[key] = `${v}px`
        } else {
          result[key] = v
        }
      }
      Object.assign(curr.style, result)
    }
    if (styleObject.className) {
      // Note: This replaces all classNames; preserving non-toned classes would require
      // tracking which classes were added by toned vs external sources
      curr.className = styleObject.className
    }
  }
}

type State = Record<string, Record<PseudoState | 'base', boolean>>

type ElementKey = string

type ElementStyle = AnyValue
type AppliedStyle = AnyValue

type StyleDecl = Record<ElementKey, ElementStyle>

// ModState represents the current state of modifiers (variants, media queries, pseudo-states)
// Kept as AnyValue because keys are dynamic: variant names, breakpoint keys, and element:pseudo combinations
type ModState = AnyValue

/**
 * Deep merge two objects, with source values overriding target values
 */
function deepMerge(target: AnyValue, source: AnyValue): AnyValue {
  if (!source) return target
  if (!target) return source

  const result = { ...target }

  for (const key in source) {
    const sourceVal = source[key]
    const targetVal = target[key]

    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(targetVal, sourceVal)
    } else {
      // Override with source value
      result[key] = sourceVal
    }
  }

  return result
}

/**
 * Merge base rules with variant rules for StyleMatcher
 * StyleMatcher now handles both the new API format and internal format directly
 */
function mergeRules(baseRules: AnyValue, variantRules?: AnyValue): AnyValue {
  if (!variantRules) return baseRules
  return { ...baseRules, ...variantRules }
}

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
    variants: <M extends ModType>(newVariantRules: AnyValue) => {
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
  state: State
  stateCache: Record<ElementKey, Map<number, AppliedStyle>>

  refs: Record<ElementKey, Ref>

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
    this.state = {}
    this.stateCache = {}
    this.refs = {}

    this.matcher = new StyleMatcher(rules)

    const mediaEmitter = initMedia(this.ref)

    // Merge initial mods state with current media query state
    // Note: Object spread is O(n) but n is small (few variants + breakpoints)
    this.modsState = {
      ...modsState,
      ...mediaEmitter.data,
    }
    // this.modsStyle = this.matcher.match(this.modsState)

    this.matchStyles()

    mediaEmitter.sub(() => {
      this.applyState(mediaEmitter.data || {})
    })

    // console.log(this.matcher.list)
  }

  // mergeStyles(a: StyleDecl, b?: StyleDecl) {
  // 	const style: StyleDecl = {}
  //
  // 	for (const key in a) {
  // 		style[key] = Object.assign({}, a[key], b?.[key])
  // 	}
  //
  // 	return style
  // }

  // getInteractionState(key: ElementKey) {
  // 	const {
  // 		base,
  // 		':hover': hover,
  // 		':focus': focus,
  // 		':active': active,
  // 	} = this.state[key]
  //
  // 	return +base | (+hover << 1) | (+focus << 2) | (+active << 3)
  // }

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

  applyTokens(value: ElementStyle): AppliedStyle {
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
    pseudo: PseudoState,
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
