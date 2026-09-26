import { describe, expect, it } from 'vitest'
import { createQueries } from './queries.ts'
import { bindQueryPart, decodeQuery, type QueryKey } from './query-key.ts'
import { createVariantSelector } from '../stylesheet/variantSelector.ts'
const q = createQueries<{ breakpoints: { __breakpoints: { md: 768 } } }>()
describe('computed query protocol', () => {
  it('is deterministic across builders and retains selector strings', () => {
    const other = createQueries<{
      breakpoints: { __breakpoints: { md: 768 } }
    }>()
    const $ = createVariantSelector<{ size: 's' | 'm' }>()
    const key = q.all($.size('s'), q.not(q.media('md')))
    expect(key).toBe(other.all($.size('s'), other.not(other.media('md'))))
    expect(decodeQuery(key)).toEqual({
      op: 'all',
      operands: [
        { op: 'atom', key: '[size=s]' },
        { op: 'not', operand: { op: 'atom', key: '@md' } },
      ],
    })
    expect(
      { [key]: 1 }[other.all($.size('s'), other.not(other.media('md')))],
    ).toBe(1)
  })
  it('round trips delimiters in relation identifiers without a global registry', () => {
    const key = q.part('A:%|').has('B:%|', 'hover', { scope: 'child' })
    expect(decodeQuery(key)).toEqual({
      op: 'relation',
      relation: {
        sourcePart: 'A:%|',
        part: 'B:%|',
        state: 'hover',
        scope: 'child',
      },
    })
  })
  it('binds local states recursively and rejects unbound sheet-level states', () => {
    const query = decodeQuery(q.not(q.any(q.state('hover'), q.media('md'))))
    expect(bindQueryPart(query, 'Root')).toEqual({
      op: 'not',
      operand: {
        op: 'any',
        operands: [
          { op: 'atom', key: 'Root:hover' },
          { op: 'atom', key: '@md' },
        ],
      },
    })
    expect(() => bindQueryPart(query)).toThrow('sheet-level state')
  })
  it.each([
    '@query ',
    '@query a:@md',
    '@query not|',
    '@query all:1|',
    '@query any:-1|',
    '@query a:@md|a:@md|',
    '@query r:Root:Label:hover:sibling|',
  ])('rejects malformed encoded query %s', (key) => {
    expect(() => decodeQuery(key as QueryKey)).toThrow('Toned: malformed')
  })
  it('bounds encoded expressions', () => {
    expect(() =>
      q.all(...Array.from({ length: 512 }, () => q.media('md'))),
    ).toThrow('512 nodes')
    expect(() => q.part('x'.repeat(65536)).has('Root', 'hover')).toThrow(
      '64 KiB',
    )
  })
  it('represents empty all and any without reading beyond the stack', () => {
    expect(decodeQuery(q.all())).toEqual({ op: 'all', operands: [] })
    expect(decodeQuery(q.any())).toEqual({ op: 'any', operands: [] })
  })
})
