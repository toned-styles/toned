// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from '@testing-library/react'
import { defineSystem, defineToken, getConfig, setConfig } from '@toned/core'
import { createTailwindBackend } from '@toned/core/backends'
import { buildTailwind } from '@toned/core/build'
import { afterEach, expect, test } from 'vitest'
import { ConfigProvider, useStyles } from './index.ts'
import web from './react-web.ts'

const original = getConfig()
afterEach(() => {
  cleanup()
  setConfig(original)
})

test('a built utility backend patches cross-part host facts without rendering or stealing caller classes', async () => {
  const system = defineSystem({
    id: 'built-utility-host',
    tokens: {
      opacity: defineToken({
        values: [0, 1],
        resolve: (opacity) => ({ opacity }),
      }),
    },
  })
  const sheet = system
    .stylesheet({
      Source: { opacity: 1 },
      Target: { opacity: 0 },
      Local: { opacity: 0, ':hover': { opacity: 1 } },
    })
    .extend({
      [system.q.all(system.q.part('Source').state('hover'))]: {
        Target: { opacity: 1 },
      },
    })
  const profile = createTailwindBackend({
    id: 'host-test',
    mappings: [
      { field: 'opacity', value: 0, utility: 'opacity-0' },
      { field: 'opacity', value: 1, utility: 'opacity-100' },
    ],
    parameters: [
      {
        field: 'opacity',
        utility: 'opacity-[var(--opacity)]',
        variable: '--opacity',
        serialize: String,
      },
    ],
  })
  // This fixture isolates the React host contract. The release browser fixture
  // independently compiles the real Tailwind implementation and checks its CSS.
  const built = await buildTailwind(system, profile, {
    sheets: [sheet],
    tokens: {},
    source: '',
    compile: async (source) => ({
      build: () =>
        source.includes('@apply')
          ? `.toned_mapping_probe { opacity: ${source.includes('var(--opacity)') ? 'var(--opacity)' : source.includes('opacity-100') ? 1 : 0}; }`
          : '.opacity-0 {opacity:0}.opacity-100 {opacity:1}.opacity-\\[var\\(--opacity\\)\\] {opacity:var(--opacity)}',
    }),
  })
  setConfig({
    ...web,
    getTokens: () => ({}),
    useClassName: false,
    mediaMode: false,
    pseudoMode: 'runtime',
  })
  let renders = 0
  function View() {
    renders++
    const style = useStyles(sheet)
    return (
      <>
        <div {...style.Source.withProps({ 'data-testid': 'source' })} />
        <div {...style.Local.withProps({ 'data-testid': 'local' })} />
        <div
          {...style.Target.withProps({
            'data-testid': 'target',
            className: 'caller-owned',
          })}
        />
      </>
    )
  }
  const rules = document.head.childElementCount
  const view = render(
    <ConfigProvider config={{ ...getConfig(), backend: built.backend }}>
      <View />
    </ConfigProvider>,
  )
  const source = view.getByTestId('source')
  const target = view.getByTestId('target')
  const local = view.getByTestId('local')
  expect(local.classList.contains('opacity-[var(--opacity)]')).toBe(true)
  expect(local.style.getPropertyValue('--opacity')).toContain('var(')
  const localParameters = local.getAttribute('style')
  expect(target.classList.contains('opacity-0')).toBe(true)
  fireEvent.mouseEnter(source)
  expect(target.classList.contains('opacity-100')).toBe(true)
  expect(target.classList.contains('opacity-0')).toBe(false)
  expect(target.classList.contains('caller-owned')).toBe(true)
  fireEvent.mouseEnter(local)
  expect(local.getAttribute('style')).toBe(localParameters)
  expect(local.classList.contains('opacity-[var(--opacity)]')).toBe(true)
  fireEvent.mouseLeave(source)
  expect(target.classList.contains('opacity-0')).toBe(true)
  expect(target.classList.contains('caller-owned')).toBe(true)
  expect(renders).toBe(1)
  expect(document.head.childElementCount).toBe(rules)
})
