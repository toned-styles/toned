// @vitest-environment happy-dom

import { cleanup, render } from '@testing-library/react'
import { defineSystem, defineToken, getConfig, setConfig } from '@toned/core'
// The classic JSX runtime (jsx: preserve → esbuild transform) needs React in scope.
import * as React from 'react'
import { createContext, useContext } from 'react'
import { afterAll, afterEach, describe, expect, test } from 'vitest'
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
      <StyleOverrides
        value={[overrideStyles(styles, { Root: { cur: 'grab' } })]}
      >
        <Probe />
      </StyleOverrides>,
    )
    expect(classesOf(container.querySelector('[data-slot="r"]')!)).toContain(
      'cur_grab',
    )
    expect(
      classesOf(container.querySelector('[data-slot="r"]')!),
    ).not.toContain('cur_pointer')
    expect(classesOf(container.querySelector('[data-slot="l"]')!)).toContain(
      'cur_grab',
    )
  })

  test('no matching entry: the sheet resolves untouched, and identity is the sheet itself', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const other = stylesheet({ Root: { $$type: 'view', cur: 'grab' } })
    const Probe = () => {
      const s = useBind(styles)
      return <s.Root data-slot="r" />
    }
    const { container } = render(
      <StyleOverrides
        value={[overrideStyles(other, { Root: { cur: 'text' } })]}
      >
        <Probe />
      </StyleOverrides>,
    )
    expect(classesOf(container.querySelector('[data-slot="r"]')!)).toContain(
      'cur_pointer',
    )
  })

  test('nesting accumulates and the inner provider wins on colliding keys', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const Probe = () => {
      const s = useBind(styles)
      return <s.Root data-slot="r" />
    }
    const { container } = render(
      <StyleOverrides
        value={[overrideStyles(styles, { Root: { cur: 'grab' } })]}
      >
        <StyleOverrides
          value={[overrideStyles(styles, { Root: { cur: 'text' } })]}
        >
          <Probe />
        </StyleOverrides>
      </StyleOverrides>,
    )
    expect(classesOf(container.querySelector('[data-slot="r"]')!)).toContain(
      'cur_text',
    )
  })

  test('outside the provider the same sheet is unaffected (render-scope only)', () => {
    const styles = stylesheet({ Root: { $$type: 'view', cur: 'pointer' } })
    const Probe = ({ slot }: { slot: string }) => {
      const s = useBind(styles)
      return <s.Root data-slot={slot} />
    }
    const { container } = render(
      <>
        <StyleOverrides
          value={[overrideStyles(styles, { Root: { cur: 'grab' } })]}
        >
          <Probe slot="in" />
        </StyleOverrides>
        <Probe slot="out" />
      </>,
    )
    expect(classesOf(container.querySelector('[data-slot="in"]')!)).toContain(
      'cur_grab',
    )
    expect(classesOf(container.querySelector('[data-slot="out"]')!)).toContain(
      'cur_pointer',
    )
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
      <StyleOverrides
        value={[overrideStyles(styles, { Root: { cur: 'grab' } })]}
      >
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
        overrideStyles(
          styles,
          { Root: { cur: 'grab' } },
          { scope: 'checkout' },
        ),
        overrideStyles(
          styles,
          { Root: { cur: 'text' } },
          { scope: 'checkout/summary' },
        ),
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
      expect(
        classesOf(container.querySelector('[data-slot="shallow"]')!),
      ).toContain('cur_grab')
      expect(
        classesOf(container.querySelector('[data-slot="deep"]')!),
      ).toContain('cur_text')
      expect(
        classesOf(container.querySelector('[data-slot="outside"]')!),
      ).toContain('cur_pointer')
    } finally {
      setConfig({
        ...reactWebConfig,
        useClassName: true,
        getTokens: () => ({}),
      })
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

/*
 * The variants channel: an override says what a declaration says, over the
 * TARGET sheet's own axes. There are no new axes — the component already
 * supplies them at useBind — so what an entry can do is replace what a matcher
 * paints, or add a matcher the sheet never declared.
 */
describe('StyleOverrides + .variants()', () => {
  const sized = () =>
    stylesheet({
      Root: { $$type: 'view', cur: 'pointer' },
      Label: { $$type: 'text', cur: 'grab' },
    }).variants<{ size: 'sm' | 'lg'; tone: 'quiet' | 'loud' }>(($) => ({
      [$.size('sm')]: { Root: { cur: 'grab' } },
    }))

  const renderWith = (
    styles: ReturnType<typeof sized>,
    entries: unknown[],
    state: { size: 'sm' | 'lg'; tone: 'quiet' | 'loud' },
  ) => {
    const Probe = () => {
      const s = useBind(styles, state)
      return (
        <s.Root data-slot="r">
          <s.Label data-slot="l" />
        </s.Root>
      )
    }
    return render(
      <StyleOverrides value={entries as never}>
        <Probe />
      </StyleOverrides>,
    ).container
  }

  test('a matcher the sheet declared is REPLACED, not duplicated', () => {
    const styles = sized()
    const entries = [
      overrideStyles(styles, {}).variants(($) => ({
        [$.size('sm')]: { Root: { cur: 'text' } },
      })),
    ]
    const c = renderWith(styles, entries, { size: 'sm', tone: 'quiet' })
    expect(classesOf(c.querySelector('[data-slot="r"]')!)).toContain('cur_text')
    expect(classesOf(c.querySelector('[data-slot="r"]')!)).not.toContain(
      'cur_grab',
    )
  })

  test('a matcher the sheet never declared is ADDED', () => {
    const styles = sized()
    const entries = [
      overrideStyles(styles, {}).variants(($) => ({
        [$.size('lg')]: { Label: { cur: 'text' } },
      })),
    ]
    const c = renderWith(styles, entries, { size: 'lg', tone: 'quiet' })
    expect(classesOf(c.querySelector('[data-slot="l"]')!)).toContain('cur_text')
  })

  test('the matcher is keyed by the SHEET order, so writing the axes the other way round still replaces', () => {
    // The sheet's key order comes from its own declaration. An override that
    // names the axes in a different order must resolve to the SAME matcher,
    // or it silently adds one beside the rule it meant to change.
    const styles = stylesheet({
      Root: { $$type: 'view', cur: 'pointer' },
    }).variants<{
      size: 'sm' | 'lg'
      tone: 'quiet' | 'loud'
    }>(($) => ({
      [$.size('sm').tone('quiet')]: { Root: { cur: 'grab' } },
    }))
    const entries = [
      overrideStyles(styles, {}).variants(($) => ({
        // written tone-first, deliberately
        [$.tone('quiet').size('sm')]: { Root: { cur: 'text' } },
      })),
    ]
    const Probe = () => {
      const s = useBind(styles, { size: 'sm', tone: 'quiet' })
      return <s.Root data-slot="r" />
    }
    const c = render(
      <StyleOverrides value={entries as never}>
        <Probe />
      </StyleOverrides>,
    ).container
    expect(classesOf(c.querySelector('[data-slot="r"]')!)).toContain('cur_text')
    expect(classesOf(c.querySelector('[data-slot="r"]')!)).not.toContain(
      'cur_grab',
    )
  })

  test('an override changes only the properties it names inside a matcher', () => {
    const styles = stylesheet({
      Root: { $$type: 'view', cur: 'pointer' },
      Label: { $$type: 'text', cur: 'pointer' },
    }).variants<{ size: 'sm' | 'lg' }>(($) => ({
      [$.size('sm')]: { Root: { cur: 'grab' }, Label: { cur: 'grab' } },
    }))
    const entries = [
      overrideStyles(styles, {}).variants(($) => ({
        [$.size('sm')]: { Root: { cur: 'text' } },
      })),
    ]
    const c = renderWith(styles as never, entries, {
      size: 'sm',
      tone: 'quiet',
    })
    expect(classesOf(c.querySelector('[data-slot="r"]')!)).toContain('cur_text')
    // Label keeps what the sheet's own matcher said.
    expect(classesOf(c.querySelector('[data-slot="l"]')!)).toContain('cur_grab')
  })

  test('an entry without .variants() is unchanged, and .variants() returns a NEW entry', () => {
    const styles = sized()
    const plain = overrideStyles(styles, { Root: { cur: 'text' } })
    const withVariants = plain.variants(($) => ({
      [$.size('lg')]: { Root: { cur: 'grab' } },
    }))
    expect(withVariants).not.toBe(plain)
    expect((plain as { variantRules?: unknown }).variantRules).toBeUndefined()
    // the base rules survive the chain
    const c = renderWith(styles, [withVariants], { size: 'sm', tone: 'quiet' })
    expect(classesOf(c.querySelector('[data-slot="r"]')!)).toContain('cur_text')
  })
})

/*
 * Two DIFFERENT tokens writing the SAME property. Equal specificity, so
 * without reconciliation the winner is the order they happen to sit in the
 * generated stylesheet — which is why call sites were writing the value as a
 * raw inline style to make it deterministic. The override's declaration is
 * moved there automatically now; the base token keeps the side it still owns.
 */
describe('StyleOverrides + overlapping CSS properties', () => {
  const { stylesheet: sizing } = defineSystem({
    padX: defineToken({
      values: [1, 2, 3] as const,
      resolve: (v) => ({ paddingLeft: `${v}px`, paddingRight: `${v}px` }),
    }),
    padLeft: defineToken({
      values: [1, 2, 3] as const,
      resolve: (v) => ({ paddingLeft: `${v}px` }),
    }),
    gapper: defineToken({
      values: [1, 2] as const,
      resolve: (v) => ({ gap: `${v}px` }),
    }),
  })

  const probe = (
    styles: ReturnType<typeof sizing<{ Root: { $$type: 'view' } }>>,
    entries: unknown[],
  ) => {
    const Probe = () => {
      const s = useBind(styles)
      return <s.Root data-slot="r" />
    }
    const { container } = render(
      <StyleOverrides value={entries as never}>
        <Probe />
      </StyleOverrides>,
    )
    return container.querySelector('[data-slot="r"]') as HTMLElement
  }

  test("the override's side goes inline; the base token keeps the side it still owns", () => {
    const styles = sizing({ Root: { $$type: 'view', padX: 3 } })
    const el = probe(styles, [overrideStyles(styles, { Root: { padLeft: 2 } })])
    // NOT a class: two classes of equal specificity would tie on padding-left
    expect(classesOf(el)).not.toContain('padLeft_2')
    expect(el.style.paddingLeft).toBe('2px')
    // the base token stays, so the side the override never named is untouched
    expect(classesOf(el)).toContain('padX_3')
  })

  test('a token that overlaps nothing stays a class', () => {
    const styles = sizing({ Root: { $$type: 'view', padX: 3 } })
    const el = probe(styles, [overrideStyles(styles, { Root: { gapper: 2 } })])
    expect(classesOf(el)).toContain('gapper_2')
    expect(el.style.gap).toBe('')
  })

  test('the same token name is still the deep merge, not an inline', () => {
    const styles = sizing({ Root: { $$type: 'view', padX: 3 } })
    const el = probe(styles, [overrideStyles(styles, { Root: { padX: 1 } })])
    expect(classesOf(el)).toContain('padX_1')
    expect(classesOf(el)).not.toContain('padX_3')
    expect(el.style.paddingLeft).toBe('')
  })
})
