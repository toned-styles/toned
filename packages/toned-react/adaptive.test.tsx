// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react'
import { defineSystem, getConfig, setConfig, type Variants } from '@toned/core'
import {
  type AdaptiveLayoutName,
  createAdaptiveStore,
  defineAdaptiveLayout,
} from '@toned/core/adaptive'
import * as React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { useAdaptiveVariants } from './adaptive.tsx'
import { createElements, useStyles } from './index.ts'
import web from './react-web.ts'

const original = { ...getConfig() }
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
const adaptive = defineAdaptiveLayout({
  axis: 'layout',
  root: 'Root',
  areas: ['Body', 'Actions'],
  fallback: 'stack',
  layouts: {
    stack: { flow: 'stack' },
    wide: { flow: 'row', gap: 12, when: { minWidth: 600 } },
  },
})
const ui = defineSystem({ id: 'react-adaptive', tokens: {} })
const sheet = ui
  .stylesheet({ Root: {}, Body: {}, Actions: {} })
  .variants(
    ($: Variants<{ layout: AdaptiveLayoutName<typeof adaptive> }>) =>
      adaptive.rules($),
    { defaults: { layout: adaptive.fallback } },
  )
const S = createElements(sheet)

test('existing element families consume adaptive variants without replacing or reordering children', () => {
  const store = createAdaptiveStore(adaptive)
  let renders = 0
  function App() {
    renders++
    const variants = useAdaptiveVariants(store)
    return (
      <S {...variants}>
        <S.Root data-testid="root">
          <S.Body data-testid="body">Body</S.Body>
          <S.Actions data-testid="actions">Actions</S.Actions>
        </S.Root>
      </S>
    )
  }
  const view = render(<App />)
  const root = view.getByTestId('root')
  const body = view.getByTestId('body')
  const actions = view.getByTestId('actions')
  expect(root.style.flexDirection).toBe('column')
  act(() => store.update({ container: { width: 800, height: 400 } }))
  expect(root.style.flexDirection).toBe('row')
  expect(root.style.gap).toBe('12px')
  expect(view.getByTestId('body')).toBe(body)
  expect(view.getByTestId('actions')).toBe(actions)
  expect([...root.children]).toEqual([body, actions])
  const count = renders
  act(() => store.update({ container: { width: 900, height: 400 } }))
  expect(renders).toBe(count)
  act(() => store.update({ container: { width: 400, height: 400 } }))
  expect(root.style.flexDirection).toBe('column')
})

test('useStyles retains its concise variants argument and SSR starts at the declared fallback', () => {
  const store = createAdaptiveStore(adaptive, {
    container: { width: 900, height: 400 },
  })
  function App() {
    const styles = useStyles(sheet, useAdaptiveVariants(store))
    return <div {...styles.Root} data-testid="root" />
  }
  expect(renderToString(<App />)).toContain('flex-direction:column')
  const view = render(<App />)
  expect(view.getByTestId('root').style.flexDirection).toBe('row')
  act(() => store.update({ container: { width: 400, height: 400 } }))
  expect(view.getByTestId('root').style.flexDirection).toBe('column')
})

test('StrictMode unsubscribes on unmount and a separate store cannot update another instance', () => {
  const first = createAdaptiveStore(adaptive)
  const second = createAdaptiveStore(adaptive)
  let active = 0
  const observed = {
    ...first,
    subscribe(listener: () => void) {
      active++
      const stop = first.subscribe(listener)
      return () => {
        active--
        stop()
      }
    },
  }
  function App() {
    const one = useAdaptiveVariants(observed)
    const two = useAdaptiveVariants(second)
    return (
      <span>
        {one.layout}:{two.layout}
      </span>
    )
  }
  const view = render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  expect(active).toBe(1)
  act(() => first.update({ container: { width: 900, height: 400 } }))
  expect(view.container.textContent).toBe('wide:stack')
  view.unmount()
  expect(active).toBe(0)
})

test('hydration starts with the fallback snapshot and commits measured variants without a mismatch', async () => {
  const store = createAdaptiveStore(adaptive, {
    container: { width: 900, height: 400 },
  })
  function App() {
    const styles = useStyles(sheet, useAdaptiveVariants(store))
    return <div {...styles.Root}>Content</div>
  }
  const container = document.createElement('div')
  container.innerHTML = renderToString(<App />)
  document.body.append(container)
  const initial = container.firstElementChild
  const errors: unknown[] = []
  let root!: ReturnType<typeof hydrateRoot>
  await act(async () => {
    root = hydrateRoot(container, <App />, {
      onRecoverableError: (error) => errors.push(error),
    })
  })
  expect(errors).toEqual([])
  expect(container.firstElementChild).toBe(initial)
  expect((initial as HTMLElement).style.flexDirection).toBe('row')
  act(() => root.unmount())
  container.remove()
})
