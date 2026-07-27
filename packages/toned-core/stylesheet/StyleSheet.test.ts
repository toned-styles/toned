import { describe, expect, test } from 'vitest'
import type {
  Config,
  TokenStyleDeclaration,
  TokenSystem,
} from '../types/index.ts'
import { SYMBOL_INIT } from '../utils/symbols.ts'
import { setStyles } from './applyStyles.ts'
import { StyleMatcher } from './StyleMatcher.ts'
import { Base, createStylesheet } from './StyleSheet.ts'
import {
  createVariantSelector,
  getNamedStyleName,
  isNamedStyleKey,
} from './variantSelector.ts'

// Mock TokenSystem for testing
const mockTokenSystem = {
  system: {},
  config: undefined,
  t: () => ({}),
  stylesheet: () => ({}),
  exec: (_config: unknown, tokenStyle: unknown) => ({
    style: tokenStyle as object,
    className: '',
  }),
} as unknown as TokenSystem<TokenStyleDeclaration>

// Mock Config
const mockConfig: Config = {
  getTokens: () => ({}),
  useClassName: false,
  useMedia: false,
  mediaMode: 'runtime',
  pseudoMode: 'runtime',
  debug: false,
  getProps: function (this: Base, elementKey: string) {
    return { style: this.getCurrentStyle(elementKey).style }
  },
  initRef: () => {},
  initInteraction: () => {},
}

describe('createStylesheet', () => {
  describe('basic functionality', () => {
    test('creates stylesheet with element definitions', () => {
      const rules = {
        container: { bgColor: 'blue' },
        label: { textColor: 'white' },
      }

      const stylesheet = createStylesheet(mockTokenSystem, rules)

      expect(stylesheet).toBeDefined()
      expect(stylesheet).toHaveProperty('variants')
    })

    test('stylesheet has SYMBOL_INIT for initialization', () => {
      const rules = { container: { bgColor: 'blue' } }
      const stylesheet = createStylesheet(mockTokenSystem, rules)

      expect(typeof stylesheet[Symbol.for('@toned/core/SYMBOL_INIT')]).toBe(
        'function',
      )
    })

    test('stylesheet has SYMBOL_REF for system reference', () => {
      const rules = { container: { bgColor: 'blue' } }
      const stylesheet = createStylesheet(mockTokenSystem, rules)

      expect(stylesheet[Symbol.for('@toned/core/SYMBOL_REF')]).toBe(
        mockTokenSystem,
      )
    })
  })

  describe('variants chain', () => {
    test('variants method returns new stylesheet', () => {
      const rules = { container: { bgColor: 'blue' } }
      const stylesheet = createStylesheet(mockTokenSystem, rules)

      const withVariants = stylesheet.variants({
        '[size=sm]': { container: { paddingX: 2 } },
      })

      expect(withVariants).toBeDefined()
      expect(withVariants).not.toBe(stylesheet)
    })

    test('variants can be chained multiple times', () => {
      const rules = { container: { bgColor: 'blue' } }
      const stylesheet = createStylesheet(mockTokenSystem, rules)

      const v1 = stylesheet.variants({
        '[size=sm]': { container: { paddingX: 2 } },
      })

      const v2 = v1.variants({
        '[variant=accent]': { container: { bgColor: 'yellow' } },
      })

      expect(v2).toBeDefined()
      expect(v2).toHaveProperty('variants')
    })
  })

  describe('extend method', () => {
    test('extend method returns new stylesheet', () => {
      const rules = { container: { bgColor: 'blue' } }
      const stylesheet = createStylesheet(mockTokenSystem, rules)

      const extended = stylesheet.extend({
        container: { borderRadius: 'medium' },
      })

      expect(extended).toBeDefined()
      expect(extended).not.toBe(stylesheet)
    })

    test('extend deep merges element styles', () => {
      const rules = {
        container: { bgColor: 'blue', paddingX: 2 },
      }
      const stylesheet = createStylesheet(mockTokenSystem, rules)

      const extended = stylesheet.extend({
        container: { bgColor: 'red', borderRadius: 'medium' },
      })

      expect(extended).toBeDefined()
      expect(extended).toHaveProperty('extend')
      expect(extended).toHaveProperty('variants')
    })

    test('extend can be chained with variants', () => {
      const baseRules = { container: { borderRadius: 'medium' } }
      const stylesheet = createStylesheet(mockTokenSystem, baseRules)

      const extended = stylesheet
        .extend({
          container: { bgColor: 'blue' },
          label: { textColor: 'white' },
        })
        .variants({
          '[size=sm]': { container: { paddingX: 2 } },
        })

      expect(extended).toBeDefined()
    })
  })

  describe('rule transformation', () => {
    test('transforms inline pseudo classes to internal format', () => {
      const rules = {
        container: {
          bgColor: 'blue',
          ':hover': { bgColor: 'red' },
        },
      }

      const stylesheet = createStylesheet(mockTokenSystem, rules)
      expect(stylesheet).toBeDefined()
    })

    test('transforms cross-element selectors', () => {
      const rules = {
        container: { bgColor: 'blue' },
        label: { textColor: 'white' },
        'container:hover': {
          container: { bgColor: 'red' },
          label: { textColor: 'yellow' },
        },
      }

      const stylesheet = createStylesheet(mockTokenSystem, rules)
      expect(stylesheet).toBeDefined()
    })

    test('handles multiple pseudo classes in cross-element selector', () => {
      const rules = {
        container: { bgColor: 'blue' },
        label: { textColor: 'white' },
        'container:active:hover': {
          container: { bgColor: 'green' },
        },
      }

      const stylesheet = createStylesheet(mockTokenSystem, rules)
      expect(stylesheet).toBeDefined()
    })

    test('transforms breakpoints in element styles', () => {
      const rules = {
        container: {
          bgColor: 'blue',
          '@sm': { bgColor: 'red' },
          '@md': { bgColor: 'green' },
        },
      }

      const stylesheet = createStylesheet(mockTokenSystem, rules)
      expect(stylesheet).toBeDefined()
    })

    test('combines base rules with variant rules', () => {
      const rules = {
        container: { bgColor: 'blue' },
        label: { textColor: 'white' },
      }

      const variants = {
        '[variant=accent]': {
          container: { bgColor: 'yellow' },
          label: { textColor: 'black' },
        },
      }

      const stylesheet = createStylesheet(mockTokenSystem, rules, variants)
      expect(stylesheet).toBeDefined()
    })

    test('handles combined variant selectors', () => {
      const rules = {
        container: { bgColor: 'blue' },
      }

      const variants = {
        '[size=sm]': { container: { paddingX: 2 } },
        '[size=md]': { container: { paddingX: 4 } },
        '[size=sm][variant=accent]': { container: { borderColor: 'yellow' } },
      }

      const stylesheet = createStylesheet(mockTokenSystem, rules, variants)
      expect(stylesheet).toBeDefined()
    })
  })
})

describe('Base class', () => {
  test('initializes with rules and config', () => {
    const rules = {
      container: { bgColor: 'blue' },
    }

    const base = new Base({
      ref: mockTokenSystem,
      rules,
      config: mockConfig,
      modsState: {},
    })

    expect(base).toBeDefined()
    expect(base.rules).toBe(rules)
  })

  test('matches styles based on mods state', () => {
    const rules = {
      container: { bgColor: 'blue' },
      '[size=sm]': {
        $container: { paddingX: 2 },
      },
    }

    const base = new Base({
      ref: mockTokenSystem,
      rules,
      config: mockConfig,
      modsState: { size: 'sm' },
    })

    const style = base.getCurrentStyle('container')
    expect(style.style).toHaveProperty('paddingX', 2)
  })

  test('applyState updates styles', () => {
    const rules = {
      container: { bgColor: 'blue' },
      '[size=sm]': {
        $container: { paddingX: 2 },
      },
      '[size=md]': {
        $container: { paddingX: 4 },
      },
    }

    const base = new Base({
      ref: mockTokenSystem,
      rules,
      config: mockConfig,
      modsState: { size: 'sm' },
    })

    expect(base.getCurrentStyle('container').style.paddingX).toBe(2)

    base.applyState({ size: 'md' })

    expect(base.getCurrentStyle('container').style.paddingX).toBe(4)
  })
})

describe('integration: new API with StyleMatcher', () => {
  test('inline pseudo class affects only self element', () => {
    // New API: inline pseudo only affects the element it's defined in
    const transformedRules = {
      container: {
        bgColor: 'blue',
        ':hover': {
          $container: { bgColor: 'red' },
        },
      },
      label: { textColor: 'white' },
    }

    const matcher = new StyleMatcher(transformedRules)

    // Without hover
    const baseStyle = matcher.match({})
    expect(baseStyle.container.bgColor).toBe('blue')
    expect(baseStyle.label.textColor).toBe('white')

    // With hover - only container changes, label stays the same
    const hoverStyle = matcher.match({ 'container:hover': true })
    expect(hoverStyle.container.bgColor).toBe('red')
    expect(hoverStyle.label.textColor).toBe('white')
  })

  test('cross-element pseudo affects multiple elements', () => {
    // Internal format after transformation
    const transformedRules = {
      container: {
        bgColor: 'blue',
        ':hover': {
          $container: { bgColor: 'red' },
          $label: { textColor: 'yellow' },
        },
      },
      label: { textColor: 'white' },
    }

    const matcher = new StyleMatcher(transformedRules)

    // With hover - both container and label change
    const hoverStyle = matcher.match({ 'container:hover': true })
    expect(hoverStyle.container.bgColor).toBe('red')
    expect(hoverStyle.label.textColor).toBe('yellow')
  })

  test('variants apply correctly', () => {
    const transformedRules = {
      container: { bgColor: 'blue' },
      label: { textColor: 'white' },
      '[variant=accent]': {
        $container: { bgColor: 'yellow' },
        $label: { textColor: 'black' },
      },
    }

    const matcher = new StyleMatcher(transformedRules)

    // Without variant
    const baseStyle = matcher.match({})
    expect(baseStyle.container.bgColor).toBe('blue')

    // With variant
    const accentStyle = matcher.match({ variant: 'accent' })
    expect(accentStyle.container.bgColor).toBe('yellow')
    expect(accentStyle.label.textColor).toBe('black')
  })

  test('combined variants work correctly', () => {
    const transformedRules = {
      container: { bgColor: 'blue', paddingX: 0 },
      '[size=sm]': {
        $container: { paddingX: 2 },
      },
      '[variant=accent]': {
        $container: { bgColor: 'yellow' },
      },
      '[size=sm][variant=accent]': {
        $container: { borderColor: 'orange' },
      },
    }

    const matcher = new StyleMatcher(transformedRules)

    // With both size=sm and variant=accent
    const combinedStyle = matcher.match({ size: 'sm', variant: 'accent' })
    expect(combinedStyle.container.paddingX).toBe(2)
    expect(combinedStyle.container.bgColor).toBe('yellow')
    expect(combinedStyle.container.borderColor).toBe('orange')
  })
})

describe('variantSelector', () => {
  test('creates named style keys', () => {
    const $ = createVariantSelector<{ size: 'sm' | 'md' }>(['size'])

    const key = $('my_style')
    expect(key).toBe('$named$_my_style')
    expect(isNamedStyleKey(key)).toBe(true)
    expect(getNamedStyleName(key)).toBe('my_style')
  })

  test('creates single variant selectors', () => {
    const $ = createVariantSelector<{ size: 'sm' | 'md' }>(['size'])

    const key = String($.size('sm'))
    expect(key).toBe('[size=sm]')
  })

  test('creates compound variant selectors in stable order', () => {
    const $ = createVariantSelector<{
      size: 'sm' | 'md'
      variant: 'accent' | 'danger'
    }>(['size', 'variant'])

    // Order of calls doesn't matter - key is always in definition order
    const key1 = String($.size('sm').variant('accent'))
    const key2 = String($.variant('accent').size('sm'))

    expect(key1).toBe('[size=sm][variant=accent]')
    expect(key2).toBe('[size=sm][variant=accent]')
  })

  test('uses wildcard for unspecified variants', () => {
    const $ = createVariantSelector<{
      size: 'sm' | 'md'
      variant: 'accent' | 'danger'
    }>(['size', 'variant'])

    const key = String($.size('sm'))
    expect(key).toBe('[size=sm][variant=*]')
  })

  test('handles multi-value selectors', () => {
    const $ = createVariantSelector<{
      alignment: 'icon-only' | 'icon-left' | 'icon-right'
    }>(['alignment'])

    const key = String($.alignment('icon-only', 'icon-left'))
    // Values are sorted for stability
    expect(key).toBe('[alignment=icon-left][alignment=icon-only]')
  })
})

describe('callback-based variants API', () => {
  test('callback-based variants work with StyleMatcher', () => {
    // Test that * values are treated as wildcards
    const rules = {
      container: { bgColor: 'blue' },
      label: { textColor: 'white' },
      // Simulating what the callback API generates
      '[size=sm][variant=*]': { container: { paddingX: 2 } },
      '[size=*][variant=accent]': {
        container: { bgColor: 'yellow' },
        label: { textColor: 'black' },
      },
    }

    const matcher = new StyleMatcher(rules)

    // With size=sm and variant=accent, both rules should match
    const style = matcher.match({ size: 'sm', variant: 'accent' })

    expect(style.container.paddingX).toBe(2)
    expect(style.container.bgColor).toBe('yellow')
    expect(style.label.textColor).toBe('black')
  })

  test('wildcard matches when variant not specified', () => {
    const rules = {
      container: { bgColor: 'blue' },
      '[size=sm][variant=*]': { container: { paddingX: 2 } },
    }

    const matcher = new StyleMatcher(rules)

    // Without variant specified, should still match
    const style = matcher.match({ size: 'sm' })
    expect(style.container.paddingX).toBe(2)
  })

  test('callback-based variants generate correct selector keys', () => {
    const rules = {
      container: { bgColor: 'blue' },
      sidebar: { bgColor: 'muted' },
    }

    const stylesheet = createStylesheet(mockTokenSystem, rules)
    // biome-ignore lint/suspicious/noExplicitAny: test callback variants
    const withVariants = (stylesheet as any).variants(($: any) => ({
      [$.menuOpen('true')]: {
        sidebar: { bgColor: 'yellow' },
      },
    }))

    expect(withVariants).toBeDefined()

    // Initialize and verify variant applies via matched style
    const base = withVariants[SYMBOL_INIT](mockConfig, { menuOpen: 'true' })
    expect(base.modsStyle.sidebar.bgColor).toBe('yellow')
  })

  test('callback-based variants with single variant key work correctly', () => {
    const rules = {
      container: { bgColor: 'blue' },
    }

    const stylesheet = createStylesheet(mockTokenSystem, rules)
    // biome-ignore lint/suspicious/noExplicitAny: test callback variants
    const withVariants = (stylesheet as any).variants(($: any) => ({
      [$.active('true')]: {
        container: { bgColor: 'red' },
      },
    }))

    // Without variant — base style applies
    const baseInstance = withVariants[SYMBOL_INIT](mockConfig, {})
    expect(baseInstance.modsStyle.container.bgColor).toBe('blue')

    // With variant — overridden style applies
    const activeInstance = withVariants[SYMBOL_INIT](mockConfig, {
      active: 'true',
    })
    expect(activeInstance.modsStyle.container.bgColor).toBe('red')
  })
})

describe('multi-instance interaction state', () => {
  const boxKey = 'box'

  // Internal (transformed) rule format: each interaction pseudo targets self
  // ($box) with a distinct property so per-element results are unambiguous.
  const interactiveRules = {
    box: {
      bgColor: 'base',
      ':hover': { $box: { color: 'hover' } },
      ':active': { $box: { borderColor: 'active' } },
      ':focus': { $box: { outlineColor: 'focus' } },
    },
  }

  // Minimal element stub: setStyles() takes the setNativeProps path (no DOM
  // required) and records the resolved style object it receives.
  function fakeEl() {
    const el = {
      recorded: undefined as Record<string, unknown> | undefined,
      setNativeProps: ({ style }: { style: Record<string, unknown> }) => {
        el.recorded = style
      },
    }
    return el
  }

  function setup() {
    const base = new Base({
      ref: mockTokenSystem,
      rules: interactiveRules,
      config: mockConfig,
      modsState: {},
    })
    const a = fakeEl()
    const b = fakeEl()
    // Two mounted instances sharing one Base (e.g. a list rendered from one
    // useStyles() result).
    base.refs[boxKey] = [a, b]
    return { base, a, b }
  }

  test('hovering one instance does not style its siblings', () => {
    const { base, a, b } = setup()
    base._activeEls['box:hover'] = new Set([a])

    base.applyState(
      { 'box:hover': true },
      { triggerKey: 'box', pseudo: ':hover' },
    )

    expect(a.recorded).toEqual({ bgColor: 'base', color: 'hover' })
    expect(b.recorded).toEqual({ bgColor: 'base' })
  })

  test('pressing a hovered instance does not leak hover onto siblings', () => {
    const { base, a, b } = setup()

    // 1. Hover A.
    base._activeEls['box:hover'] = new Set([a])
    base.applyState(
      { 'box:hover': true },
      { triggerKey: 'box', pseudo: ':hover' },
    )

    // 2. Press A (still hovered). Global modsState now has hover=true AND
    // active=true, but only A is in either set.
    base._activeEls['box:active'] = new Set([a])
    base.applyState(
      { 'box:active': true },
      { triggerKey: 'box', pseudo: ':active' },
    )

    expect(a.recorded).toEqual({
      bgColor: 'base',
      color: 'hover',
      borderColor: 'active',
    })
    // Regression guard: the single-baseStyle approach would apply the global
    // hover style (color: 'hover') to B here.
    expect(b.recorded).toEqual({ bgColor: 'base' })
  })

  test('focusing one instance does not style its siblings', () => {
    const { base, a, b } = setup()
    base._activeEls['box:focus'] = new Set([a])

    base.applyState(
      { 'box:focus': true },
      { triggerKey: 'box', pseudo: ':focus' },
    )

    expect(a.recorded).toEqual({ bgColor: 'base', outlineColor: 'focus' })
    expect(b.recorded).toEqual({ bgColor: 'base' })
  })

  test('a single mounted instance still receives interaction styles', () => {
    const base = new Base({
      ref: mockTokenSystem,
      rules: interactiveRules,
      config: mockConfig,
      modsState: {},
    })
    const only = fakeEl()
    base.refs[boxKey] = [only]
    base._activeEls['box:hover'] = new Set([only])

    base.applyState(
      { 'box:hover': true },
      { triggerKey: 'box', pseudo: ':hover' },
    )

    expect(only.recorded).toEqual({ bgColor: 'base', color: 'hover' })
  })

  test('native-style single ref (no context) applies style via the unchanged path', () => {
    const base = new Base({
      ref: mockTokenSystem,
      rules: interactiveRules,
      config: mockConfig,
      modsState: {},
    })
    // React Native assigns a single element (never an array) and setOn()
    // drives applyState without interaction context. This must take the plain
    // `else if (ref)` branch — identical to the pre-change behaviour — so the
    // multi-instance combo logic can never affect native.
    const nativeEl = fakeEl()
    base.refs[boxKey] = nativeEl

    base.applyState({ 'box:hover': true })

    expect(nativeEl.recorded).toEqual({ bgColor: 'base', color: 'hover' })
  })
})

// Shared fixtures for the re-render / unmount suites below.
const interactiveRules = {
  box: {
    bgColor: 'base',
    ':hover': { $box: { color: 'hover' } },
    ':active': { $box: { borderColor: 'active' } },
    ':focus': { $box: { outlineColor: 'focus' } },
  },
}

function fakeInteractiveEl() {
  const el = {
    isConnected: true,
    recorded: undefined as Record<string, unknown> | undefined,
    // Mimic a DOM node closely enough for setStyles' web branch AND the RN
    // branch. We drive setStyles through setNativeProps to avoid needing a DOM.
    setNativeProps: ({ style }: { style: Record<string, unknown> }) => {
      el.recorded = style
    },
  }
  return el
}

function setupPair() {
  const base = new Base({
    ref: mockTokenSystem,
    rules: interactiveRules,
    config: mockConfig,
    modsState: {},
  })
  const a = fakeInteractiveEl()
  const b = fakeInteractiveEl()
  base.refs['box'] = [a, b]
  return { base, a, b }
}

describe('declarative re-render isolation (multi-instance)', () => {
  test("getRestingStyle strips the element's own pseudo-state even when global modsState carries it", () => {
    const { base, a } = setupPair()

    // Hover A: global modsState now has box:hover = true (shared across siblings).
    base._activeEls['box:hover'] = new Set([a])
    base.applyState(
      { 'box:hover': true },
      { triggerKey: 'box', pseudo: ':hover' },
    )
    expect(base.modsState['box:hover']).toBe(true)

    // The style React spreads declaratively must be the *resting* style, i.e.
    // pseudo-free — otherwise a re-render paints every sibling with A's hover.
    expect(base.getRestingStyle('box').style).toEqual({ bgColor: 'base' })
  })

  test("an external re-render does not leak a hovered element's state onto siblings", () => {
    const { base, a, b } = setupPair()

    // Hover A imperatively (no React render).
    base._activeEls['box:hover'] = new Set([a])
    base.applyState(
      { 'box:hover': true },
      { triggerKey: 'box', pseudo: ':hover' },
    )
    expect(a.recorded).toEqual({ bgColor: 'base', color: 'hover' })
    expect(b.recorded).toEqual({ bgColor: 'base' })

    // Simulate an unrelated React re-render: the declarative (resting) style is
    // re-applied to EVERY mounted element, then each ref callback re-runs.
    const resting = base.getRestingStyle('box')
    for (const el of [a, b]) {
      setStyles(el, resting) // React re-writes the style prop
      base.reapplyInteraction('box', el) // ref callback restores per-element state
    }

    // A keeps its hover; B is never touched by A's state.
    expect(a.recorded).toEqual({ bgColor: 'base', color: 'hover' })
    expect(b.recorded).toEqual({ bgColor: 'base' })
  })

  test('reapplyInteraction is a no-op for an element with no active interaction', () => {
    const { base, b } = setupPair()

    setStyles(b, base.getRestingStyle('box'))
    b.recorded = undefined
    base.reapplyInteraction('box', b)

    expect(b.recorded).toBeUndefined()
  })
})

describe('unmount cleanup (multi-instance)', () => {
  test('pruneDisconnected drops unmounted nodes from refs and every interaction set', () => {
    const { base, a, b } = setupPair()

    base._activeEls['box:hover'] = new Set([a, b])
    base._activeEls['box:focus'] = new Set([b])

    // B unmounts (DOM detaches it) without firing mouseleave/blur.
    b.isConnected = false

    base.pruneDisconnected('box')

    expect(base.refs['box']).toEqual([a])
    expect([...base._activeEls['box:hover']]).toEqual([a])
    expect(base._activeEls['box:focus'].size).toBe(0)
  })

  test('pruneDisconnected is safe when the element has no tracked state', () => {
    const base = new Base({
      ref: mockTokenSystem,
      rules: interactiveRules,
      config: mockConfig,
      modsState: {},
    })

    expect(() => base.pruneDisconnected('box')).not.toThrow()
  })
})

describe('contextless updates do not leak interaction across instances', () => {
  // box reacts to BOTH an interaction pseudo (:hover) and a non-interaction mod
  // (a `size` variant). The variant lets a *contextless* applyState genuinely
  // change box (so isEqual doesn't short-circuit the paint), exercising the
  // path that previously fell back to the shared global style.
  const rules = {
    box: {
      bgColor: 'base',
      ':hover': { $box: { color: 'hover' } },
      '[size=large]': { $box: { pad: 'large' } },
    },
  }

  function setupPair() {
    const base = new Base({
      ref: mockTokenSystem,
      rules,
      config: mockConfig,
      modsState: {},
    })
    const a = fakeInteractiveEl()
    const b = fakeInteractiveEl()
    base.refs['box'] = [a, b]
    return { base, a, b }
  }

  test('a media/variant tick while a sibling is hovered does not paint hover onto others', () => {
    const { base, a, b } = setupPair()

    // Hover A (interaction-triggered, carries context). A → hover, B → resting.
    base._activeEls['box:hover'] = new Set([a])
    base.applyState(
      { 'box:hover': true },
      { triggerKey: 'box', pseudo: ':hover' },
    )
    expect(a.recorded).toEqual({ bgColor: 'base', color: 'hover' })
    expect(b.recorded).toEqual({ bgColor: 'base' })

    // A variant tick arrives with NO interaction context. Global modsState still
    // carries box:hover=true (A is genuinely hovered), but only A is in the
    // hover set, so every element must resolve from its own signature.
    base.applyState({ size: 'large' })

    // A: still hovered + large.
    expect(a.recorded).toEqual({
      bgColor: 'base',
      color: 'hover',
      pad: 'large',
    })
    // B: resting + large. Regression guard: the shared-global fallback painted
    // B with color: 'hover' here.
    expect(b.recorded).toEqual({ bgColor: 'base', pad: 'large' })
  })

  test('after a hovered sibling unmounts, a contextless tick leaves the survivor resting', () => {
    const { base, a, b } = setupPair()

    // Hover A, then A unmounts without firing mouseleave (global stays hover=true).
    base._activeEls['box:hover'] = new Set([a])
    base.applyState(
      { 'box:hover': true },
      { triggerKey: 'box', pseudo: ':hover' },
    )
    a.isConnected = false
    base.pruneDisconnected('box') // React ref(null) path: refs → [b]

    // A contextless tick must not paint the survivor with A's stale hover.
    base.applyState({ size: 'large' })

    expect(b.recorded).toEqual({ bgColor: 'base', pad: 'large' })
  })
})
