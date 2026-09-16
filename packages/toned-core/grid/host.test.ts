import { expect, test } from 'vitest'
import {
  attachGridElement,
  type GridHostElement,
  validateGridElement,
} from './host.ts'
import { defineGrid, fr } from './index.ts'

function tree() {
  const parent: GridHostElement = { parentElement: null, children: [] }
  const child: GridHostElement = { parentElement: parent, children: [] }
  parent.children = [child]
  return { parent, child }
}
const definition = () =>
  defineGrid('card', { columns: [fr(1)], areas: [['body']] })

test('child-before-parent ref replacement defers identity checking until commit', () => {
  const first = definition(),
    second = definition()
  const { parent, child } = tree()
  const detachFirstParent = attachGridElement(parent, { grid: first })
  const detachFirstChild = attachGridElement(child, {
    area: first.area('body'),
  })
  const detachSecondChild = attachGridElement(child, {
    area: second.area('body'),
  })
  const detachSecondParent = attachGridElement(parent, { grid: second })
  detachFirstParent()
  detachFirstChild()
  expect(() => validateGridElement(child)).not.toThrow()
  detachSecondChild()
  detachSecondParent()
})
test('committed mismatched identity and wrapper placement still fail', () => {
  const { parent, child } = tree()
  const detachParent = attachGridElement(parent, { grid: definition() })
  const detachChild = attachGridElement(child, {
    area: definition().area('body'),
  })
  expect(() => validateGridElement(child)).toThrow('another grid definition')
  detachParent()
  expect(() => validateGridElement(child)).toThrow('direct parent')
  detachChild()
  detachChild()
})

test('a responsive layout preserves registration with original family areas', () => {
  const first = definition()
  const alternate = first.variant({ columns: [fr(2)], areas: [['body']] })
  const { parent, child } = tree()
  const detachChild = attachGridElement(child, { area: first.area('body') })
  const detachParent = attachGridElement(parent, { grid: alternate })
  expect(() => validateGridElement(child)).not.toThrow()
  detachParent()
  const reattachParent = attachGridElement(parent, { grid: first })
  expect(() => validateGridElement(child)).not.toThrow()
  detachChild()
  reattachParent()
})
