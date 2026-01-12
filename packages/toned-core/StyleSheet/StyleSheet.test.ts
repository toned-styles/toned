import { describe, expect, test } from 'vitest'
import { StyleMatcher } from '../StyleMatcher/StyleMatcher.ts'
import type { Config, TokenStyleDeclaration, TokenSystem } from '../types.ts'
import { Base, createStylesheet } from './StyleSheet.ts'

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
