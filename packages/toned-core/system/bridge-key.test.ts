/**
 * `$bridge`: a part writes a declared bridge's parameters by bridge and
 * property name (`$bridge: { placeholder: { color: 'red' } }`), and core
 * writes the inline custom property (`--toned-b-placeholder-color`). The
 * name is core's own: namespacing never renames it, so the bridge's
 * generated rule and the inline value always name the same variable.
 */
import { describe, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { createNativeRenderer, createWebRenderer } from '../server/index.ts'
import { bridgeVarName } from '../utils/css.ts'
import { defineSystem, defineToken } from './index.ts'

const paint = { muted: '#6b7280', accent: '#2563eb' } as const
const placeholderColor = defineToken({
  values: ['muted', 'accent'] as const,
  resolve: (value: keyof typeof paint) => ({
    [bridgeVarName('placeholder', 'color')]: paint[value],
  }),
})

const bridges = {
  placeholder: { selector: '::placeholder', properties: ['color'] },
  scrollbar: {
    selector: '::-webkit-scrollbar',
    properties: ['display', 'backgroundColor'],
  },
} as const

const ui = defineSystem({
  id: 'bridged',
  tokens: { placeholderColor },
  conditions: { media: { md: 768 }, bridges },
})

const legacy = defineSystem({ placeholderColor }, { bridges })

describe('$bridge', () => {
  test('writes the bridge parameter inline, not renamed by the namespace', () => {
    const sheet = ui.stylesheet({
      Root: { $bridge: { scrollbar: { display: 'none' } } },
    })
    const { css, manifest } = buildStyles(ui, { sheets: [sheet] })
    expect(createWebRenderer(ui, { manifest }).resolve(sheet).Root).toEqual(
      expect.objectContaining({
        style: { '--toned-b-scrollbar-display': 'none' },
      }),
    )
    // The bridge's own rule reads the same, unrenamed, name.
    expect(css).toContain(
      '._::-webkit-scrollbar {display: var(--toned-b-scrollbar-display, initial);',
    )
    expect(css).not.toContain('--bridged-toned-b-')
  })

  test('a bridge token and its rule agree in a namespaced system', () => {
    const sheet = ui.stylesheet({ Root: { placeholderColor: 'muted' } })
    const { css } = buildStyles(ui, { sheets: [sheet] })
    expect(css).toContain('--toned-b-placeholder-color:#6b7280')
    expect(css).toContain('var(--toned-b-placeholder-color, inherit)')
  })

  test('kebab-cases camelCase property names', () => {
    const sheet = ui.stylesheet({
      Root: { $bridge: { scrollbar: { backgroundColor: 'red' } } },
    })
    const { manifest } = buildStyles(ui, { sheets: [sheet] })
    expect(
      createWebRenderer(ui, { manifest }).resolve(sheet).Root.style,
    ).toEqual({ '--toned-b-scrollbar-background-color': 'red' })
  })

  test('sits beside $style, and merges with it', () => {
    const sheet = ui.stylesheet({
      Root: {
        '@platform web': {
          $style: { cursor: 'pointer' },
          $bridge: { scrollbar: { display: 'none' } },
        },
      },
    })
    const { manifest } = buildStyles(ui, { sheets: [sheet] })
    expect(
      createWebRenderer(ui, { manifest }).resolve(sheet).Root.style,
    ).toEqual({ cursor: 'pointer', '--toned-b-scrollbar-display': 'none' })
  })

  test('works inside a condition', () => {
    const sheet = ui.stylesheet({
      Root: {
        $bridge: { scrollbar: { display: 'block' } },
        '@md': { $bridge: { scrollbar: { display: 'none' } } },
      },
    })
    const { manifest } = buildStyles(ui, { sheets: [sheet] })
    const style = createWebRenderer(ui, { manifest }).resolve(sheet).Root
      .style as Record<string, string>
    expect(style['--toned-b-scrollbar-display']).toMatch(/^var\(/)
    expect(Object.values(style).join(' ')).toContain('none')
  })

  test('is written the same in a legacy (unnamespaced) system', () => {
    const sheet = legacy.stylesheet({
      Root: { $bridge: { placeholder: { color: 'red' } } },
    })
    const { manifest } = buildStyles(legacy, { sheets: [sheet] })
    expect(
      createWebRenderer(legacy, { manifest }).resolve(sheet).Root.style,
    ).toEqual({ '--toned-b-placeholder-color': 'red' })
  })

  test('the native backend treats it as it treats a bridge token', () => {
    const native = createNativeRenderer(ui, { tokens: {} })
    const written = ui.stylesheet({
      Root: { $bridge: { placeholder: { color: 'red' } } },
    })
    const token = ui.stylesheet({ Root: { placeholderColor: 'muted' } })
    const message = (run: () => unknown) => {
      try {
        run()
      } catch (error) {
        return (error as Error).message
      }
    }
    expect(message(() => native.resolve(written))).toBe(
      message(() => native.resolve(token)),
    )
  })

  test('an unknown bridge throws, naming the declared ones', () => {
    expect(() =>
      ui.stylesheet({
        Root: {
          // @ts-expect-error — 'placeholdr' is not a declared bridge
          $bridge: { placeholdr: { color: 'red' } },
        },
      }),
    ).toThrow(
      "Toned: unknown bridge 'placeholdr' in $bridge. Declared bridges: 'placeholder', 'scrollbar'",
    )
  })

  test('an unknown property throws, naming the bridge’s properties', () => {
    expect(() =>
      ui.stylesheet({
        Root: {
          // @ts-expect-error — the scrollbar bridge has no 'width'
          $bridge: { scrollbar: { width: 0 } },
        },
      }),
    ).toThrow(
      "Toned: bridge 'scrollbar' has no property 'width' in $bridge. Its properties: 'display', 'backgroundColor'",
    )
  })

  test('a system without bridges rejects $bridge', () => {
    const plain = defineSystem({ id: 'plain', tokens: { placeholderColor } })
    expect(() =>
      plain.stylesheet({
        // @ts-expect-error — this system declares no bridges
        Root: { $bridge: { placeholder: { color: 'red' } } },
      }),
    ).toThrow(
      "Toned: unknown bridge 'placeholder' in $bridge. Declared bridges: none",
    )
  })

  test('is checked in extend', () => {
    const base = ui.stylesheet({ Root: { placeholderColor: 'muted' } })
    expect(() =>
      base.extend({
        // @ts-expect-error — 'placeholdr' is not a declared bridge
        Root: { $bridge: { placeholdr: { color: 'red' } } },
      }),
    ).toThrow("unknown bridge 'placeholdr'")
  })
})
