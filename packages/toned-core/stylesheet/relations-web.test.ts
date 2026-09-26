// @vitest-environment happy-dom
import { expect, test } from 'vitest'
import { subscribeWebRelations } from './relations-web.ts'

const mutations = () => new Promise((resolve) => setTimeout(resolve, 0))

test('relation observers ignore inline style writes and retain relevant alias attribute notifications', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  let updates = 0
  const stop = subscribeWebRelations(document, () => {
    updates++
  }, ['data-selected'])
  host.style.opacity = '0.5'
  host.setAttribute('data-irrelevant', 'value')
  await mutations()
  expect(updates).toBe(0)
  host.setAttribute('data-selected', 'true')
  await mutations()
  expect(updates).toBe(1)
  host.setAttribute('disabled', '')
  await mutations()
  expect(updates).toBe(2)
  stop()
  host.remove()
})

test('shared document observer unions and releases alias attribute interests', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  let first = 0,
    second = 0
  const stopFirst = subscribeWebRelations(document, () => {
    first++
  }, ['data-first'])
  const stopSecond = subscribeWebRelations(document, () => {
    second++
  }, ['data-second'])
  host.setAttribute('data-first', 'yes')
  await mutations()
  expect([first, second]).toEqual([1, 1])
  stopFirst()
  host.setAttribute('data-first', 'no')
  await mutations()
  expect([first, second]).toEqual([1, 1])
  host.setAttribute('data-second', 'yes')
  await mutations()
  expect([first, second]).toEqual([1, 2])
  stopSecond()
  host.remove()
})

test('programmatic focus and blur notify without input/change events and listeners stop on release', () => {
  const host = document.createElement('input')
  document.body.append(host)
  const focused: boolean[] = []
  const stop = subscribeWebRelations(document, () => {
    focused.push(document.activeElement === host)
  })
  host.focus()
  expect(focused).toEqual([true])
  host.blur()
  expect(focused).toEqual([true, false])
  stop()
  host.focus()
  host.blur()
  expect(focused).toEqual([true, false])
  host.remove()
})

test('scoped relations route mutations and events to live hosts, including newly attached and removed descendants', async () => {
  const first = document.createElement('section'),
    second = document.createElement('section')
  const a = document.createElement('input'),
    b = document.createElement('input')
  first.append(a)
  second.append(b)
  document.body.append(first, second)
  const hosts = new Set<Node>([a])
  let updates = 0
  const stop = subscribeWebRelations(
    document,
    () => updates++,
    ['data-selected'],
    () => [...hosts],
  )
  b.setAttribute('disabled', '')
  b.dispatchEvent(new Event('input', { bubbles: true }))
  await mutations()
  expect(updates).toBe(0)
  a.setAttribute('disabled', '')
  await mutations()
  expect(updates).toBe(1)
  hosts.add(b)
  b.setAttribute('data-selected', 'true')
  await mutations()
  expect(updates).toBe(2)
  second.remove()
  await mutations()
  expect(updates).toBe(3)
  stop()
  first.remove()
})

test('radio group changes notify checked-state consumers in another family', async () => {
  const left = document.createElement('section'),
    right = document.createElement('section')
  const first = document.createElement('input'),
    second = document.createElement('input')
  first.type = second.type = 'radio'
  first.name = second.name = 'toned-related-radio'
  first.checked = true
  left.append(first)
  right.append(second)
  document.body.append(left, right)
  const states: boolean[] = []
  const stop = subscribeWebRelations(
    document,
    () => states.push(first.checked),
    [],
    () => [first],
  )
  second.checked = true
  second.dispatchEvent(new Event('change', { bubbles: true }))
  expect(states).toEqual([false])
  second.setAttribute('checked', '')
  await mutations()
  expect(states.length).toBeGreaterThan(1)
  stop()
  left.remove()
  right.remove()
})

test('select option changes notify another registered option whose checked state changed', async () => {
  const select = document.createElement('select'),
    first = document.createElement('option'),
    second = document.createElement('option')
  select.append(first, second)
  document.body.append(select)
  first.selected = true
  const states: boolean[] = []
  const stop = subscribeWebRelations(
    document,
    () => states.push(first.selected),
    [],
    () => [first],
  )
  second.setAttribute('selected', '')
  await mutations()
  expect(states).toEqual([false])
  stop()
  select.remove()
})
