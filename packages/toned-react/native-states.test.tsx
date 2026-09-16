// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react'
import { defineSystem } from '@toned/core'
import type { NativeHostAdapter } from '@toned/core/stylesheet'
import * as React from 'react'
import { afterEach, expect, test } from 'vitest'
import { ConfigProvider, useStyles } from './index.ts'
import native from './react-native.ts'

afterEach(cleanup)

test('native semantic notifications patch mounted React hosts without rendering components', () => {
  const host = { style: {} as Record<string, unknown> }
  let selected = false,
    renders = 0,
    writes = 0
  const listeners = new Set<() => void>()
  const adapter: NativeHostAdapter = {
    id: 'mounted-semantic-fixture',
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
      writes++
      Object.assign(host.style, props['style'])
    },
    resetStyle: () => null,
    resetProp: () => null,
  }
  const FixtureHost = React.forwardRef<object, { style?: object }>(
    function FixtureHost(props, ref) {
      React.useLayoutEffect(() => {
        Object.assign(host.style, props.style)
      }, [props.style])
      React.useImperativeHandle(ref, () => host, [])
      return null
    },
  )
  const system = defineSystem({
    id: 'mounted-native-states',
    tokens: {},
    conditions: { states: { selected: '[aria-selected="true"]' } },
  })
  const sheet = system.stylesheet({
    Root: { $style: { opacity: 1 }, ':selected': { $style: { opacity: 0.5 } } },
  })
  function View() {
    renders++
    const styles = useStyles(sheet)
    return <FixtureHost {...styles.Root} />
  }
  const result = render(
    <ConfigProvider
      config={{
        ...native,
        nativeHost: adapter,
        useClassName: false,
        getTokens: () => ({}),
      }}
    >
      <View />
    </ConfigProvider>,
  )
  expect(host.style['opacity']).toBe(1)
  expect(listeners.size).toBe(1)
  act(() => {
    selected = true
    for (const listener of listeners) listener()
  })
  expect(host.style['opacity']).toBe(0.5)
  const afterChange = writes
  act(() => {
    for (const listener of listeners) listener()
  })
  expect(writes).toBe(afterChange)
  expect(renders).toBe(1)
  result.unmount()
  expect(listeners.size).toBe(0)
})
