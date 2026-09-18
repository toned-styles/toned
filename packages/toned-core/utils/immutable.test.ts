import { expect, test } from 'vitest'
import { defineSystem } from '../system/definers.ts'
import { immutableSnapshot } from './immutable.ts'

test('reuses only its own recursively frozen snapshot, including nested arrays', () => {
  const source = { nested: [{ value: 1 }] }
  const first = immutableSnapshot(source)
  source.nested[0]!.value = 2
  const second = immutableSnapshot(source)
  expect(first.nested[0]!.value).toBe(1)
  expect(second.nested[0]!.value).toBe(2)
  expect(second).not.toBe(first)
  expect(immutableSnapshot(first)).toBe(first)
  expect(immutableSnapshot(first.nested)).toBe(first.nested)
  expect(immutableSnapshot(first.nested[0])).toBe(first.nested[0])
  expect(Object.isFrozen(first.nested[0])).toBe(true)
})

test('shallow-frozen caller objects never hide edits in their mutable children', () => {
  const source = Object.freeze({ nested: { value: 1 } })
  const first = immutableSnapshot(source)
  source.nested.value = 2
  const second = immutableSnapshot(source)
  expect(first.nested.value).toBe(1)
  expect(second.nested.value).toBe(2)
  expect(first).not.toBe(source)
  expect(second).not.toBe(first)
})

test('opaque mutable values retain identity without certifying their containing snapshot', () => {
  class Host {
    value = 1
  }
  const host = new Host()
  const date = new Date(0)
  const map = new Map([['value', 1]])
  const set = new Set([1])
  const callback = () => host.value
  const first = immutableSnapshot({ host, date, map, set, callback })
  const second = immutableSnapshot(first)
  expect(second).not.toBe(first)
  expect(second.host).toBe(host)
  expect(second.date).toBe(date)
  expect(second.map).toBe(map)
  expect(second.set).toBe(set)
  expect(second.callback).toBe(callback)
  expect(Object.isFrozen(host)).toBe(false)
  host.value = 2
  expect(second.callback()).toBe(2)
})

test('mutable direct exec and shallow-frozen style inputs observe every call', () => {
  const system = defineSystem({})
  const style = { marginLeft: 1 }
  const input = Object.freeze({ style })
  const config = {
    tokens: {},
    useClassName: false,
    platform: 'native' as const,
  }
  const first = system.exec(config, input)
  style.marginLeft = 2
  const second = system.exec(config, input)
  expect(first.style).toEqual({ marginLeft: 1 })
  expect(second.style).toEqual({ marginLeft: 2 })
})

test('array subclasses remain opaque to snapshot reuse even with primitive members', () => {
  class Values extends Array<number> {
    state = { count: 1 }
  }
  const first = immutableSnapshot(new Values(1, 2))
  const second = immutableSnapshot(first)
  expect(first).toBeInstanceOf(Values)
  expect(second).not.toBe(first)
  expect(Object.isFrozen(first.state)).toBe(false)
})
