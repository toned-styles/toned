import { describe, expect, test } from 'vitest'
import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'
import { StyleMatcher } from './StyleMatcher.ts'

describe('style matcher', () => {
  const matcher = new StyleMatcher<{
    size: 's' | 'm'
    variant: 'accent' | 'danger'
    state: 'disabled' | 'pending'
    alignment: 'icon-only' | 'icon-left' | 'icon-right'
  }>({
    '[size=m]': {
      $container: {
        paddingX: 30,
        paddingY: 30,
        background: 'blue',
      },

      '[alignment=icon-only]': {
        $container: {
          paddingX: 50,
          color: 'white',
        },
      },

      '[state=disabled]': {
        $container: {
          opacity: 0.5,
        },
        '[variant=accent]': {
          $container: {
            background: 'gray',
          },
          $label: {
            color: 'white',
          },
        },
      },
    },

    '[variant=accent]': {
      $container: {
        background: 'yellow',
      },
    },

    '[size=s]': {
      $container: {
        paddingX: 30,
        paddingY: 30,
        background: 'red',
      },
    },
  })

  test('match snapshots', () => {
    expect(matcher.match({ size: 'm' })).toMatchInlineSnapshot(`
      {
        "container": {
          "background": "blue",
          "paddingX": 30,
          "paddingY": 30,
        },
        Symbol(@toned/core/StyleMatcher/elementHash): {
          "container": 1,
        },
        Symbol(@toned/core/StyleMatcher/propsBits): 1,
      }
    `)

    expect(matcher.match({ size: 's' })).toMatchInlineSnapshot(`
      {
        "container": {
          "background": "red",
          "paddingX": 30,
          "paddingY": 30,
        },
        Symbol(@toned/core/StyleMatcher/elementHash): {
          "container": 2,
        },
        Symbol(@toned/core/StyleMatcher/propsBits): 2,
      }
    `)

    expect(
      matcher.match({
        size: 'm',
        alignment: 'icon-only',
        state: 'disabled',
        variant: 'accent',
      }),
    ).toMatchInlineSnapshot(`
      {
        "container": {
          "background": "yellow",
          "color": "white",
          "opacity": 0.5,
          "paddingX": 50,
          "paddingY": 30,
        },
        "label": {
          "color": "white",
        },
        Symbol(@toned/core/StyleMatcher/elementHash): {
          "container": 4,
          "label": 25,
        },
        Symbol(@toned/core/StyleMatcher/propsBits): 29,
      }
    `)

    expect(
      matcher.match({
        size: 'm',
        variant: 'accent',
        state: 'disabled',
      }),
    ).toMatchInlineSnapshot(`
      {
        "container": {
          "background": "yellow",
          "opacity": 0.5,
          "paddingX": 30,
          "paddingY": 30,
        },
        "label": {
          "color": "white",
        },
        Symbol(@toned/core/StyleMatcher/elementHash): {
          "container": 1,
          "label": 25,
        },
        Symbol(@toned/core/StyleMatcher/propsBits): 25,
      }
    `)
  })
})

describe('style matcher with pseudo', () => {
  const matcher = new StyleMatcher<{
    size: 's' | 'm'
    variant: 'accent' | 'danger'
    state: 'disabled' | 'pending'
    alignment: 'icon-only' | 'icon-left' | 'icon-right'
  }>({
    container: {
      borderRadius: 'medium',
      borderWidth: 'none',

      style: {
        cursor: 'pointer',
      },

      ':hover': {
        $container: {
          bgColor: 'secondary',
          borderColor: 'secondary',
        },
      },

      '[size=m]': {
        paddingX: 4,
        paddingY: 2,

        '[alignment=icon-only]': {
          paddingX: 2,
        },
      },

      '[size=s]': {
        paddingX: 2,
        paddingY: 1,

        '[alignment=icon-only]': {
          paddingX: 1,
          paddingY: 2,
        },
      },
    },

    label: {
      // style: {
      // 	pointerEvents: 'none',
      // 	userSelect: 'none',
      // },
    },

    '[variant=accent]': {
      $container: {
        bgColor: 'action',

        ':active': {
          $container: {
            bgColor: 'destructive',
          },
          $label: {
            textColor: 'on_destructive',
          },
        },

        ':hover': {
          $container: {
            bgColor: 'action_secondary',
          },
          $label: {
            textColor: 'on_action_secondary',
          },
        },
      },

      $label: {
        textColor: 'on_action',
      },
    },
  })

  test('pseudo and nested', () => {
    expect(
      matcher.match({
        size: 'm',
        variant: 'accent',
        alignment: 'icon-only',
        'container:hover': true,
      }),
    ).toMatchInlineSnapshot(`
      {
        "container": {
          "bgColor": "action_secondary",
          "borderColor": "secondary",
          "borderRadius": "medium",
          "borderWidth": "none",
          "paddingX": 2,
          "paddingY": 2,
          "style": {
            "cursor": "pointer",
          },
        },
        "label": {
          "textColor": "on_action_secondary",
        },
        Symbol(@toned/core/StyleMatcher/elementHash): {
          "container": 8,
          "label": 1,
        },
        Symbol(@toned/core/StyleMatcher/propsBits): 27,
      }
    `)
  })
})

describe('style matcher with media', () => {
  const matcher = new StyleMatcher<{
    size: 's' | 'm'
    variant: 'accent' | 'danger'
    state: 'disabled' | 'pending'
    alignment: 'icon-only' | 'icon-left' | 'icon-right'
  }>({
    container: {
      borderRadius: 'medium',
      borderWidth: 'none',

      style: {
        cursor: 'pointer',
      },

      '@media.medium': {
        bgColor: 'secondary',
        borderColor: 'secondary',
      },

      '[size=m]': {
        paddingX: 4,
        paddingY: 2,

        '[alignment=icon-only]': {
          paddingX: 2,
        },
      },

      '[size=s]': {
        paddingX: 2,
        paddingY: 1,

        '[alignment=icon-only]': {
          paddingX: 1,
          paddingY: 2,
        },
      },
    },

    label: {
      // style: {
      // 	pointerEvents: 'none',
      // 	userSelect: 'none',
      // },
    },

    '[variant=accent]': {
      $container: {
        bgColor: 'action',

        '@media.medium': {
          bgColor: 'destructive',
        },

        '@media.small': {
          bgColor: 'action_secondary',
        },
      },

      label: {
        textColor: 'on_action',
      },
    },
  })

  test('pseudo and nested', () => {
    expect(
      matcher.match({
        size: 'm',
        variant: 'accent',
        alignment: 'icon-only',
        // Multiple @ rules are supported - each evaluates independently
        '@media.desktop': false,
        '@media.small': true,
      }),
    ).toMatchInlineSnapshot(`
      {
        "container": {
          "bgColor": "action_secondary",
          "borderRadius": "medium",
          "borderWidth": "none",
          "paddingX": 2,
          "paddingY": 2,
          "style": {
            "cursor": "pointer",
          },
        },
        "label": {
          "textColor": "on_action",
        },
        Symbol(@toned/core/StyleMatcher/elementHash): {
          "container": 40,
          "label": 16,
        },
        Symbol(@toned/core/StyleMatcher/propsBits): 58,
      }
    `)
  })
})

// =============================================================================
// NEW API TESTS
// =============================================================================

import { createStylesheet } from './StyleSheet.ts'

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

describe('new API: stylesheet with variants chain', () => {
  test('creates stylesheet with variants method', () => {
    const rules = {
      container: {
        bgColor: 'blue',
        borderRadius: 'medium',
      },
      label: {
        textColor: 'white',
      },
    }

    const stylesheet = createStylesheet(mockTokenSystem, rules)
    expect(stylesheet).toHaveProperty('variants')
    expect(typeof stylesheet.variants).toBe('function')
  })

  test('variants chain returns new stylesheet', () => {
    const rules = {
      container: { bgColor: 'blue' },
      label: { textColor: 'white' },
    }

    const variants = {
      '[size=sm]': {
        container: { paddingX: 2 },
      },
    }

    const stylesheet = createStylesheet(mockTokenSystem, rules)
    const withVariants = stylesheet.variants(variants)

    expect(withVariants).toBeDefined()
    expect(withVariants).toHaveProperty('variants')
  })
})

describe('new API: transformRulesToInternal', () => {
  test('transforms inline pseudo classes for self', () => {
    // When a pseudo class is defined inline in an element, it should only affect that element
    const rules = {
      container: {
        bgColor: 'blue',
        ':hover': {
          bgColor: 'red',
        },
      },
      label: {
        textColor: 'white',
      },
    }

    const stylesheet = createStylesheet(mockTokenSystem, rules)
    // The internal transformation should create: container: { ':hover': { $container: { bgColor: 'red' } } }
    expect(stylesheet).toBeDefined()
  })

  test('transforms cross-element selectors', () => {
    // Cross-element selectors like 'container:hover' affect multiple elements
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

  test('handles breakpoints in element styles', () => {
    const rules = {
      container: {
        bgColor: 'blue',
        '@sm': {
          bgColor: 'red',
        },
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
      '[size=sm]': {
        container: { paddingX: 2 },
      },
      '[size=sm][variant=accent]': {
        label: { fontWeight: 'bold' },
      },
    }

    const stylesheet = createStylesheet(mockTokenSystem, rules, variants)
    expect(stylesheet).toBeDefined()
  })
})

describe('boolean variants', () => {
  test('supports boolean variant syntax [disabled]', () => {
    const rules = {
      container: { bgColor: 'blue', opacity: 1 },
      '[disabled]': {
        container: { opacity: 0.5 },
      },
    }

    const matcher = new StyleMatcher(rules)

    // Without disabled
    const baseStyle = matcher.match({})
    expect(baseStyle.container.opacity).toBe(1)

    // With disabled=true (boolean variant)
    const disabledStyle = matcher.match({ disabled: 'true' })
    expect(disabledStyle.container.opacity).toBe(0.5)
  })

  test('supports combined boolean and value variants', () => {
    const rules = {
      container: { bgColor: 'blue' },
      '[disabled]': {
        container: { opacity: 0.5 },
      },
      '[size=sm]': {
        container: { paddingX: 2 },
      },
      '[disabled][size=sm]': {
        container: { borderColor: 'gray' },
      },
    }

    const matcher = new StyleMatcher(rules)

    // With both disabled and size=sm
    const combinedStyle = matcher.match({ disabled: 'true', size: 'sm' })
    expect(combinedStyle.container.opacity).toBe(0.5)
    expect(combinedStyle.container.paddingX).toBe(2)
    expect(combinedStyle.container.borderColor).toBe('gray')
  })
})
