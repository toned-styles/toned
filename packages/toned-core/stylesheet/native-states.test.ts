import { expect, test } from 'vitest'
import { nativeBackend } from '../backends/native.ts'
import { getConfig } from '../system/config.ts'
import { defineSystem } from '../system/definers.ts'
import { type NativeHostAdapter, registerNativeHost } from './native-host.ts'
import { Base } from './StyleSheet.ts'

function fixture() {
  const states = new Map<object, boolean>()
  const live = new Map<object, Record<string, unknown>>()
  const listeners = new Set<() => void>()
  let reads = 0
  const adapter: NativeHostAdapter = {
    id: 'semantic-state-fixture',
    renderer: 'custom',
    version: '1',
    accepts: () => true,
    states: ['selected', 'focus-visible'],
    readState: (host) => {
      reads++
      return states.get(host) ?? false
    },
    subscribeState: (notify) => {
      listeners.add(notify)
      return () => {
        listeners.delete(notify)
      }
    },
    patch: (host, props) => Object.assign(live.get(host)!, props['style']),
    resetStyle: () => null,
    resetProp: () => null,
  }
  const system = defineSystem({
    id: 'native-semantic-states',
    tokens: {},
    conditions: { states: { selected: '[aria-selected="true"]' } },
  })
  const rules = {
    Root: {
      style: { opacity: 1 },
      ':focus-visible': { style: { opacity: 0.5 } },
    },
    Label: { style: { opacity: 1 } },
    'Root:selected': { Label: { style: { opacity: 0.25 } } },
  }
  const config = {
    ...getConfig(),
    platform: 'native' as const,
    nativeHost: adapter,
    backend: nativeBackend,
    mediaMode: 'runtime' as const,
    pseudoMode: 'runtime' as const,
    useClassName: false,
  }
  const create = () => new Base({ ref: system, config, rules })
  const attach = (base: Base, part: string, host = {}) => {
    const style = base.getRestingStyle(part).style
    live.set(host, { ...style })
    const unregister = registerNativeHost(host, adapter)
    const detach = base.attach(part, host, { style })
    return {
      host,
      detach: () => {
        detach()
        queueMicrotask(unregister)
      },
      style: () => live.get(host)!,
    }
  }
  return {
    create,
    attach,
    states,
    live,
    listeners,
    reads: () => reads,
    adapter,
    notify: () => {
      for (const listener of listeners) listener()
    },
  }
}

test('native local and source-part semantic facts read only committed hosts and bypass rendering', async () => {
  const f = fixture(),
    base = f.create()
  expect(f.reads()).toBe(0)
  expect(f.listeners.size).toBe(0)
  const root = f.attach(base, 'Root'),
    label = f.attach(base, 'Label')
  const stop = base.mount()
  expect(f.listeners.size).toBe(1)
  f.states.set(root.host, true)
  f.notify()
  expect(root.style()['opacity']).toBe(0.5)
  expect(label.style()['opacity']).toBe(0.25)
  f.states.set(root.host, false)
  f.notify()
  expect(root.style()['opacity']).toBe(1)
  expect(label.style()['opacity']).toBe(1)
  const before = f.reads()
  const abandoned = f.create()
  abandoned.prepare(base)
  expect(f.reads()).toBe(before)
  expect(f.listeners.size).toBe(1)
  abandoned.dispose()
  expect(f.listeners.size).toBe(1)
  root.detach()
  label.detach()
  stop()
  await Promise.resolve()
  expect(f.listeners.size).toBe(0)
  expect(Object.values(base._activeEls).every((set) => set.size === 0)).toBe(
    true,
  )
})

test('native semantic state remains per host when two sibling states exchange without an aggregate change', async () => {
  const f = fixture(),
    base = f.create()
  const first = f.attach(base, 'Root'),
    second = f.attach(base, 'Root')
  const stop = base.mount()
  f.states.set(first.host, true)
  f.notify()
  expect(first.style()['opacity']).toBe(0.5)
  expect(second.style()['opacity']).toBe(1)
  f.states.set(first.host, false)
  f.states.set(second.host, true)
  f.notify()
  expect(first.style()['opacity']).toBe(1)
  expect(second.style()['opacity']).toBe(0.5)
  second.detach()
  await Promise.resolve()
  expect(base.modsState['Root:focus-visible']).toBe(false)
  first.detach()
  stop()
  await Promise.resolve()
})

test('native semantic capability requires a reader and notification, but no parent traversal', () => {
  const f = fixture()
  const base = f.create()
  expect(() => base.mount()).not.toThrow()
  base.dispose()
  for (const patch of [
    { readState: undefined },
    { subscribeState: undefined },
    { states: ['checked'] },
  ]) {
    const invalid = new Base({
      ref: base.ref,
      rules: base.rules,
      config: { ...base.config, nativeHost: { ...f.adapter, ...patch } },
    })
    expect(() => invalid.mount()).toThrow(/native (state|host)/)
    invalid.dispose()
  }
})

test('committed candidate handoff replaces subscriptions and restores latest semantic facts', async () => {
  const f = fixture(),
    previous = f.create()
  const target = f.attach(previous, 'Root'),
    stopPrevious = previous.mount()
  const candidate = f.create()
  candidate.prepare(previous)
  f.states.set(target.host, true)
  f.notify()
  expect(target.style()['opacity']).toBe(0.5)
  target.detach()
  const next = f.attach(candidate, 'Root', target.host)
  const stopNext = candidate.mount()
  stopPrevious()
  await Promise.resolve()
  expect(f.listeners.size).toBe(1)
  expect(next.style()['opacity']).toBe(0.5)
  f.states.set(next.host, false)
  f.notify()
  expect(next.style()['opacity']).toBe(1)
  next.detach()
  stopNext()
  await Promise.resolve()
  expect(f.listeners.size).toBe(0)
})

test('native rtl is owned by direction configuration, not semantic host state readers', async () => {
  let direction: 'ltr' | 'rtl' = 'rtl'
  const f = fixture(),
    original = f.create()
  let reads = 0
  for (const hasReader of [false, true]) {
    const adapter = {
      ...f.adapter,
      readState: hasReader
        ? () => {
            reads++
            return false
          }
        : undefined,
      subscribeState: hasReader ? f.adapter.subscribeState : undefined,
    }
    const base = new Base({
      ref: original.ref,
      config: {
        ...original.config,
        nativeHost: adapter,
        getDirection: () => direction,
      },
      rules: {
        Root: { style: { opacity: 1 }, ':rtl': { style: { opacity: 0.5 } } },
      },
    })
    direction = 'rtl'
    base.applyState(base.conditionState({}) ?? {})
    const root = f.attach(base, 'Root')
    const stop = base.mount()
    expect(root.style()['opacity']).toBe(0.5)
    direction = 'ltr'
    base.applyState(base.conditionState({}) ?? {})
    expect(root.style()['opacity']).toBe(1)
    root.detach()
    stop()
    await Promise.resolve()
  }
  expect(reads).toBe(0)
  expect(f.listeners.size).toBe(0)
})
