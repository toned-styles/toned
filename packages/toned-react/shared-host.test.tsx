// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react'
import { defineSystem, defineToken, getConfig, setConfig } from '@toned/core'
import { afterEach, expect, test } from 'vitest'

import { useStyles } from './index.ts'
import web from './react-web.ts'

const original = getConfig()
afterEach(() => {
  cleanup()
  setConfig(original)
})

const sheet = defineSystem({
  width: defineToken({
    values: [16] as const,
    resolve: (value: number) => ({ width: value }),
  }),
  opacity: defineToken({
    values: [0.5] as const,
    resolve: (value: number) => ({ opacity: value }),
  }),
}).stylesheet({
  Root: { width: 16, style: { color: 'red' } },
  Disabled: { opacity: 0.5, style: { cursor: 'not-allowed' } },
})

function Button({ disabled }: { disabled: boolean }) {
  const s = useStyles(sheet)
  return (
    <button
      type="button"
      data-testid="target"
      {...s.Root.with(disabled && s.Disabled)}
    />
  )
}

for (const useClassName of [false, true])
  test(`two parts merged onto one element both keep their styles after mount (classes=${useClassName})`, async () => {
    setConfig({
      ...web,
      getTokens: () => ({}),
      useClassName,
      mediaMode: false,
      pseudoMode: 'runtime',
    })
    const view = render(<Button disabled />)
    const target = view.getByTestId('target')
    const read = () => ({
      className: target.className,
      width: target.style.width,
      color: target.style.color,
      opacity: target.style.opacity,
      cursor: target.style.cursor,
    })
    const mounted = read()
    // Both parts contribute: Root's width and colour, Disabled's opacity and cursor.
    expect(mounted.color).toBe('red')
    expect(mounted.cursor).toBe('not-allowed')
    if (useClassName) {
      expect(mounted.className).toContain('width_16')
      expect(mounted.className).toContain('opacity_0.5')
    } else {
      expect(mounted.width).toBe('16px')
      expect(mounted.opacity).toBe('0.5')
    }
    // Still true after an update, and Root alone remains once Disabled goes.
    view.rerender(<Button disabled />)
    expect(read()).toEqual(mounted)
    view.rerender(<Button disabled={false} />)
    // A released part is finalised in a microtask, after React has re-attached refs.
    await act(async () => {})
    expect(read().color).toBe('red')
    expect(read().cursor).toBe('')
  })

test('with() refuses a stylesheet key instead of passing it to the host', () => {
  function Probe() {
    const s = useStyles(sheet)
    return (
      <div
        {...s.Root.with({ $style: { transform: 'none' } } as unknown as {
          style: object
        })}
      />
    )
  }
  setConfig(web)
  expect(() => render(<Probe />)).toThrow(/"\$style" is a stylesheet key/)
})
