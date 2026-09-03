// @vitest-environment happy-dom

import { cleanup, render } from '@testing-library/react'
import { defineSystem, defineToken, getConfig, setConfig } from '@toned/core'
import { createElement } from 'react'
import { afterAll, afterEach, describe, expect, test } from 'vitest'
import { bind } from './index.ts'
import reactWebConfig from './react-web.ts'

const originalConfig = getConfig()
// useClassName so bound elements carry a toned class (as lib/ui installs it).
setConfig({ ...reactWebConfig, useClassName: true, getTokens: () => ({}) })
afterAll(() => setConfig(originalConfig))

const { stylesheet } = defineSystem({
  cur: defineToken({
    values: ['pointer', 'grab'] as const,
    resolve: (v) => ({ cursor: v }),
  }),
})

afterEach(() => cleanup())

describe('bind (mod-less)', () => {
  test('renders each element as the primitive its $$type selects', () => {
    const styles = stylesheet({
      Root: { $$type: 'view', cur: 'pointer' },
      Label: { $$type: 'text' },
    })
    const { Root, Label } = bind(styles)
    const { container } = render(
      createElement(
        Root,
        { 'data-slot': 'x' },
        createElement(Label, null, 'Save'),
      ),
    )
    const root = container.querySelector('[data-slot="x"]') as HTMLElement
    expect(root.tagName).toBe('DIV')
    expect(root.querySelector('span')?.textContent).toBe('Save')
  })

  test('caller props merge through with(): className concatenates, data-* passes through', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const { Root } = bind(styles)
    const { container } = render(
      createElement(Root, { className: 'mine', 'data-slot': 'y' }),
    )
    const el = container.querySelector('[data-slot="y"]') as HTMLElement
    expect(el.className).toContain('mine')
  })

  test('component identity is stable across reads of the same bound map', () => {
    const styles = stylesheet({ Root: { $$type: 'view' } })
    const map = bind(styles)
    expect(map.Root).toBe(map.Root)
  })

  test('escape hatch: s.Root.with is present on the bound component', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const { Root } = bind(styles)
    expect(typeof Root.with).toBe('function')
  })
})
