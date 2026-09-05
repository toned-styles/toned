// @vitest-environment happy-dom

import { cleanup, render } from '@testing-library/react'
// The classic JSX runtime (jsx: preserve → esbuild transform) needs React in scope.
import * as React from 'react'
import { defineSystem, defineToken, getConfig, setConfig } from '@toned/core'
import { afterAll, afterEach, describe, expect, test } from 'vitest'
import { bind, useBind } from './index.ts'
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
      <Root data-slot="x">
        <Label>Save</Label>
      </Root>,
    )
    const root = container.querySelector('[data-slot="x"]') as HTMLElement
    expect(root.tagName).toBe('DIV')
    expect(root.querySelector('span')?.textContent).toBe('Save')
  })

  test('caller props merge through with(): className concatenates, data-* passes through', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const { Root } = bind(styles)
    const { container } = render(<Root className="mine" data-slot="y" />)
    const el = container.querySelector('[data-slot="y"]') as HTMLElement
    expect(el.className).toContain('mine')
  })

  test('component identity is stable across reads of the same bound map', () => {
    const styles = stylesheet({ Root: { $$type: 'view' } })
    const map = bind(styles)
    expect(map.Root).toBe(map.Root)
  })

  test('no $$type means View: the default element is the universal box', () => {
    const styles = stylesheet({ Root: { cur: 'pointer' } })
    const { Root } = bind(styles)
    const { container } = render(<Root data-slot="d" />)
    // react-web resolves 'view' to a div; the point is that resolveElement
    // received 'view', not undefined — the default is core contract.
    expect((container.querySelector('[data-slot="d"]') as HTMLElement).tagName).toBe('DIV')
  })

  test('a STRING as is a web refinement: native falls back to the $$type primitive', () => {
    const styles = stylesheet({ Root: { $$type: 'text', cur: 'pointer' } })
    // setConfig MUTATES the shared object, so snapshot values, not the reference.
    const prev = { ...getConfig() }
    // Simulate a native host: platform 'native', resolver returns a component.
    const NativeText = (props: Record<string, unknown>) =>
      React.createElement('x-native-text', props)
    setConfig({ platform: 'native', resolveElement: () => NativeText })
    try {
      const { Root } = bind(styles)
      const { container } = render(<Root as="h2" data-slot="n" />)
      const el = container.querySelector('[data-slot="n"]') as HTMLElement
      expect(el.tagName.toLowerCase()).toBe('x-native-text')
    } finally {
      setConfig(prev)
    }
  })

  test('native string-as fallback: the tag INFERS the type when \$\$type is undeclared', () => {
    // as="h2" is a text element — native renders Text, not the default View.
    const styles = stylesheet({ Root: { cur: 'pointer' } })
    const prev = { ...getConfig() }
    const seen: unknown[] = []
    setConfig({
      platform: 'native',
      resolveElement: (t?: string) => {
        seen.push(t)
        return (props: Record<string, unknown>) => React.createElement('x-prim', props)
      },
    })
    try {
      const { Root } = bind(styles)
      render(<Root as="h2" data-slot="t" />)
      expect(seen).toContain('text')
    } finally {
      setConfig(prev)
    }
  })

  test('a COMPONENT as renders on native too', () => {
    const styles = stylesheet({ Root: { $$type: 'view' } })
    const prev = { ...getConfig() }
    setConfig({ platform: 'native', resolveElement: () => 'div' })
    try {
      const Foreign = (props: Record<string, unknown>) =>
        React.createElement('x-foreign', props)
      const { Root } = bind(styles)
      const { container } = render(<Root as={Foreign} data-slot="f" />)
      expect(
        (container.querySelector('[data-slot="f"]') as HTMLElement).tagName.toLowerCase(),
      ).toBe('x-foreign')
    } finally {
      setConfig(prev)
    }
  })

  test('escape hatch: s.Root.with is present on the bound component', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const { Root } = bind(styles)
    expect(typeof Root.with).toBe('function')
  })
})

describe('as — the per-render element override', () => {
  test('as="button" renders that intrinsic instead of the $$type primitive', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const { Root } = bind(styles)
    const { container } = render(<Root as="button" type="submit" data-slot="z" />)
    const el = container.querySelector('[data-slot="z"]') as HTMLButtonElement
    expect(el.tagName).toBe('BUTTON')
    expect(el.type).toBe('submit')
  })

  test('as={Comp} renders the component with the merged bag as its props', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const { Root } = bind(styles)
    let seen: Record<string, unknown> | undefined
    const Comp = (props: { className?: string; 'data-x'?: string }) => {
      seen = props
      return <section {...props} />
    }
    render(<Root as={Comp} className="mine" data-x="y" />)
    expect(seen?.['data-x']).toBe('y')
    // the caller's className merges through the same with() path.
    expect(String(seen?.['className'])).toContain('mine')
    // `as` itself never reaches the rendered element's props.
    expect(seen && 'as' in seen).toBe(false)
  })

  test('pressable $$type resolves to <button> on the default web config', () => {
    const styles = stylesheet({ Press: { $$type: 'pressable' } })
    const { Press } = bind(styles)
    const { container } = render(<Press data-slot="p">go</Press>)
    const el = container.querySelector('[data-slot="p"]') as HTMLElement
    expect(el.tagName).toBe('BUTTON')
  })
})

describe('useBind (hook, mods in the call)', () => {
  const styles = stylesheet({
    Root: { $$type: 'view', cur: 'pointer' },
    Label: { $$type: 'text' },
  }).variants<{ tone: 'a' | 'b' }>(($) => ({
    [$.tone('a')]: { Root: { cur: 'pointer' } },
    [$.tone('b')]: { Root: { cur: 'grab' } },
  }))

  test('mods reflect on the element; component identities stay stable', () => {
    let firstRoot: unknown
    let stableAcrossMods = true
    function View({ tone }: { tone: 'a' | 'b' }) {
      const s = useBind(styles, { tone })
      if (firstRoot === undefined) firstRoot = s.Root
      else if (s.Root !== firstRoot) stableAcrossMods = false
      return (
        <s.Root data-slot="r">
          <s.Label>x</s.Label>
        </s.Root>
      )
    }
    const { rerender, container } = render(<View tone="a" />)
    const a = (container.querySelector('[data-slot="r"]') as HTMLElement).className
    rerender(<View tone="b" />)
    const b = (container.querySelector('[data-slot="r"]') as HTMLElement).className
    expect(stableAcrossMods).toBe(true)
    expect(a).not.toBe(b)
  })
})
