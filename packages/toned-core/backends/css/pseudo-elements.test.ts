import { describe, expect, it } from 'vitest'

import { buildStyles } from '../../build/index.ts'
import { createNativeRenderer, createWebRenderer } from '../../server/index.ts'
import { defineSystem, defineToken } from '../../system/definers.ts'

const ui = defineSystem({
  id: 'pe',
  tokens: {
    paint: defineToken({
      values: ['red', 'blue'],
      resolve: (color: string) => ({ color }),
    }),
    gap: defineToken({ values: [4, 8], resolve: (gap: number) => ({ gap }) }),
  },
  conditions: {
    pseudoElements: {
      placeholder: { selector: '::placeholder', properties: ['color'] },
      'search-cancel': {
        selector: '::-webkit-search-cancel-button',
        properties: ['display'],
      },
    },
  },
})

describe('declared pseudo-elements', () => {
  it('are styled like any other condition: an inline value the system CSS reads, with no sheet in the build', () => {
    const artifact = buildStyles(ui, { sheets: [] })
    expect(artifact.css).toContain(
      '._::placeholder {color: var(--pe-toned_pe-placeholder-color, revert-layer);}',
    )
    expect(artifact.css).toContain(
      '._::-webkit-search-cancel-button {display: var(--pe-toned_pe-search-cancel-display, revert-layer);}',
    )
    const sheet = ui.stylesheet({
      Root: { paint: 'red', '::placeholder': { paint: 'blue' } },
    })
    const root = createWebRenderer(ui, {
      tokens: {},
      manifest: artifact.manifest,
    }).resolve(sheet).Root
    expect(root.style['--pe-toned_pe-placeholder-color']).toBe('blue')
    // The element's own colour is untouched: still its atomic class.
    expect(root.className).toContain('pe--paint_red')
    expect(root.style['color']).toBeUndefined()
  })

  it('does not leak into descendants: every bound element resets the parameters', () => {
    const css = buildStyles(ui, { sheets: [] }).css
    expect(css).toContain('._ {--pe-toned_pe-placeholder-color: initial;}')
  })

  it('composes with states', () => {
    const artifact = buildStyles(ui, { sheets: [] })
    const sheet = ui.stylesheet({
      Root: { '::placeholder': { paint: 'red', ':hover': { paint: 'blue' } } },
    })
    const style = createWebRenderer(ui, {
      tokens: {},
      manifest: artifact.manifest,
    }).resolve(sheet).Root.style
    // The same chain as any conditional value: red unless the hover guard holds.
    const value = String(style['--pe-toned_pe-placeholder-color'])
    const rule = /^var\((--[\w-]+), red\)$/.exec(value)?.[1]
    expect(rule).toBeDefined()
    expect(String(style[rule!])).toMatch(/blue$/)
    expect(JSON.stringify(style)).toContain('var(--pe-toned_hover)')
  })

  it('rejects an undeclared pseudo-element or property', () => {
    expect(() =>
      ui.stylesheet({ Root: { '::marker': { paint: 'red' } } } as never),
    ).toThrow(/pseudo-element ::marker/)
    const sheet = ui.stylesheet({
      Root: { '::search-cancel': { paint: 'red' } } as never,
    })
    expect(() =>
      createWebRenderer(ui, {
        tokens: {},
        manifest: buildStyles(ui, { sheets: [] }).manifest,
      }).resolve(sheet),
    ).toThrow(/::search-cancel does not declare color/)
  })

  it('has no native equivalent and is left out there', () => {
    const sheet = ui.stylesheet({
      Root: { gap: 4, '::placeholder': { paint: 'blue' } },
    })
    const root = createNativeRenderer(ui, { tokens: {} }).resolve(sheet).Root
    expect(JSON.stringify(root)).not.toContain('blue')
  })
})
