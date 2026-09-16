import { expect, test } from 'vitest'
import { createQueries } from './queries.ts'

const q = createQueries<{ states: { checked: ':checked' } }, 'Root' | 'Item'>()
test('relational expressions retain semantic metadata through boolean algebra', () => {
  const relation = q.part('Root').has('Item', 'checked', { scope: 'child' })
  expect(relation).toEqual({
    op: 'relation',
    relation: {
      sourcePart: 'Root',
      part: 'Item',
      state: 'checked',
      scope: 'child',
    },
  })
  expect(q.not(relation)).toEqual({ op: 'not', operand: relation })
  expect(q.part('Root').has('Item', 'hover')).toEqual({
    op: 'relation',
    relation: {
      sourcePart: 'Root',
      part: 'Item',
      state: 'hover',
      scope: 'descendant',
    },
  })
})
function types() {
  // @ts-expect-error finite source parts
  q.part('Unknown').has('Item', 'checked')
  // @ts-expect-error finite target parts
  q.part('Root').has('Missing', 'checked')
  // @ts-expect-error finite semantic states
  q.part('Root').has('Item', 'cheked')
  // @ts-expect-error only declared relationship scopes
  q.part('Root').has('Item', 'checked', { scope: 'sibling' })
}
void types
