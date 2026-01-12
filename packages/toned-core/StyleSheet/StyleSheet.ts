import { getConfig } from '../config.ts'
import { StyleMatcher } from '../StyleMatcher/StyleMatcher.ts'
import {
  type Config,
  type ModType,
  SYMBOL_INIT,
  SYMBOL_REF,
  SYMBOL_VARIANTS,
  type TokenStyleDeclaration,
  type TokenSystem,
  type Tokens,
} from '../types.ts'
import { initMedia } from './initMedia.ts'
import { unitlessNumbers } from './unitlessNumbers.ts'

type PseudoState = ':hover' | ':focus' | ':active'

// biome-ignore lint/suspicious/noExplicitAny: ignore
type AnyValue = any

type Ref = AnyValue
type RefStyle = AnyValue

const setStyles = (curr: Ref | undefined, styleObject: RefStyle) => {
  if (!curr) return

  // TODO: move to config
  if (curr.setNativeProps) {
    // TODO: how to merge with existing styles?
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
      // TODO: handle existing classnames (not from toned)
      curr.className = styleObject.className
    }
  }
}

type State = Record<string, Record<PseudoState | 'base', boolean>>

type ElementKey = string

type ElementStyle = AnyValue
type AppliedStyle = AnyValue

type StyleDecl = Record<ElementKey, ElementStyle>

// TODO: make it type safe
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

  // Get element keys (excluding selectors)
  const elementKeys = Object.keys(rules as object).filter(
    (k) =>
      !k.startsWith('[') &&
      !k.includes(':') &&
      k !== 'prototype' &&
      k !== SYMBOL_VARIANTS.toString(),
  )

  for (const elementKey of elementKeys) {
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
        // TODO: fix types
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

    // TODO: think about perf improvements
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
    this.matcher.elementSet.forEach((elementKey) => {
      if (
        this.matcher.isEqual(elementKey, this.modsStylePrev, this.modsStyle)
      ) {
        return
      }

      setStyles(this.refs[elementKey], this.getCurrentStyle(elementKey))
    })
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
