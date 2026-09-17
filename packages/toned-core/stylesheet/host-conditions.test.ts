// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'
import { getConfig } from '../system/config.ts'
import { defineSystem } from '../system/definers.ts'
import { Base } from './StyleSheet.ts'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})
const system = defineSystem({
  id: 'host-condition-fixture',
  tokens: {},
  conditions: { containers: { card: { wide: 320 } }, media: { wide: 800 } },
})
const rules = {
  Label: {
    style: { width: 100, opacity: 1 },
    '@card/wide': { style: { width: 400 } },
    ':hover': { style: { opacity: 0.5 } },
    '@card/wide&wide': { style: { height: 200 } },
  },
  '[compact=true]': { Label: { style: { padding: 4 } } },
}
function controller(ref = system) {
  return new Base({
    ref,
    rules,
    config: {
      ...getConfig(),
      platform: 'web',
      useClassName: false,
      mediaMode: 'runtime',
      pseudoMode: 'runtime',
      getTokens: () => ({}),
    },
  })
}

test('host-local render reads do not replace remembered controller conditions', () => {
  const instance = controller()
  Object.assign(instance.modsState, instance.conditionState({ card: 100 }))
  instance.matchStyles()
  expect(instance.getCurrentStyle('Label', { card: 400 }).style.width).toBe(400)
  expect(instance.getRestingStyle('Label', { card: 400 }).style.width).toBe(400)
  instance.applyState({})
  expect(instance.getCurrentStyle('Label').style.width).toBe(100)
  expect(instance.modsState['@card/wide']).toBe(false)
})

test('host-local conditions survive state, variant and composite media updates', () => {
  const instance = controller()
  const first = document.createElement('div')
  const second = document.createElement('div')
  document.body.append(first, second)
  const detachFirst = instance.attach(
    'Label',
    first,
    instance.getRestingStyle('Label'),
  )
  const detachSecond = instance.attach(
    'Label',
    second,
    instance.getRestingStyle('Label'),
  )
  let width = 400
  const stopFirst = instance.bindHostConditions('Label', first, () => ({
    card: width,
  }))
  const stopSecond = instance.bindHostConditions('Label', second, () => ({
    card: 100,
  }))
  instance.refreshHostConditions('Label', first)
  instance.refreshHostConditions('Label', second)
  expect(first.style.width).toBe('400px')
  expect(second.style.width).toBe('100px')
  instance.setElementActive('Label', ':hover', first, true)
  instance.applyState(
    { 'Label:hover': true },
    { triggerKey: 'Label', pseudo: ':hover' },
  )
  expect(first.style.opacity).toBe('0.5')
  expect(second.style.opacity).toBe('1')
  instance.applyState({ compact: true, '@wide': true })
  expect(first.style.width).toBe('400px')
  expect(first.style.height).toBe('200px')
  expect(second.style.height).toBe('')
  expect(first.style.padding).toBe('4px')
  expect(second.style.padding).toBe('4px')
  width = 100
  instance.refreshHostConditions('Label', first)
  expect(first.style.width).toBe('100px')
  expect(first.style.height).toBe('')
  expect(first.style.opacity).toBe('0.5')
  first.style.opacity = '1'
  instance.reapplyInteraction('Label', first)
  expect(first.style.opacity).toBe('0.5')
  stopFirst()
  stopSecond()
  detachFirst()
  detachSecond()
})

test('stale registration cleanup cannot remove a replacement host environment', () => {
  const instance = controller()
  const node = document.createElement('div')
  document.body.append(node)
  const detach = instance.attach(
    'Label',
    node,
    instance.getRestingStyle('Label'),
  )
  const old = instance.bindHostConditions('Label', node, () => ({ card: 100 }))
  const current = instance.bindHostConditions('Label', node, () => ({
    card: 400,
  }))
  old()
  instance.applyState({ compact: true })
  expect(node.style.width).toBe('400px')
  current()
  instance.applyState({ compact: false })
  expect(node.style.width).toBe('100px')
  detach()
})

test('a committed candidate inherits environments without publishing a suspended candidate', () => {
  const first = controller()
  const node = document.createElement('div')
  document.body.append(node)
  const detachFirst = first.attach(
    'Label',
    node,
    first.getRestingStyle('Label'),
  )
  const oldRegistration = first.bindHostConditions('Label', node, () => ({
    card: 400,
  }))
  const pending = controller()
  pending.prepare(first)
  pending.modsState['compact'] = true
  pending.matchStyles()
  pending.getCurrentStyle('Label', { card: 100 })
  first.refreshHostConditions('Label', node)
  expect(node.style.width).toBe('400px')
  expect(node.style.padding).toBe('')
  const committed = controller()
  committed.prepare(first)
  committed.modsState['compact'] = true
  committed.matchStyles()
  detachFirst()
  const detachCurrent = committed.attach(
    'Label',
    node,
    committed.getRestingStyle('Label', { card: 400 }),
  )
  const currentRegistration = committed.bindHostConditions(
    'Label',
    node,
    () => ({ card: 400 }),
  )
  oldRegistration()
  // An old subscription must follow the new attachment owner, not overwrite
  // it with the former controller's variants during the ref/layout handoff.
  first.refreshHostConditions('Label', node)
  expect(node.style.width).toBe('400px')
  expect(node.style.padding).toBe('4px')
  currentRegistration()
  detachCurrent()
})

test('browser media notifications recompute each host composite condition and remove listeners', () => {
  const queries = new Map<string, ReturnType<typeof query>>()
  function query(media: string) {
    const target = new EventTarget()
    return Object.assign(target, {
      media,
      matches: false,
      onchange: null,
      addListener: (
        listener: ((event: MediaQueryListEvent) => void) | null,
      ) => {
        if (listener)
          target.addEventListener('change', listener as EventListener)
      },
      removeListener: (
        listener: ((event: MediaQueryListEvent) => void) | null,
      ) => {
        if (listener)
          target.removeEventListener('change', listener as EventListener)
      },
    })
  }
  vi.spyOn(window, 'matchMedia').mockImplementation((media) => {
    const result = query(media)
    queries.set(media, result)
    return result
  })
  const local = defineSystem({
    id: 'host-condition-media',
    tokens: {},
    conditions: { containers: { card: { wide: 320 } }, media: { wide: 800 } },
  })
  const instance = controller(local)
  const node = document.createElement('div')
  document.body.append(node)
  const detach = instance.attach(
    'Label',
    node,
    instance.getRestingStyle('Label'),
  )
  const stopConditions = instance.bindHostConditions('Label', node, () => ({
    card: 400,
  }))
  const unmount = instance.mount()
  const media = queries.values().next().value
  expect(media).toBeDefined()
  if (!media) throw new Error('media subscription missing')
  const removed = vi.spyOn(media, 'removeEventListener')
  media.matches = true
  const event = Object.assign(new Event('change'), { matches: true })
  media.dispatchEvent(event)
  expect(node.style.height).toBe('200px')
  media.matches = false
  media.dispatchEvent(Object.assign(new Event('change'), { matches: false }))
  expect(node.style.height).toBe('')
  expect(node.style.width).toBe('400px')
  unmount()
  expect(removed).toHaveBeenCalledTimes(1)
  stopConditions()
  detach()
})

test('native host-local condition reads retain direction facts', () => {
  const instance = new Base({
    ref: system,
    rules: {
      Label: {
        style: { opacity: 1 },
        ':rtl': { style: { opacity: 0.5 } },
        '@card/wide': { style: { width: 400 } },
      },
    },
    config: {
      ...getConfig(),
      platform: 'native',
      getTokens: () => ({}),
      getDirection: () => 'rtl',
      useClassName: false,
      mediaMode: 'runtime',
      pseudoMode: 'runtime',
    },
  })
  const output = instance.getRestingStyle('Label', { card: 400 })
  expect(output.style.opacity).toBe(0.5)
  expect(output.style.width).toBe(400)
  expect(instance.modsState['Label:rtl']).toBeUndefined()
})
