// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { defineSystem, defineToken, getConfig, setConfig } from '@toned/core'
import * as React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { createElements as runtimeCreateElements } from './create-elements.tsx'
import {
  ConfigProvider,
  createElements,
  overrideStyles,
  StyleOverrides,
} from './index.ts'
import web from './react-web.ts'

const original = { ...getConfig() }
const system = defineSystem({
  opacity: defineToken({
    values: [0, 0.25, 0.5, 1] as const,
    resolve: (opacity: number) => ({ opacity }),
  }),
  ink: defineToken({
    values: [true] as const,
    resolve: (_: boolean, tokens: any) => ({ color: tokens.ink }),
  }),
})
const sheet = system
  .stylesheet({
    Root: { $kind: 'view', opacity: 0, ':hover': { opacity: 0.25 } },
    Label: { $kind: 'text', opacity: 0 },
  })
  .variants<{ size: 's' | 'l' }>()(
  ($) => ({
    [$.size('s')]: {
      Root: { opacity: 0.5, ':hover': { opacity: 0.25 } },
      Label: { opacity: 0.5 },
    },
    [$.size('l')]: {
      Root: { opacity: 1, ':hover': { opacity: 0.25 } },
      Label: { opacity: 1 },
    },
  }),
  { defaults: { size: 's' } },
)

// The factory is deliberately called before any host configuration is installed.
const S = createElements(sheet)

beforeEach(() =>
  setConfig({
    ...web,
    getTokens: () => ({}),
    useClassName: false,
    mediaMode: false,
    pseudoMode: 'runtime',
  }),
)
afterEach(() => {
  cleanup()
  setConfig(original)
})

test('creating a family does not read tokens or resolve a host', () => {
  setConfig({
    getTokens: () => {
      throw new Error('tokens are only available while rendering')
    },
    resolveElement: () => {
      throw new Error('hosts are only available while rendering')
    },
  })
  expect(() => createElements(sheet)).not.toThrow()
})

const uncheckedCreateElements = runtimeCreateElements as (
  sheet: object,
) => unknown

test.each([
  'name',
  'length',
  'displayName',
  'defaultProps',
  'propTypes',
  'render',
  '$$typeof',
  'toString',
])('factory diagnoses component metadata collision for part %s', (part) => {
  // Deliberately bypass authoring types to exercise JavaScript callers of the
  // runtime guard with a dynamically selected, reserved component member.
  const uncheckedStylesheet = system.stylesheet as (
    rules: Record<string, { opacity: number }>,
  ) => object
  const invalid = uncheckedStylesheet({ [part]: { opacity: 0 } })
  expect(() => uncheckedCreateElements(invalid)).toThrow(
    `part "${part}" conflicts with component metadata`,
  )
})

test.each(['children', 'key', 'ref'] as const)(
  'factory diagnoses reserved React variant axis %s from selectors and defaults',
  (axis) => {
    const base = system.stylesheet({ Root: { opacity: 0 } })
    const selected = base.variants<Record<string, 'on'>>()(($) => ({
      [$[axis]!('on')]: { Root: { opacity: 1 } },
    }))
    const defaulted = base.variants<Record<string, 'on'>>()(() => ({}), {
      defaults: { [axis]: 'on' },
    })
    for (const invalid of [selected, defaulted])
      expect(() => uncheckedCreateElements(invalid)).toThrow(
        `variant axis "${axis}" conflicts with React props`,
      )
  },
)

test('standalone parts use declared defaults and semantic host kinds', () => {
  const view = render(
    <>
      <S.Root data-testid="root" />
      <S.Label data-testid="label">Default</S.Label>
    </>,
  )
  expect(view.getByTestId('root').tagName).toBe('DIV')
  expect(view.getByTestId('label').tagName).toBe('SPAN')
  expect(view.getByTestId('root').style.opacity).toBe('0.5')
  expect(view.getByTestId('label').style.opacity).toBe('0.5')
})

test('a standalone part without variant defaults uses the base declaration', () => {
  const Required = createElements(
    system.stylesheet({ Label: { opacity: 0 } }).variants<{
      size: 's' | 'l'
    }>()(($) => ({ [$.size('l')]: { Label: { opacity: 1 } } })),
  )
  const view = render(<Required.Label data-testid="base" />)
  expect(view.getByTestId('base').style.opacity).toBe('0')
})

test('the provider introduces no host node and sibling instances stay isolated', () => {
  const view = render(
    <>
      <S size="s">
        <S.Label data-testid="small" />
      </S>
      <S size="l">
        <S.Label data-testid="large" />
      </S>
      <S.Label data-testid="standalone" />
    </>,
  )
  expect(view.container.children).toHaveLength(3)
  expect(view.getByTestId('small').style.opacity).toBe('0.5')
  expect(view.getByTestId('large').style.opacity).toBe('1')
  expect(view.getByTestId('standalone').style.opacity).toBe('0.5')
})

test('nested instances start from defaults and the nearest matching family wins', () => {
  // Even two factories for the same sheet have separate context identities.
  const Other = createElements(sheet)
  const view = render(
    <S size="l">
      <Other size="s">
        <S.Label data-testid="outer" />
        <Other.Label data-testid="other" />
        <S>
          <S.Label data-testid="inner-default" />
          <Other.Label data-testid="other-through-inner" />
        </S>
      </Other>
      <S.Label data-testid="outer-again" />
    </S>,
  )
  expect(view.getByTestId('outer').style.opacity).toBe('1')
  expect(view.getByTestId('outer-again').style.opacity).toBe('1')
  expect(view.getByTestId('inner-default').style.opacity).toBe('0.5')
  expect(view.getByTestId('other').style.opacity).toBe('0.5')
  expect(view.getByTestId('other-through-inner').style.opacity).toBe('0.5')
})

test('variant updates preserve host identity, focus, refs and child state', () => {
  const ref = React.createRef<HTMLInputElement>()
  let mounts = 0
  const Input = React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<'input'>
  >((props, forwardedRef) => {
    const [value, setValue] = React.useState('initial')
    React.useEffect(() => {
      mounts++
    }, [])
    return (
      <input
        {...props}
        ref={forwardedRef}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        data-testid="input"
      />
    )
  })
  const ui = (size: 's' | 'l') => (
    <S size={size}>
      <S.Root as={Input} ref={ref} />
    </S>
  )
  const view = render(ui('s'))
  const input = view.getByTestId('input') as HTMLInputElement
  input.focus()
  fireEvent.change(input, { target: { value: 'edited' } })
  view.rerender(ui('l'))
  expect(view.getByTestId('input')).toBe(input)
  expect(ref.current).toBe(input)
  expect(document.activeElement).toBe(input)
  expect(input.value).toBe('edited')
  expect(input.style.opacity).toBe('1')
  expect(mounts).toBe(1)
})

test('a host resolver that creates component types resolves once per part mount', () => {
  let resolutions = 0
  let mounts = 0
  setConfig({
    resolveElement: () => {
      resolutions++
      return React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
        function ResolvedInput(props, ref) {
          const [value, setValue] = React.useState('initial')
          React.useEffect(() => {
            mounts++
          }, [])
          return (
            <input
              {...props}
              ref={ref}
              value={value}
              onChange={(event) => setValue(event.currentTarget.value)}
            />
          )
        },
      )
    },
  })
  const ui = (size: 's' | 'l') => (
    <S size={size}>
      <S.Root data-testid="resolved-input" />
    </S>
  )
  const view = render(ui('s'))
  const input = view.getByTestId('resolved-input') as HTMLInputElement
  fireEvent.change(input, { target: { value: 'edited' } })
  view.rerender(ui('l'))
  expect(resolutions).toBe(1)
  expect(mounts).toBe(1)
  expect(view.getByTestId('resolved-input')).toBe(input)
  expect(input.value).toBe('edited')
  expect(input.style.opacity).toBe('1')
})

test('descendant layout effects see the current render snapshot in the same commit', () => {
  const values: string[] = []
  function Measure() {
    React.useLayoutEffect(() => {
      values.push(
        (document.querySelector('[data-measured]') as HTMLElement).style
          .opacity,
      )
    })
    return null
  }
  const ui = (size: 's' | 'l') => (
    <S size={size}>
      <S.Root as="div" data-measured="">
        <Measure />
      </S.Root>
    </S>
  )
  const view = render(ui('s'))
  view.rerender(ui('l'))
  expect(values).toEqual(['0.5', '1'])
})

test('standalone mounts and sibling provider instances own separate interaction state', () => {
  const view = render(
    <>
      <S.Root data-testid="first" />
      <S.Root data-testid="second" />
      <S size="s">
        <S.Root data-testid="scoped" />
      </S>
    </>,
  )
  const first = view.getByTestId('first')
  const second = view.getByTestId('second')
  const scoped = view.getByTestId('scoped')
  fireEvent.mouseEnter(first)
  expect(first.style.opacity).toBe('0.25')
  expect(second.style.opacity).toBe('0.5')
  expect(scoped.style.opacity).toBe('0.5')
  fireEvent.mouseLeave(first)
  fireEvent.mouseEnter(scoped)
  expect(first.style.opacity).toBe('0.5')
  expect(scoped.style.opacity).toBe('0.25')
})

test('a surviving standalone mount retains only its own state when a sibling unmounts', async () => {
  const ui = (showFirst: boolean) => (
    <>
      {showFirst && <S.Root key="first" data-testid="first" />}
      <S.Root key="second" data-testid="second" />
    </>
  )
  const view = render(ui(true))
  const first = view.getByTestId('first')
  const second = view.getByTestId('second')
  fireEvent.mouseEnter(first)
  expect(first.style.opacity).toBe('0.25')
  expect(second.style.opacity).toBe('0.5')
  fireEvent.mouseEnter(second)
  await act(() => view.rerender(ui(false)))
  expect(view.getByTestId('second')).toBe(second)
  expect(second.style.opacity).toBe('0.25')
  fireEvent.mouseLeave(second)
  expect(second.style.opacity).toBe('0.5')
})

test.each([false, true])(
  'Strict Mode %s scoped part balances caller refs and preserves caller host props',
  async (scoped) => {
    let attached = 0
    let calls = 0
    const callerRef = (node: HTMLButtonElement | null) => {
      if (!node) return
      attached++
      return () => {
        attached--
      }
    }
    const ui = (size: 's' | 'l') => {
      const part = (
        <S.Root
          as="button"
          ref={callerRef}
          className="caller"
          style={{ width: 23 }}
          data-testid="target"
          onMouseEnter={() => calls++}
        />
      )
      return (
        <React.StrictMode>
          {scoped ? <S size={size}>{part}</S> : part}
        </React.StrictMode>
      )
    }
    const view = render(ui('s'))
    const target = view.getByTestId('target')
    expect(attached).toBe(1)
    fireEvent.mouseEnter(target)
    expect(calls).toBe(1)
    expect(target.style.opacity).toBe('0.25')
    view.rerender(ui('l'))
    expect(view.getByTestId('target')).toBe(target)
    expect(attached).toBe(1)
    expect(target.classList.contains('caller')).toBe(true)
    expect(target.style.width).toBe('23px')
    fireEvent.mouseLeave(target)
    expect(target.style.opacity).toBe(scoped ? '1' : '0.5')
    await act(() => view.unmount())
    expect(attached).toBe(0)
  },
)

test('a suspended descendant cannot publish pending variants to committed events', async () => {
  const blocker = new Promise<never>(() => {})
  let attempted = false
  function Child({ suspend }: { suspend: boolean }) {
    if (suspend) {
      attempted = true
      throw blocker
    }
    return null
  }
  const ui = (suspend: boolean) => (
    <React.Suspense fallback="waiting">
      <S size={suspend ? 'l' : 's'}>
        <S.Root data-testid="target">
          <Child suspend={suspend} />
        </S.Root>
      </S>
    </React.Suspense>
  )
  const view = render(ui(false))
  const target = view.getByTestId('target')
  await act(() => React.startTransition(() => view.rerender(ui(true))))
  expect(attempted).toBe(true)
  expect(target.style.opacity).toBe('0.5')
  fireEvent.mouseEnter(target)
  expect(target.style.opacity).toBe('0.25')
  fireEvent.mouseLeave(target)
  expect(target.style.opacity).toBe('0.5')
})

test('ambient overrides apply to both provider-owned and standalone parts', () => {
  const base = system.stylesheet({ Label: { opacity: 0 } })
  const Elements = createElements(base)
  const override = overrideStyles(base, { Label: { opacity: 1 } })
  const view = render(
    <StyleOverrides value={[override]}>
      <Elements>
        <Elements.Label data-testid="scoped" />
      </Elements>
      <Elements.Label data-testid="standalone" />
    </StyleOverrides>,
  )
  expect(view.getByTestId('scoped').style.opacity).toBe('1')
  expect(view.getByTestId('standalone').style.opacity).toBe('1')
})

test('replacement runtime configs update styles without remounting the parts', () => {
  const Elements = createElements(system.stylesheet({ Label: { ink: true } }))
  const config = { ...getConfig() }
  const ui = (ink: string) => (
    <ConfigProvider config={{ ...config, getTokens: () => ({ ink }) }}>
      <Elements>
        <Elements.Label data-testid="scoped" />
      </Elements>
      <Elements.Label data-testid="standalone" />
    </ConfigProvider>
  )
  const view = render(ui('red'))
  const scoped = view.getByTestId('scoped')
  const standalone = view.getByTestId('standalone')
  expect(scoped.style.color).toBe('red')
  expect(standalone.style.color).toBe('red')
  view.rerender(ui('blue'))
  expect(view.getByTestId('scoped')).toBe(scoped)
  expect(view.getByTestId('standalone')).toBe(standalone)
  expect(scoped.style.color).toBe('blue')
  expect(standalone.style.color).toBe('blue')
})

test('server output and hydration agree for scoped and standalone parts without inserting CSS', async () => {
  const ui = (
    <>
      <S size="l">
        <S.Label data-testid="scoped">Large</S.Label>
      </S>
      <S.Label data-testid="standalone">Default</S.Label>
    </>
  )
  const headCount = document.head.childElementCount
  const host = document.createElement('div')
  host.innerHTML = renderToString(ui)
  document.body.append(host)
  const scoped = host.querySelector('[data-testid="scoped"]') as HTMLElement
  const standalone = host.querySelector(
    '[data-testid="standalone"]',
  ) as HTMLElement
  expect(scoped.style.opacity).toBe('1')
  expect(standalone.style.opacity).toBe('0.5')
  const errors: unknown[] = []
  let root: ReturnType<typeof hydrateRoot> | undefined
  try {
    await act(() => {
      root = hydrateRoot(host, ui, {
        onRecoverableError: (error) => errors.push(error),
      })
    })
    expect(host.querySelector('[data-testid="scoped"]')).toBe(scoped)
    expect(host.querySelector('[data-testid="standalone"]')).toBe(standalone)
    expect(errors).toEqual([])
    expect(document.head.childElementCount).toBe(headCount)
  } finally {
    if (root) await act(() => root!.unmount())
    host.remove()
  }
})
