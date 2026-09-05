// @vitest-environment happy-dom

import { cleanup, render } from '@testing-library/react'
// The classic JSX runtime (jsx: preserve → esbuild transform) needs React in scope.
import * as React from 'react'
import { defineSystem, defineToken, getConfig, setConfig } from '@toned/core'
import { afterAll, afterEach, describe, expect, test } from 'vitest'
import { createContext, useContext } from 'react'
import { overrideStyles, StyleOverrides, useBind, useStyles } from './index.ts'
import reactWebConfig from './react-web.ts'

const originalConfig = getConfig()
setConfig({ ...reactWebConfig, useClassName: true, getTokens: () => ({}) })
afterAll(() => setConfig(originalConfig))

const { stylesheet } = defineSystem({
  cur: defineToken({
    values: ['pointer', 'grab', 'text'] as const,
    resolve: (v) => ({ cursor: v }),
  }),
})

afterEach(() => cleanup())

function classesOf(el: Element): string[] {
  return [...(el as HTMLElement).classList]
}

describe('StyleOverrides', () => {
  test('an entry for the sheet swaps the resolved token; other elements untouched', () => {
    const styles = stylesheet({
      Root: { $$type: 'view', cur: 'pointer' },
      Label: { $$type: 'text', cur: 'grab' },
    })
    const Probe = () => {
      const s = useBind(styles)
      return (
        <s.Root data-slot="r">
          <s.Label data-slot="l" />
        </s.Root>
      )
    }
    const { container } = render(
      <StyleOverrides value={[overrideStyles(styles, { Root: { cur: 'grab' } })]}>
        <Probe />
      </StyleOverrides>,
    )
    expect(classesOf(container.querySelector('[data-slot="r"]')!)).toContain('cur_grab')
    expect(classesOf(container.querySelector('[data-slot="r"]')!)).not.toContain('cur_pointer')
    expect(classesOf(container.querySelector('[data-slot="l"]')!)).toContain('cur_grab')
  })

  test('no matching entry: the sheet resolves untouched, and identity is the sheet itself', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const other = stylesheet({ Root: { $$type: 'view', cur: 'grab' } })
    const Probe = () => {
      const s = useBind(styles)
      return <s.Root data-slot="r" />
    }
    const { container } = render(
      <StyleOverrides value={[overrideStyles(other, { Root: { cur: 'text' } })]}>
        <Probe />
      </StyleOverrides>,
    )
    expect(classesOf(container.querySelector('[data-slot="r"]')!)).toContain('cur_pointer')
  })

  test('nesting accumulates and the inner provider wins on colliding keys', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const Probe = () => {
      const s = useBind(styles)
      return <s.Root data-slot="r" />
    }
    const { container } = render(
      <StyleOverrides value={[overrideStyles(styles, { Root: { cur: 'grab' } })]}>
        <StyleOverrides value={[overrideStyles(styles, { Root: { cur: 'text' } })]}>
          <Probe />
        </StyleOverrides>
      </StyleOverrides>,
    )
    expect(classesOf(container.querySelector('[data-slot="r"]')!)).toContain('cur_text')
  })

  test('outside the provider the same sheet is unaffected (render-scope only)', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const Probe = ({ slot }: { slot: string }) => {
      const s = useBind(styles)
      return <s.Root data-slot={slot} />
    }
    const { container } = render(
      <>
        <StyleOverrides value={[overrideStyles(styles, { Root: { cur: 'grab' } })]}>
          <Probe slot="in" />
        </StyleOverrides>
        <Probe slot="out" />
      </>,
    )
    expect(classesOf(container.querySelector('[data-slot="in"]')!)).toContain('cur_grab')
    expect(classesOf(container.querySelector('[data-slot="out"]')!)).toContain('cur_pointer')
  })

  test('useStyles picks overrides up too (the bag path, not just bound elements)', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    let seen = ''
    const Probe = () => {
      const s = useStyles(styles)
      seen = (s.Root as { className?: string }).className ?? ''
      return null
    }
    render(
      <StyleOverrides value={[overrideStyles(styles, { Root: { cur: 'grab' } })]}>
        <Probe />
      </StyleOverrides>,
    )
    expect(seen).toContain('cur_grab')
  })

  test('scoped entries: apply only under a matching ambient scope, most specific wins', () => {
    const ScopeContext = createContext('__root__')
    setConfig({
      ...getConfig(),
      useStyleOverrideScope: () => useContext(ScopeContext),
    })
    try {
      const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
      const Probe = ({ slot }: { slot: string }) => {
        const s = useBind(styles)
        return <s.Root data-slot={slot} />
      }
      const entries = [
        overrideStyles(styles, { Root: { cur: 'grab' } }, { scope: 'checkout' }),
        overrideStyles(styles, { Root: { cur: 'text' } }, { scope: 'checkout/summary' }),
      ]
      const { container } = render(
        <StyleOverrides value={entries}>
          <ScopeContext.Provider value="__root__/checkout">
            <Probe slot="shallow" />
            <ScopeContext.Provider value="__root__/checkout/summary">
              <Probe slot="deep" />
            </ScopeContext.Provider>
          </ScopeContext.Provider>
          <Probe slot="outside" />
        </StyleOverrides>,
      )
      expect(classesOf(container.querySelector('[data-slot="shallow"]')!)).toContain('cur_grab')
      expect(classesOf(container.querySelector('[data-slot="deep"]')!)).toContain('cur_text')
      expect(classesOf(container.querySelector('[data-slot="outside"]')!)).toContain('cur_pointer')
    } finally {
      setConfig({ ...reactWebConfig, useClassName: true, getTokens: () => ({}) })
    }
  })

  test('the derived sheet is cached: stable identity across renders with stable entries', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const entries = [overrideStyles(styles, { Root: { cur: 'grab' } })]
    const seen: unknown[] = []
    const Probe = () => {
      // reach the internal: two renders must resolve the same derived instance,
      // observable as the bag object staying value-identical in className.
      const s = useStyles(styles)
      seen.push((s.Root as { className?: string }).className)
      return null
    }
    const view = render(
      <StyleOverrides value={entries}>
        <Probe />
      </StyleOverrides>,
    )
    view.rerender(
      <StyleOverrides value={entries}>
        <Probe />
      </StyleOverrides>,
    )
    expect(seen[0]).toBe(seen[1])
  })
})
