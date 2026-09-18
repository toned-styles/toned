// @vitest-environment happy-dom
// These are application-adapter contract fixtures, not Unistyles or Fabric tests.
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { defineSystem, defineToken } from '@toned/core'
import type { NativeHostAdapter } from '@toned/core/stylesheet'
import * as React from 'react'
import { afterEach, expect, test } from 'vitest'
import { ConfigProvider, createElements } from './index.ts'
import native from './react-native.ts'
import web from './react-web.ts'

afterEach(cleanup)

const handleBrand = Symbol('fixture-style-handle')
type ForeignStyle = { readonly [handleBrand]: true; readonly color: string }

function opaqueHandle(): ForeignStyle {
  return Object.freeze(
    Object.defineProperty({ [handleBrand]: true }, 'color', {
      enumerable: true,
      get() {
        throw new Error('A foreign style handle was inspected or spread')
      },
    }),
  ) as ForeignStyle
}

/** Models an engine's public opaque-handle -> class/ref bridge. Only the
 * fixture registry reads its own metadata; style fields cannot be inspected. */
function foreignWebEngine() {
  const definitions = new WeakMap<
    ForeignStyle,
    { className: string; nodes: Set<HTMLElement> }
  >()
  let attached = 0
  let detached = 0
  return {
    define(className: string) {
      const handle = opaqueHandle()
      definitions.set(handle, { className, nodes: new Set() })
      return handle
    },
    getWebProps(handle: ForeignStyle) {
      const definition = definitions.get(handle)
      if (!definition) throw new Error('Unknown fixture style handle')
      let current: HTMLElement | null = null
      return {
        className: definition.className,
        ref(node: HTMLElement | null) {
          if (current) {
            definition.nodes.delete(current)
            current.classList.remove(definition.className)
            detached++
          }
          current = node
          if (node) {
            definition.nodes.add(node)
            node.classList.add(definition.className)
            attached++
          }
        },
      }
    },
    update(handle: ForeignStyle, className: string) {
      const definition = definitions.get(handle)
      if (!definition) throw new Error('Unknown fixture style handle')
      for (const node of definition.nodes) {
        node.classList.remove(definition.className)
        node.classList.add(className)
      }
      definition.className = className
    },
    counts: () => ({ attached, detached }),
  }
}

/** Application-owned composition: the foreign API detaches via null, whereas
 * the forwarded Toned ref may return cleanup. Preserve both contracts. */
function composeFixtureRef<T>(
  foreign: (node: T | null) => void,
  forwarded: React.ForwardedRef<T>,
) {
  let release: (() => void) | undefined
  return (node: T | null) => {
    release?.()
    release = undefined
    if (!node) return
    foreign(node)
    // React 18 types declare void; React 19 refs can return cleanup at runtime.
    const forwardedCleanup: unknown =
      typeof forwarded === 'function' ? forwarded(node) : undefined
    if (forwarded && typeof forwarded !== 'function') forwarded.current = node
    let active = true
    release = () => {
      if (!active) return
      active = false
      if (typeof forwardedCleanup === 'function') forwardedCleanup()
      else if (typeof forwarded === 'function') forwarded(null)
      else if (forwarded) forwarded.current = null
      foreign(null)
    }
    return Number.parseInt(React.version, 10) >= 19 ? release : undefined
  }
}

for (const useClassName of [false, true])
  test(`opaque foreign props preserve separately owned DOM classes and both ref lifecycles (classes=${useClassName})`, async () => {
    const engine = foreignWebEngine()
    const foreignStyle = engine.define('foreign-blue')
    let renders = 0
    const seen: ForeignStyle[] = []
    const Primitive = React.forwardRef<
      HTMLDivElement,
      React.ComponentProps<'div'> & { foreignStyle: ForeignStyle }
    >(function Primitive({ foreignStyle, className, ...props }, forwarded) {
      renders++
      seen.push(foreignStyle)
      const foreign = engine.getWebProps(foreignStyle)
      return (
        <div
          {...props}
          className={[className, foreign.className].filter(Boolean).join(' ')}
          ref={composeFixtureRef(foreign.ref, forwarded)}
        />
      )
    })
    const system = defineSystem({
      opacity: defineToken({
        values: [0.5, 1] as const,
        resolve: (opacity: number) => ({ opacity }),
      }),
      space: defineToken({
        values: [true] as const,
        resolve: (_value: boolean, theme: Record<string, number>) => ({
          padding: theme['space'] ?? 0,
        }),
      }),
    })
    const S = createElements(
      system.stylesheet({
        Root: { opacity: 1, space: true, ':hover': { opacity: 0.5 } },
      }),
    )
    let firstAlive = 0,
      secondAlive = 0
    const firstRef = () => {
      firstAlive++
      return () => {
        firstAlive--
      }
    }
    const secondRef = () => {
      secondAlive++
      return () => {
        secondAlive--
      }
    }
    const ui = (space: number, ref = firstRef) => (
      <ConfigProvider
        config={{
          ...web,
          useClassName,
          mediaMode: false,
          pseudoMode: 'runtime',
          getTokens: () => ({ space }),
        }}
      >
        <S>
          <S.Root
            as={Primitive}
            foreignStyle={foreignStyle}
            ref={ref}
            data-testid="foreign-target"
          />
        </S>
      </ConfigProvider>
    )
    const view = render(ui(8))
    const target = view.getByTestId('foreign-target')
    expect(seen.every((value) => value === foreignStyle)).toBe(true)
    expect(firstAlive).toBe(1)
    const initialRenders = renders
    engine.update(foreignStyle, 'foreign-violet')
    fireEvent.mouseEnter(target)
    expect(renders).toBe(initialRenders)
    expect(target.classList.contains('foreign-violet')).toBe(true)
    expect(target.classList.contains('foreign-blue')).toBe(false)
    if (useClassName)
      expect(target.classList.contains('opacity_0.5')).toBe(true)
    else expect(target.style.opacity).toBe('0.5')
    fireEvent.mouseLeave(target)
    expect(target.classList.contains('foreign-violet')).toBe(true)
    view.rerender(ui(16, secondRef))
    expect(view.getByTestId('foreign-target')).toBe(target)
    expect(target.classList.contains('foreign-violet')).toBe(true)
    expect(firstAlive).toBe(0)
    expect(secondAlive).toBe(1)
    expect(seen.every((value) => value === foreignStyle)).toBe(true)
    if (!useClassName) expect(target.style.padding).toBe('16px')
    await act(() => view.unmount())
    expect(secondAlive).toBe(0)
    expect(engine.counts().attached).toBe(engine.counts().detached)
    expect(target.classList.contains('foreign-violet')).toBe(false)
  })

test('a native fixture wrapper preserves an ordered opaque style layer and disjoint imperative fields', async () => {
  const foreignStyle = opaqueHandle()
  const host = { style: { color: 'red' } as Record<string, unknown> }
  const layers: unknown[][] = []
  let press: (() => void) | undefined
  let releasePress: (() => void) | undefined
  let renders = 0
  const adapter: NativeHostAdapter = {
    id: 'foreign-style-routing-fixture',
    renderer: 'custom',
    version: '1',
    accepts: (target) => target === host,
    patch: (_target, props) => {
      Object.assign(host.style, props['style'])
    },
    resetStyle: () => null,
    resetProp: () => null,
  }
  // The selected engine consumes this final array. This fixture records its
  // ordering without flattening the opaque layer or pretending to run Fabric.
  const FixtureTarget = React.forwardRef<
    object,
    { style: unknown[]; onPressIn?: () => void; onPressOut?: () => void }
  >(function FixtureTarget(props, ref) {
    layers.push(props.style)
    press = props.onPressIn
    releasePress = props.onPressOut
    React.useLayoutEffect(() => {
      Object.assign(host.style, props.style[0])
    }, [props.style])
    React.useImperativeHandle(ref, () => host, [])
    return null
  })
  const Primitive = React.forwardRef<
    object,
    {
      foreignStyle: ForeignStyle
      style?: object
      onPressIn?: () => void
      onPressOut?: () => void
    }
  >(function Primitive({ foreignStyle, style, ...props }, ref) {
    renders++
    return <FixtureTarget {...props} ref={ref} style={[style, foreignStyle]} />
  })
  const system = defineSystem({ id: 'foreign-native-fixture', tokens: {} })
  const S = createElements(
    system.stylesheet({
      Root: { $style: { opacity: 1 }, ':active': { $style: { opacity: 0.5 } } },
    }),
  )
  const view = render(
    <ConfigProvider
      config={{
        ...native,
        nativeHost: adapter,
        getTokens: () => ({}),
        resolveElement: () => Primitive,
        mediaMode: false,
        pseudoMode: 'runtime',
      }}
    >
      <S>
        <S.Root as={Primitive} foreignStyle={foreignStyle} />
      </S>
    </ConfigProvider>,
  )
  expect(layers[0]?.[0]).toEqual({ opacity: 1 })
  expect(layers[0]?.[1]).toBe(foreignStyle)
  host.style['color'] = 'blue' // The independent fixture engine changes its field.
  const initialRenders = renders
  act(() => press?.())
  expect(host.style['opacity']).toBe(0.5)
  expect(host.style['color']).toBe('blue')
  act(() => releasePress?.())
  expect(host.style['opacity']).toBe(1)
  expect(host.style['color']).toBe('blue')
  expect(renders).toBe(initialRenders)
  await act(() => view.unmount())
})
