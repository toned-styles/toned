// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { defineSystem, defineToken, getConfig, setConfig } from '@toned/core'
import * as React from 'react'
import { afterEach, expect, test } from 'vitest'
import { useBind, useStyles } from './index.ts'
import web from './react-web.ts'

const original = getConfig()
afterEach(() => {
  cleanup()
  setConfig(original)
})

const sheet = defineSystem({
  opacity: defineToken({
    values: [0.5, 1] as const,
    resolve: (value: number) => ({ opacity: value }),
  }),
}).stylesheet({
  Root: {
    opacity: 0.5,
    style: { color: 'red' },
    ':hover': { opacity: 1, style: { width: 24 } },
  },
})

const caller = { className: 'caller', style: { color: 'purple' } }
const plain = {
  className: 'caller',
  // opacity is identical to Toned's previous declaration. React may skip it.
  style: { color: 'purple', opacity: 0.5 },
}

for (const bound of [false, true]) {
  test(`${bound ? 'bound' : 'spread'} ref detachment preserves a reused plain host`, async () => {
    setConfig({
      ...web,
      getTokens: () => ({}),
      useClassName: false,
      mediaMode: false,
      pseudoMode: 'runtime',
    })
    // A foreign component can stop forwarding a bound bag without replacing
    // its host. The renderer must retain this exact node and diff its props.
    function Forwarder({
      styled,
      ...props
    }: React.ComponentProps<'div'> & { styled: boolean }) {
      return <div {...(styled ? props : plain)} data-testid="target" />
    }
    function View({ styled }: { styled: boolean }) {
      const styles = useStyles(sheet)
      const parts = useBind(sheet)
      return bound ? (
        <parts.Root as={Forwarder} styled={styled} {...caller} />
      ) : (
        <div
          {...(styled ? styles.Root.withProps(caller) : plain)}
          data-testid="target"
        />
      )
    }

    const view = render(<View styled />)
    const target = view.getByTestId('target')
    fireEvent.mouseEnter(target)
    expect(target.style.opacity).toBe('1')
    expect(target.style.width).toBe('24px')

    view.rerender(<View styled={false} />)
    await act(async () => {}) // Includes the deferred ref-release microtask.

    expect(view.getByTestId('target')).toBe(target)
    expect(target.isConnected).toBe(true)
    expect(target.className).toBe('caller')
    expect(target.style.color).toBe('purple')
    expect(target.style.opacity).toBe('0.5')
    // React never declared the interaction-only width, so its prop
    // diff cannot remove them. Ref cleanup must restore the old declaration.
    expect(target.style.width).toBe('')
  })
}
