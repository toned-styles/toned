// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react'
import { defineConfig, defineSystem, defineToken } from '@toned/core'
import { cssVariablesBackend } from '@toned/core/backends'
import { createRenderer } from '@toned/core/server'
import * as React from 'react'
import { afterEach, expect, test } from 'vitest'
import config18 from './config.18.ts'
import config19 from './config.19.ts'
import { TokensContext } from './context.ts'
import {
  ConfigProvider,
  overrideStyles,
  StyleOverrides,
  TonedProvider,
  useBind,
  useStyles,
} from './index.ts'
import web from './react-web.ts'

afterEach(cleanup)
const system = defineSystem({
  opacity: defineToken({
    values: [0, 0.5, 1] as const,
    resolve: (opacity: number) => ({ opacity }),
  }),
  ink: defineToken({
    values: [true] as const,
    resolve: (_: boolean, tokens: any) => ({ color: tokens.ink }),
  }),
})
const sheet = system
  .stylesheet({ Root: { opacity: 0 } })
  .variants<{ size: 's' | 'm' }>()(
  ($) => ({
    [$.size('m')]: { Root: { opacity: 0.5 } },
    [$.size('s')]: { Root: { opacity: 1 } },
  }),
  { defaults: { size: 'm' } },
)
const config = defineConfig({
  ...web,
  useClassName: false,
  mediaMode: false,
  pseudoMode: false,
})

test('defaulted variants and explicit undefined agree; instance overrides win subtree variants', () => {
  const derived = sheet.extend({ Root: { ink: true } })
  const inherited = overrideStyles(derived, { Root: { opacity: 0 } })
  const local = { Root: { opacity: 1 as const } }
  function View({ size, override }: { size?: 's' | 'm'; override?: boolean }) {
    const s = useStyles(derived, {
      variants: { size },
      overrides: override ? local : undefined,
    })
    return <div {...s.Root} data-testid="target" />
  }
  const wrap = (override = false, size?: 's' | 'm') => (
    <ConfigProvider config={config}>
      <StyleOverrides value={[inherited]}>
        <View override={override} size={size} />
      </StyleOverrides>
    </ConfigProvider>
  )
  const view = render(wrap())
  expect(view.getByTestId('target').style.opacity).toBe('0')
  view.rerender(wrap(true))
  expect(view.getByTestId('target').style.opacity).toBe('1')
  view.rerender(
    <ConfigProvider config={config}>
      <View />
    </ConfigProvider>,
  )
  expect(view.getByTestId('target').style.opacity).toBe('0.5')
  view.rerender(
    <ConfigProvider config={config}>
      <View size="s" />
    </ConfigProvider>,
  )
  expect(view.getByTestId('target').style.opacity).toBe('1')
})

for (const [name, adapter] of [
  ['18', config18],
  ['19', config19],
] as const) {
  test(`React ${name} compatibility config uses hook context and pure fallback getter`, () => {
    const config = {
      ...web,
      ...adapter(TokensContext, { ink: 'black' }),
      getProps: web.getProps,
      useClassName: false,
      mediaMode: false as const,
      pseudoMode: false as const,
    }
    expect(config.getTokens()).toEqual({ ink: 'black' })
    const themed = system.stylesheet({ Root: { ink: true } })
    function View() {
      const s = useStyles(themed)
      return <div {...s.Root} data-testid="target" />
    }
    const wrap = (ink: string) => (
      <ConfigProvider config={config}>
        <TokensContext.Provider value={{ ink }}>
          <View />
        </TokensContext.Provider>
      </ConfigProvider>
    )
    const view = render(wrap('red'))
    expect(view.getByTestId('target').style.color).toBe('red')
    view.rerender(wrap('blue'))
    expect(view.getByTestId('target').style.color).toBe('blue')
    expect(config.getTokens()).toEqual({ ink: 'black' })
  })
}

test('TonedProvider selects one backend, validates sheet ownership and updates explicit themes', () => {
  const themed = system.stylesheet({ Root: { ink: true } })
  const renderer = createRenderer(system, {
    backend: {
      ...cssVariablesBackend,
      id: 'web-literals',
      browserConditions: false,
    },
    tokens: { ink: 'red' },
  })
  function View() {
    const s = useStyles(themed)
    return <div {...s.Root} data-testid="provider-target" />
  }
  const ui = (ink?: string) => (
    <TonedProvider
      renderer={renderer}
      host={web}
      theme={ink ? { ink } : undefined}
    >
      <View />
    </TonedProvider>
  )
  const view = render(ui())
  expect(view.getByTestId('provider-target').style.color).toBe('red')
  view.rerender(ui('blue'))
  expect(view.getByTestId('provider-target').style.color).toBe('blue')
  expect(() =>
    render(
      <TonedProvider
        renderer={renderer}
        host={{ ...web, platform: 'native' }}
      />,
    ),
  ).toThrow(/requires a web host/)
})

test('defaulted axes agree with pure resolution for omitted and explicit undefined values', () => {
  const renderer = createRenderer(system, {
    backend: {
      ...cssVariablesBackend,
      id: 'web-literals',
      browserConditions: false,
    },
    tokens: {},
  })
  expect(renderer.resolve(sheet).Root.style['opacity']).toBe(0.5)
  expect(
    renderer.resolve(sheet, { variants: { size: undefined } }).Root.style[
      'opacity'
    ],
  ).toBe(0.5)
  expect(
    renderer.resolve(sheet, { variants: { size: 's' } }).Root.style['opacity'],
  ).toBe(1)
})

test('instance null removes the same base path while variants remain authored', () => {
  const base = system.stylesheet({ Root: { opacity: 0.5 } })
  function View() {
    const s = useStyles(base, { overrides: { Root: { opacity: null } } })
    return <div {...s.Root} data-testid="removed" />
  }
  const view = render(
    <ConfigProvider config={config}>
      <View />
    </ConfigProvider>,
  )
  expect(view.getByTestId('removed').style.opacity).toBe('')
})

test('bound parts forward caller refs on React 18 and React 19', () => {
  const ref = React.createRef<HTMLDivElement>()
  function View() {
    const parts = useBind(sheet)
    return <parts.Root as="div" ref={ref} data-testid="bound-ref" />
  }
  const view = render(
    <ConfigProvider config={config}>
      <View />
    </ConfigProvider>,
  )
  expect(ref.current).toBe(view.getByTestId('bound-ref'))
  view.unmount()
  expect(ref.current).toBe(null)
})

test('alternating sibling override sequences reuse their immutable derivations', () => {
  const base = system.stylesheet({ Root: { opacity: 0 } })
  let factoryCalls = 0
  const entry = (opacity: 0.5 | 1) =>
    overrideStyles(base, () => {
      factoryCalls++
      return { Root: { opacity } }
    })
  const left = entry(0.5),
    right = entry(1)
  function View() {
    const s = useStyles(base)
    return <div {...s.Root} />
  }
  const ui = (tick: number) => (
    <ConfigProvider config={config}>
      <div data-tick={tick}>
        <StyleOverrides value={[left]}>
          <View />
        </StyleOverrides>
        <StyleOverrides value={[right]}>
          <View />
        </StyleOverrides>
      </div>
    </ConfigProvider>
  )
  const view = render(ui(0))
  expect(factoryCalls).toBe(2)
  view.rerender(ui(1))
  expect(factoryCalls).toBe(2)
})

test('TonedProvider theme updates preserve bound component identities and child state', () => {
  const themed = system.stylesheet({ Root: { ink: true } })
  const renderer = createRenderer(system, {
    backend: {
      ...cssVariablesBackend,
      id: 'theme-state',
      browserConditions: false,
    },
    tokens: { ink: 'red' },
  })
  let mounts = 0
  function Child() {
    React.useEffect(() => {
      mounts++
    }, [])
    return <span>child</span>
  }
  function View() {
    const s = useBind(themed)
    return s.$scope(
      <s.Root data-testid="stable-theme">
        <Child />
      </s.Root>,
    )
  }
  const ui = (ink: string) => (
    <TonedProvider renderer={renderer} host={web} theme={{ ink }}>
      <View />
    </TonedProvider>
  )
  const view = render(ui('red'))
  const host = view.getByTestId('stable-theme')
  view.rerender(ui('blue'))
  expect(view.getByTestId('stable-theme')).toBe(host)
  expect(host.style.color).toBe('blue')
  expect(mounts).toBe(1)
})

test('instance override entries do not collide with parts named sheet and rules', () => {
  const named = system.stylesheet({
    sheet: { opacity: 0 },
    rules: { opacity: 0 },
  })
  function View() {
    const s = useStyles(named, {
      overrides: { sheet: { opacity: 0.5 }, rules: { opacity: 1 } },
    })
    return (
      <>
        <div {...s.sheet} data-testid="sheet-part" />
        <div {...s.rules} data-testid="rules-part" />
      </>
    )
  }
  const view = render(
    <ConfigProvider config={config}>
      <View />
    </ConfigProvider>,
  )
  expect(view.getByTestId('sheet-part').style.opacity).toBe('0.5')
  expect(view.getByTestId('rules-part').style.opacity).toBe('1')
})

test('public parts never collide with controller fields or methods', () => {
  const named = system.stylesheet({
    config: { opacity: 1 },
    matchStyles: { opacity: 0.5 },
    elementDescriptors: { opacity: 0 },
  })
  function View() {
    const s = useStyles(named)
    const parts = useBind(named)
    return (
      <>
        <div {...s.config} data-testid="config-part" />
        <div {...s.matchStyles} data-testid="method-part" />
        <parts.elementDescriptors data-testid="bound-method" />
      </>
    )
  }
  const view = render(
    <ConfigProvider config={config}>
      <View />
    </ConfigProvider>,
  )
  expect(view.getByTestId('config-part').style.opacity).toBe('1')
  expect(view.getByTestId('method-part').style.opacity).toBe('0.5')
  expect(view.getByTestId('bound-method').style.opacity).toBe('0')
})
