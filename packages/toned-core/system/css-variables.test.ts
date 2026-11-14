/**
 * Declared CSS variables: in a namespaced system, a `var(--x)` written in
 * `$style` must name a variable the system owns (one a sheet sets, or one of
 * core's own `--toned-*` parameters) or one listed in `externalCssVariables`.
 * Any other name would be renamed into the namespace and resolve to nothing,
 * so in development the sheet throws when it is created.
 */
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { Variants } from '../types/index.ts'
import { bridgeVarName } from '../utils/css.ts'
import { defineSystem, defineToken } from './index.ts'

const gap = defineToken({
  values: [0, 1] as const,
  resolve: (value) => ({ gap: value * 4 }),
})

// Typed as `string[]`, which turns the type-level check off, so these sheets
// compile and the runtime check is what is under test (types/
// css-variables.test-d.ts covers the types).
const external: readonly string[] = ['--app-surface', '--brand-ink']
const ui = defineSystem({
  id: 'vars',
  externalCssVariables: external,
  tokens: { gap },
  conditions: {
    bridges: {
      placeholder: { selector: '::placeholder', properties: ['color'] },
    },
  },
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('declared CSS variables', () => {
  test('an unlisted variable throws, naming it and the external ones', () => {
    expect(() =>
      ui.stylesheet({
        Root: {
          '@platform web': { $style: { backgroundColor: 'var(--brand)' } },
        },
      }),
    ).toThrow(
      "Toned: 'var(--brand)' in Root's $style names '--brand', which system 'vars' neither sets nor lists, so it would be renamed to '--vars-brand' and resolve to nothing. Add '--brand' to defineSystem({ externalCssVariables }), or set it in this sheet. External: '--app-surface', '--brand-ink'",
    )
  })

  test('a fallback does not make an unlisted variable resolve', () => {
    expect(() =>
      ui.stylesheet({
        Root: {
          '@platform web': {
            $style: { width: 'calc(var(--progress, 0%) + 1px)' },
          },
        },
      }),
    ).toThrow("names '--progress'")
  })

  test('a variable inside a fallback is checked too', () => {
    expect(() =>
      ui.stylesheet({
        Root: {
          '@platform web': {
            $style: { borderColor: 'var(--app-surface, var(--missing))' },
          },
        },
      }),
    ).toThrow("names '--missing'")
  })

  test('listed, core and sheet-set variables are accepted', () => {
    expect(() =>
      ui.stylesheet({
        Root: {
          '@platform web': {
            $style: {
              '--bar': '3rem',
              backgroundColor: 'var(--app-surface)',
              borderColor: `var(${bridgeVarName('placeholder', 'color')})`,
            },
          },
        },
        Panel: {
          '@platform web': { $style: { top: 'var(--bar)' } },
          ':hover': {
            '@platform web': { $style: { height: 'var(--brand-ink)' } },
          },
        },
      }),
    ).not.toThrow()
  })

  test('a quoted var() is text, not a reference', () => {
    expect(() =>
      ui.stylesheet({
        Root: {
          '@platform web': { $style: { content: '"var(--brand)"' } },
        },
      }),
    ).not.toThrow()
  })

  test('conditions, $style lists and variants are checked', () => {
    expect(() =>
      ui.stylesheet({
        Root: {
          ':hover': {
            '@platform web': { $style: [{ borderColor: 'var(--hover-ink)' }] },
          },
        },
      }),
    ).toThrow("names '--hover-ink'")
    expect(() =>
      ui
        .stylesheet({ Root: { gap: 0 } })
        .variants(($: Variants<{ active: boolean }>) => ({
          [$.active(true)]: {
            Root: {
              '@platform web': { $style: { borderColor: 'var(--active-ink)' } },
            },
          },
        })),
    ).toThrow("names '--active-ink'")
  })

  test('a variable set by the base sheet is owned by its extension', () => {
    const base = ui.stylesheet({
      Root: { '@platform web': { $style: { '--bar': '3rem' } } },
    })
    expect(() =>
      base.extend({
        Root: { '@platform web': { $style: { top: 'var(--bar)' } } },
      }),
    ).not.toThrow()
  })

  test('production builds skip the check', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() =>
      ui.stylesheet({
        Root: {
          '@platform web': { $style: { backgroundColor: 'var(--brand)' } },
        },
      }),
    ).not.toThrow()
  })

  test('a system without an id renames nothing, so nothing is checked', () => {
    const plain = defineSystem({ gap })
    expect(() =>
      plain.stylesheet({
        Root: {
          '@platform web': { $style: { backgroundColor: 'var(--brand)' } },
        },
      }),
    ).not.toThrow()
  })
})
