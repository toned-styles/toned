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
