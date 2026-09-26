import { describe, expect, it } from 'vitest'
import { parseEditRequest, parseQuery } from './requests.ts'

describe('tool protocol inputs', () => {
  it('rejects invalid query windows and missing scoped edit authority', () => {
    expect(() => parseQuery({ limit: 501 })).toThrow('limit')
    expect(() => parseQuery({ offset: -1 })).toThrow('offset')
    expect(() => parseQuery({ kind: '__proto__' })).toThrow('kind')
    expect(() =>
      parseEditRequest({ nodeId: 'node', value: 1, expectedVersion: 2 }),
    ).toThrow()
    expect(() =>
      parseEditRequest({
        nodeId: 'node',
        value: Infinity,
        expectedVersion: 2,
        scope: { uri: 'file:///file.ts', owner: 'sheet' },
      }),
    ).toThrow()
  })
  it('clones plain JSON values and bounds deeply nested input', () => {
    const value = { color: 'red' }
    const request = parseEditRequest({
      nodeId: 'node',
      value,
      expectedVersion: 2,
      scope: {
        uri: 'file:///file.ts',
        owner: 'sheet',
        path: ['Root', 'paint'],
      },
    })
    value.color = 'blue'
    expect(request.value).toEqual({ color: 'red' })
    let deep: unknown = 0
    for (let index = 0; index < 30; index++) deep = [deep]
    expect(() => parseEditRequest({ ...request, value: deep })).toThrow(
      'budget',
    )
    const cyclic: unknown[] = []
    cyclic.push(cyclic)
    expect(() => parseEditRequest({ ...request, value: cyclic })).toThrow(
      'budget',
    )
  })
})
