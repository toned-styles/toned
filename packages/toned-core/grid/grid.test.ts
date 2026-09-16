import { describe, expect, it } from 'vitest'
import { createGridScope, defineGrid, dp, fr, resolveGrid } from './index.ts'

describe('typed grid declarations', () => {
  const grid = () =>
    defineGrid('message', {
      columns: [dp(48), fr(1)],
      areas: [
        ['avatar', 'title'],
        ['.', 'body'],
      ],
    })
  it('compiles local named areas without measuring children', () => {
    const message = grid()
    expect(resolveGrid(message, 'web')).toEqual({
      display: 'grid',
      gridTemplateColumns: '48px 1fr',
      gridTemplateRows: 'auto auto',
      gap: 0,
      gridTemplateAreas:
        '"a61_76_61_74_61_72 a74_69_74_6c_65" ". a62_6f_64_79"',
    })
    expect(resolveGrid(message.area('body'), 'web')).toEqual({
      gridArea: 'a62_6f_64_79',
    })
    expect(Object.isFrozen(message.areas[0])).toBe(true)
  })
  it('rejects invalid rectangles, track counts, and native capability use', () => {
    expect(() =>
      defineGrid('bad', {
        columns: [fr(1), fr(1)],
        areas: [
          ['x', '.'],
          ['x', 'x'],
        ],
      }),
    ).toThrow('rectangle')
    expect(() =>
      defineGrid('bad', { columns: [fr(1)], areas: [['x', 'y']] }),
    ).toThrow('cells')
    expect(() =>
      defineGrid('bad', {
        columns: [fr(1)],
        rows: ['auto', 'auto'],
        areas: [['x']],
      }),
    ).toThrow('track count')
    expect(() => dp(-1)).toThrow('invalid')
    expect(() => resolveGrid(grid(), 'native')).toThrow('@platform web')
  })
  it('isolates repeated instances and verifies definition identity and host parentage', () => {
    const definition = grid()
    const first = createGridScope(definition)
    const second = createGridScope(definition)
    const target = {}
    const detach = first.attach(target, definition.area('title'))
    expect(first.size).toBe(1)
    expect(second.size).toBe(0)
    expect(() => second.attach({}, grid().area('title'))).toThrow(
      'another grid',
    )
    expect(() => second.attach({}, definition.area('title'), false)).toThrow(
      'direct layout child',
    )
    detach()
    detach()
    expect(first.size).toBe(0)
  })
  it('checks names even for untyped callers', () => {
    // @ts-expect-error matrix inference excludes misspelled areas
    expect(() => grid().area('titel')).toThrow('unknown area')
    // @ts-expect-error empty cells are not named areas
    expect(() => grid().area('.')).toThrow('unknown area')
  })
})
