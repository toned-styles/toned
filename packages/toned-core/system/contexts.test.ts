/**
 * Context markers: styling a part by an ancestor COMPONENT's state or kind.
 *
 * The system declares each context and what it offers; a provider part
 * declares `$context: 'card'` (or `'prose=faq'`); a part in any other sheet
 * keys on it with `'@within card:hover'` / `'@within prose=faq'`. On web the
 * provider carries a marker class and the system's CSS carries one
 * zero-specificity rule per declared pair; native reads the same facts from
 * the React tree.
 */
import { describe, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { generate } from '../dom/generate.ts'
import { createNativeRenderer, createWebRenderer } from '../server/index.ts'
import type { Variants } from '../types/index.ts'
import { defineSystem, defineToken } from './index.ts'

const gap = defineToken({
  values: [0, 1, 2] as const,
  resolve: (value) => ({ gap: value * 4 }),
})
const opacity = defineToken({
  values: [0.5, 1] as const,
  resolve: (value) => ({ opacity: value }),
})

const ui = defineSystem({
  id: 'ctx',
  tokens: { gap, opacity },
  conditions: {
    media: { md: 768 },
    states: { open: "[data-state='open']" },
    contexts: {
      card: { states: ['hover', 'open'] },
      prose: { values: ['faq', 'callout'] },
    },
  },
})

const card = ui.stylesheet({ Root: { $context: 'card', gap: 1 } })
const prose = ui
  .stylesheet({ Root: { $context: 'prose', gap: 0 } })
  .variants(($: Variants<{ kind: 'faq' | 'callout' }>) => ({
    [$.kind('faq')]: { Root: { $context: 'prose=faq' } },
    [$.kind('callout')]: { Root: { $context: 'prose=callout' } },
  }))
const title = ui.stylesheet({
  Root: {
    opacity: 1,
    '@within card:hover': { opacity: 0.5 },
    '@within prose=faq': { gap: 2 },
  },
})

const build = () => buildStyles(ui, { sheets: [card, prose, title] })

describe('context markers on web', () => {
  test('a provider part carries its marker class, namespaced', () => {
    const { manifest } = build()
    const web = createWebRenderer(ui, { manifest })
    expect(web.resolve(card).Root.className?.split(' ')).toContain(
      'ctx--_cx_card',
    )
  })

  test('a valued marker follows the variant that sets it', () => {
    const { manifest } = build()
    const web = createWebRenderer(ui, { manifest })
    const classes = (kind?: 'faq' | 'callout') =>
      web
        .resolve(prose, { variants: { kind } as { kind: 'faq' } })
        .Root.className?.split(' ')
    expect(classes()).toContain('ctx--_cx_prose')
    expect(classes()).not.toContain('ctx--_cx_prose_faq')
    expect(classes('faq')).toEqual(
      expect.arrayContaining(['ctx--_cx_prose', 'ctx--_cx_prose_faq']),
    )
    // The last marker for one context wins: one value per provider.
    expect(classes('callout')).toContain('ctx--_cx_prose_callout')
    expect(classes('callout')).not.toContain('ctx--_cx_prose_faq')
  })

  test('a descendant keys on the context through one guard variable', () => {
    const { manifest } = build()
    const web = createWebRenderer(ui, { manifest })
    const style = web.resolve(title).Root.style as Record<string, string>
    const values = Object.values(style).join(' ')
    expect(values).toContain('var(--ctx-toned_cx_card_hover)')
    expect(values).toContain('var(--ctx-toned_cx_prose_faq)')
  })

  test('the CSS is one zero-specificity rule per declared pair, from the system alone', () => {
    // No sheet is passed: the rules come from the declaration.
    const css = generate(ui.system, { id: 'ctx' })
    expect(css).toContain(
      ':where(.ctx--_cx_card) {--ctx-toned_cx_card: ;--ctx-toned_cx_card_hover: initial;--ctx-toned_cx_card_open: initial;}',
    )
    expect(css).toContain(
      '@media (hover: hover) {:where(.ctx--_cx_card:hover) {--ctx-toned_cx_card_hover: ;}}',
    )
    expect(css).toContain(
      ":where(.ctx--_cx_card[data-state='open']) {--ctx-toned_cx_card_open: ;}",
    )
    expect(css).toContain(
      ':where(.ctx--_cx_prose) {--ctx-toned_cx_prose: ;--ctx-toned_cx_prose_faq: initial;--ctx-toned_cx_prose_callout: initial;}',
    )
    expect(css).toContain(
      ':where(.ctx--_cx_prose_faq) {--ctx-toned_cx_prose_faq: ;}',
    )
    // Every context rule is :where(): specificity is zero everywhere.
    expect(css.match(/[^(]\.ctx--_cx_/g)).toBeNull()
  })

  test('composes with other conditions by nesting', () => {
    const nested = ui.stylesheet({
      Root: { '@md': { '@within prose': { gap: 2 } } },
    })
    const { manifest } = buildStyles(ui, { sheets: [nested] })
    const style = createWebRenderer(ui, { manifest }).resolve(nested).Root
      .style as Record<string, string>
    const values = Object.values(style).join(' ')
    expect(values).toContain('var(--ctx-media-md)')
    expect(values).toContain('var(--ctx-toned_cx_prose)')
  })

  test('a system without contexts emits no context CSS', () => {
    const plain = defineSystem({ id: 'plain', tokens: { gap } })
    expect(generate(plain.system, { id: 'plain' })).not.toContain('_cx_')
  })
})

describe('context markers on native', () => {
  test('a descendant resolves from the facts the tree provides', () => {
    const native = createNativeRenderer(ui, { tokens: {} })
    const answer = ui.stylesheet({
      Root: { opacity: 1, '@within prose=faq': { gap: 2 } },
    })
    expect(native.resolve(answer).Root.style).toEqual({ opacity: 1 })
    expect(
      native.resolve(answer, { facts: { '@within prose=faq': true } }).Root
        .style,
    ).toEqual({ opacity: 1, gap: 8 })
  })

  test('a context state is refused on native, naming the web block', () => {
    const native = createNativeRenderer(ui, { tokens: {} })
    expect(() => native.resolve(title)).toThrow(
      "Toned: '@within card:hover' reads a provider state, which native cannot track across components: put it under '@platform web'",
    )
    const webOnly = ui.stylesheet({
      Root: { '@platform web': { '@within card:hover': { opacity: 0.5 } } },
    })
    expect(native.resolve(webOnly).Root.style).toEqual({})
  })

  test('a provider resolves without a style of its own for the marker', () => {
    const native = createNativeRenderer(ui, { tokens: {} })
    expect(native.resolve(card).Root.style).toEqual({ gap: 4 })
  })
})

describe('mistakes', () => {
  test('an unknown context throws, naming the declared ones', () => {
    expect(() =>
      ui.stylesheet({
        // @ts-expect-error — 'crad' is not a declared context
        Root: { '@within crad:hover': { gap: 1 } },
      }),
    ).toThrow(
      "Toned: unknown context 'crad' in '@within crad:hover'. Declared contexts: 'card', 'prose'",
    )
  })

  test('an unknown value throws, naming the context’s values', () => {
    expect(() =>
      ui.stylesheet({
        // @ts-expect-error — prose has no value 'article'
        Root: { '@within prose=article': { gap: 1 } },
      }),
    ).toThrow(
      "Toned: context 'prose' has no value 'article' in '@within prose=article'. Its values: 'faq', 'callout'. Declare it: contexts: { prose: { values: ['faq', 'callout', 'article'] } }",
    )
  })

  test('a state the context does not offer throws, naming the declaration', () => {
    expect(() =>
      ui.stylesheet({
        // @ts-expect-error — card does not offer focus-within
        Root: { '@within card:focus-within': { gap: 1 } },
      }),
    ).toThrow(
      "Toned: context 'card' does not offer state 'focus-within' in '@within card:focus-within'. Declare it: contexts: { card: { states: ['hover', 'open', 'focus-within'] } }",
    )
  })

  test('an unknown $context marker throws', () => {
    expect(() =>
      // @ts-expect-error — 'crad' is not a declared context
      ui.stylesheet({ Root: { $context: 'crad' } }),
    ).toThrow(
      "Toned: unknown context 'crad' in $context. Declared contexts: 'card', 'prose'",
    )
  })

  test('$context cannot change inside a condition', () => {
    expect(() =>
      ui.stylesheet({
        // @ts-expect-error — a marker is static
        Root: { ':hover': { $context: 'card' } },
      }),
    ).toThrow(
      "Toned: $context is static and cannot change inside ':hover'; set it on the part, or in a variant block",
    )
  })

  test('a context state with a descendant selector is refused at definition', () => {
    expect(() =>
      defineSystem({
        id: 'bad',
        tokens: { gap },
        conditions: {
          states: { inside: '.x &' },
          contexts: { card: { states: ['inside'] } },
        },
      }),
    ).toThrow(
      'Toned: context \'card\' offers state \'inside\', which needs an attribute or pseudo-class selector ("[data-…]" or ":…") on the provider element; ".x &" selects a descendant',
    )
  })

  test('an undeclared state name in a context is refused at definition', () => {
    expect(() =>
      defineSystem({
        id: 'bad',
        tokens: { gap },
        conditions: { contexts: { card: { states: ['opn'] } } },
      }),
    ).toThrow(
      "Toned: context 'card' offers state 'opn', which is neither built in ('hover', 'focus', 'focus-visible', 'focus-within', 'active') nor declared in states",
    )
  })
})
