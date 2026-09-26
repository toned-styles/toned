// @vitest-environment happy-dom
import type { Variants } from '@toned/core'
import { act, cleanup, render } from '@testing-library/react'
import { defineSystem, defineToken } from '@toned/core'
import type { NativeHostAdapter } from '@toned/core/stylesheet'
import * as React from 'react'
import { afterEach, expect, test } from 'vitest'
import { ConfigProvider, createElements } from './index.ts'
import native from './react-native.ts'
import web from './react-web.ts'

afterEach(cleanup)

test('native createElements receives committed variants and semantic updates without remounting hosts', () => {
  const host = { style: {} as Record<string, unknown> }
  let selected = false,
    renders = 0,
    mounts = 0
  const listeners = new Set<() => void>()
  const adapter: NativeHostAdapter = {
    id: 'create-elements-native-fixture',
    renderer: 'custom',
    version: '1',
    accepts: (target) => target === host,
    states: ['selected'],
    readState: () => selected,
    subscribeState: (notify) => {
      listeners.add(notify)
      return () => {
        listeners.delete(notify)
      }
    },
    patch: (_, props) => {
      Object.assign(host.style, props['style'])
    },
    resetStyle: () => null,
    resetProp: () => null,
  }
  const FixtureHost = React.forwardRef<object, { style?: object }>(
    function FixtureHost(props, ref) {
      renders++
      React.useLayoutEffect(() => {
        mounts++
      }, [])
      React.useLayoutEffect(() => {
        Object.assign(host.style, props.style)
      }, [props.style])
      React.useImperativeHandle(ref, () => host, [])
      return null
    },
  )
  const system = defineSystem({
    id: 'elements-native',
    tokens: {},
    conditions: { states: { selected: '[aria-selected="true"]' } },
  })
  const sheet = system
    .stylesheet({
      Root: {
        $style: { opacity: 1 },
        ':selected': { $style: { opacity: 0.5 } },
      },
    })
    .variants(($: Variants<{ compact: boolean }>) => ({
      [$.compact(true)]: { Root: { $style: { width: 40 } } },
    }))
  const S = createElements(sheet)
  const config = {
    ...native,
    nativeHost: adapter,
    resolveElement: () => FixtureHost,
    useClassName: false,
    getTokens: () => ({}),
  }
  const wrap = (compact: boolean) => (
    <ConfigProvider config={config}>
      <S compact={compact}>
        <S.Root />
      </S>
    </ConfigProvider>
  )
  const view = render(wrap(false))
  expect(host.style['opacity']).toBe(1)
  expect(listeners.size).toBe(1)
  const beforeState = renders
  act(() => {
    selected = true
    for (const listener of listeners) listener()
  })
  expect(host.style['opacity']).toBe(0.5)
  expect(renders).toBe(beforeState)
  view.rerender(wrap(true))
  expect(host.style['width']).toBe(40)
  expect(host.style['opacity']).toBe(0.5)
  expect(mounts).toBe(1)
  view.unmount()
  expect(listeners.size).toBe(0)
})

test('standalone container parts drive descendant families through measurement without React rerenders', () => {
  const system = defineSystem(
    {
      w: defineToken({
        values: ['small', 'large'] as const,
        resolve: (v) => ({ width: v === 'small' ? 100 : 400 }),
      }),
    },
    { containers: { card: { wide: 80 } } },
  )
  const Card = createElements(
    system.stylesheet({ Root: { container: 'card' } }),
  )
  const Child = createElements(
    system.stylesheet({ Label: { w: 'small', '@card/wide': { w: 'large' } } }),
  )
  const reporters: Array<(width: number) => void> = []
  let renders = 0
  function Content() {
    renders++
    return <Child.Label data-testid="label" />
  }
  const view = render(
    <ConfigProvider
      config={{
        ...web,
        useClassName: false,
        mediaMode: 'runtime',
        getTokens: () => ({}),
        measureContainerProps: (report) => {
          reporters.push(report)
          return {}
        },
      }}
    >
      <Card.Root>
        <Content />
      </Card.Root>
    </ConfigProvider>,
  )
  expect(view.getByTestId('label').style.width).toBe('100px')
  expect(reporters).toHaveLength(1)
  act(() => reporters[0]?.(400))
  expect(view.getByTestId('label').style.width).toBe('400px')
  act(() => reporters[0]?.(200))
  expect(view.getByTestId('label').style.width).toBe('100px')
  expect(renders).toBe(1)
})

test('a scoped sheet observes measurements from its own container part', () => {
  const system = defineSystem(
    {
      w: defineToken({
        values: ['small', 'large'] as const,
        resolve: (value) => ({ width: value === 'small' ? 100 : 400 }),
      }),
    },
    { containers: { card: { wide: 80 } } },
  )
  const S = createElements(
    system.stylesheet({
      Root: { container: 'card' },
      Label: { w: 'small', '@card/wide': { w: 'large' } },
    }),
  )
  const reporters: Array<(width: number) => void> = []
  const view = render(
    <ConfigProvider
      config={{
        ...web,
        useClassName: false,
        mediaMode: 'runtime',
        getTokens: () => ({}),
        measureContainerProps: (report) => {
          reporters.push(report)
          return {}
        },
      }}
    >
      <S>
        <S.Root>
          <S.Label data-testid="label" />
        </S.Root>
      </S>
    </ConfigProvider>,
  )
  expect(view.getByTestId('label').style.width).toBe('100px')
  expect(reporters).toHaveLength(1)
  act(() => reporters[0]?.(400))
  expect(view.getByTestId('label').style.width).toBe('400px')
  act(() => reporters[0]?.(200))
  expect(view.getByTestId('label').style.width).toBe('100px')
})

test('repeated scoped container parts resolve each label against its nearest measurement', () => {
  const system = defineSystem(
    {
      w: defineToken({
        values: ['small', 'large'] as const,
        resolve: (value) => ({ width: value === 'small' ? 100 : 400 }),
      }),
    },
    { containers: { card: { wide: 80 } } },
  )
  const S = createElements(
    system.stylesheet({
      Root: { container: 'card' },
      Label: { w: 'small', '@card/wide': { w: 'large' } },
    }),
  )
  const reporters: Array<(width: number) => void> = []
  const view = render(
    <ConfigProvider
      config={{
        ...web,
        useClassName: false,
        mediaMode: 'runtime',
        getTokens: () => ({}),
        measureContainerProps: (report) => {
          reporters.push(report)
          return {}
        },
      }}
    >
      <S>
        <S.Root>
          <S.Label data-testid="first" />
        </S.Root>
        <S.Root>
          <S.Label data-testid="second" />
        </S.Root>
        <S.Label data-testid="outside" />
      </S>
    </ConfigProvider>,
  )
  expect(reporters).toHaveLength(2)
  act(() => reporters[0]?.(400))
  expect(view.getByTestId('first').style.width).toBe('400px')
  expect(view.getByTestId('second').style.width).toBe('100px')
  expect(view.getByTestId('outside').style.width).toBe('100px')
  act(() => reporters[1]?.(400))
  act(() => reporters[0]?.(200))
  expect(view.getByTestId('first').style.width).toBe('100px')
  expect(view.getByTestId('second').style.width).toBe('400px')
  expect(view.getByTestId('outside').style.width).toBe('100px')
})

test('nested same-name containers shadow outer measurements within one scoped family', () => {
  const system = defineSystem(
    {
      w: defineToken({
        values: ['small', 'large'] as const,
        resolve: (value) => ({ width: value === 'small' ? 100 : 400 }),
      }),
    },
    { containers: { card: { wide: 80 } } },
  )
  const S = createElements(
    system.stylesheet({
      Root: { container: 'card' },
      Label: { w: 'small', '@card/wide': { w: 'large' } },
    }),
  )
  const reporters: Array<(width: number) => void> = []
  const view = render(
    <ConfigProvider
      config={{
        ...web,
        useClassName: false,
        mediaMode: 'runtime',
        getTokens: () => ({}),
        measureContainerProps: (report) => {
          reporters.push(report)
          return {}
        },
      }}
    >
      <S>
        <S.Root>
          <S.Label data-testid="outer" />
          <S.Root>
            <S.Label data-testid="inner" />
          </S.Root>
        </S.Root>
      </S>
    </ConfigProvider>,
  )
  expect(reporters).toHaveLength(2)
  act(() => reporters[0]?.(400))
  expect(view.getByTestId('outer').style.width).toBe('400px')
  expect(view.getByTestId('inner').style.width).toBe('100px')
  act(() => reporters[1]?.(400))
  act(() => reporters[0]?.(200))
  expect(view.getByTestId('outer').style.width).toBe('100px')
  expect(view.getByTestId('inner').style.width).toBe('400px')
})
