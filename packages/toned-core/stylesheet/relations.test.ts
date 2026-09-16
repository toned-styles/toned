import { expect, test } from 'vitest'
import { PartRelations } from './relations.ts'

const relation = {
  sourcePart: 'Root',
  part: 'Item',
  state: 'checked',
  scope: 'descendant',
} as const

test('child and descendant relations use registered parent links and update on moves', () => {
  const graph = new PartRelations()
  const root = {},
    middle = {},
    item = {},
    other = {}
  graph.register(root, 'Root')
  graph.register(middle, 'Middle', root)
  graph.register(item, 'Item', middle)
  graph.register(other, 'Other')
  const facts: boolean[] = []
  graph.subscribe(relation, (value) => facts.push(value))
  graph.setState(item, 'checked', true)
  graph.setState(item, 'checked', true)
  expect(graph.matches({ ...relation, scope: 'child' })).toBe(false)
  graph.move(item, root)
  expect(graph.matches({ ...relation, scope: 'child' })).toBe(true)
  graph.move(item, other)
  expect(facts).toEqual([false, true, false])
})

test('instances, disconnected branches and portals never acquire implicit relationships', () => {
  const a = new PartRelations(),
    b = new PartRelations()
  const root = {},
    item = {}
  const detach = a.register(root, 'Root')
  a.register(item, 'Item', root)
  b.register(item, 'Item', root)
  a.setState(item, 'checked', true)
  b.setState(item, 'checked', true)
  expect(a.matches(relation)).toBe(true)
  expect(b.matches(relation)).toBe(false)
  detach()
  expect(a.matches(relation)).toBe(false)
  a.register(root, 'Root')
  expect(a.matches(relation)).toBe(true)
  a.move(item) // a portal with no explicitly supplied logical parent
  expect(a.matches(relation)).toBe(false)
})

test('cleanup removes facts and subscriptions, and cycles are rejected before mutation', () => {
  const graph = new PartRelations()
  const root = {},
    item = {}
  graph.register(root, 'Root')
  const detach = graph.register(item, 'Item', root)
  expect(() => graph.move(root, item)).toThrow(/cyclic/)
  const facts: boolean[] = []
  const stop = graph.subscribe(relation, (value) => facts.push(value))
  graph.setState(item, 'checked', true)
  detach()
  detach()
  stop()
  graph.register(item, 'Item', root)
  graph.setState(item, 'checked', true)
  expect(facts).toEqual([false, true, false])
  graph.clear()
  expect(graph.matches(relation)).toBe(false)
})
