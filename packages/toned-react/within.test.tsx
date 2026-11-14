import { cleanup, render } from '@testing-library/react'
// @vitest-environment happy-dom
import type { Variants } from '@toned/core'
import { defineSystem } from '@toned/core'
import type { NativeHostAdapter } from '@toned/core/stylesheet'
import * as React from 'react'
import { afterEach, expect, test } from 'vitest'

import { ConfigProvider, createElements, useStyles } from './index.ts'
import native from './react-native.ts'

afterEach(cleanup)

/**
 * Context markers on native: a provider part gives its marker to the React
 * tree below it, and a descendant sheet's `'@within …'` keys read the
 * nearest provider of each context.
 */
const system = defineSystem({
  id: 'within-native',
  tokens: {},
  conditions: { contexts: { prose: { values: ['faq', 'callout'] } } },
})
const proseSheet = system
  .stylesheet({ Root: { $context: 'prose', $style: { width: 10 } } })
  .variants(($: Variants<{ kind: 'faq' | 'callout' }>) => ({
    [$.kind('faq')]: { Root: { $context: 'prose=faq' } },
    [$.kind('callout')]: { Root: { $context: 'prose=callout' } },
  }))
const titleSheet = system.stylesheet({
  Root: {
    $style: { opacity: 1 },
    '@within prose': { $style: { width: 20 } },
    '@within prose=faq': { $style: { opacity: 0.5 } },
  },
})
const Prose = createElements(proseSheet)

const adapter: NativeHostAdapter = {
  id: 'within-native-fixture',
  renderer: 'custom',
  version: '1',
  accepts: () => true,
  patch: () => {},
  resetStyle: () => null,
  resetProp: () => null,
}
const Host = React.forwardRef<object, { children?: React.ReactNode }>(
  function Host(props, ref) {
    React.useImperativeHandle(ref, () => ({}), [])
    return <>{props.children}</>
  },
)
const config = {
  ...native,
  nativeHost: adapter,
  resolveElement: () => Host,
  useClassName: false,
  getTokens: () => ({}),
}

function Title({ seen }: { seen: object[] }) {
  const s = useStyles(titleSheet)
  seen.push(s.Root.style as object)
  return null
}

const last = (seen: object[]) => seen[seen.length - 1]

test('a descendant reads the nearest provider of a context', () => {
  const seen: object[] = []
  const tree = (kind: 'faq' | 'callout') => (
    <ConfigProvider config={config}>
      <Prose kind={kind}>
        <Prose.Root>
          <Title seen={seen} />
        </Prose.Root>
      </Prose>
    </ConfigProvider>
  )
  const view = render(tree('faq'))
  expect(last(seen)).toEqual({ opacity: 0.5, width: 20 })
  view.rerender(tree('callout'))
  expect(last(seen)).toEqual({ opacity: 1, width: 20 })
})

test('outside any provider the context keys do not apply', () => {
  const seen: object[] = []
  render(
    <ConfigProvider config={config}>
      <Title seen={seen} />
    </ConfigProvider>,
  )
  expect(last(seen)).toEqual({ opacity: 1 })
})

test('a nested provider of the same context answers for its subtree', () => {
  const outer: object[] = []
  const inner: object[] = []
  render(
    <ConfigProvider config={config}>
      <Prose kind="faq">
        <Prose.Root>
          <Title seen={outer} />
          <Prose kind="callout">
            <Prose.Root>
              <Title seen={inner} />
            </Prose.Root>
          </Prose>
        </Prose.Root>
      </Prose>
    </ConfigProvider>,
  )
  expect(last(outer)).toEqual({ opacity: 0.5, width: 20 })
  expect(last(inner)).toEqual({ opacity: 1, width: 20 })
})
