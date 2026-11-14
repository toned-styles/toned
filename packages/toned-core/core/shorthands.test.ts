import { describe, expect, test } from 'vitest'

import { expandShorthand, SHORTHANDS, shorthandsOf } from './shorthands.ts'

describe('shorthand expansion', () => {
  test.each([
    [
      'transition',
      'opacity 200ms ease',
      {
        transitionProperty: 'opacity',
        transitionDuration: '200ms',
        transitionTimingFunction: 'ease',
        transitionDelay: '0s',
        transitionBehavior: 'normal',
      },
    ],
    [
      'transition',
      'opacity 200ms, transform 1s cubic-bezier(0.2, 0, 0, 1) 50ms',
      {
        transitionProperty: 'opacity, transform',
        transitionDuration: '200ms, 1s',
        transitionTimingFunction: 'ease, cubic-bezier(0.2, 0, 0, 1)',
        transitionDelay: '0s, 50ms',
        transitionBehavior: 'normal, normal',
      },
    ],
    [
      'transition',
      'none',
      {
        transitionProperty: 'none',
        transitionDuration: '0s',
        transitionTimingFunction: 'ease',
        transitionDelay: '0s',
        transitionBehavior: 'normal',
      },
    ],
    ['overflow', 'hidden auto', { overflowX: 'hidden', overflowY: 'auto' }],
    ['overflow', 'clip', { overflowX: 'clip', overflowY: 'clip' }],
    [
      'outline',
      '2px solid red',
      { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'red' },
    ],
    [
      'outline',
      'none',
      {
        outlineWidth: 'medium',
        outlineStyle: 'none',
        outlineColor: 'currentcolor',
      },
    ],
    [
      'borderTop',
      '1px dashed #000',
      {
        borderTopWidth: '1px',
        borderTopStyle: 'dashed',
        borderTopColor: '#000',
      },
    ],
    [
      'borderStyle',
      'solid none',
      {
        borderTopStyle: 'solid',
        borderRightStyle: 'none',
        borderBottomStyle: 'solid',
        borderLeftStyle: 'none',
      },
    ],
    [
      'borderRadius',
      '4px 8px / 2px',
      {
        borderTopLeftRadius: '4px 2px',
        borderTopRightRadius: '8px 2px',
        borderBottomRightRadius: '4px 2px',
        borderBottomLeftRadius: '8px 2px',
      },
    ],
    ['gap', 8, { rowGap: 8, columnGap: 8 }],
    [
      'padding',
      '1px 2px 3px',
      {
        paddingTop: '1px',
        paddingRight: '2px',
        paddingBottom: '3px',
        paddingLeft: '2px',
      },
    ],
    ['flex', '1', { flexGrow: '1', flexShrink: '1', flexBasis: '0%' }],
    ['flex', 'none', { flexGrow: '0', flexShrink: '0', flexBasis: 'auto' }],
    [
      'background',
      '#fff',
      {
        backgroundColor: '#fff',
        backgroundImage: 'none',
        backgroundPositionX: '0%',
        backgroundPositionY: '0%',
        backgroundSize: 'auto',
        backgroundRepeat: 'repeat',
        backgroundAttachment: 'scroll',
        backgroundOrigin: 'padding-box',
        backgroundClip: 'border-box',
      },
    ],
  ])('%s: %s', (field, value, expected) => {
    expect(expandShorthand(field, value)).toEqual(expected)
    // Every longhand produced is one the family table declares.
    for (const longhand of Object.keys(expected))
      expect(shorthandsOf(longhand)).toContain(field)
  })

  test.each([
    ['transition', 'var(--motion)'],
    ['animation', 'fade 200ms ease'],
    ['background', 'url(a.png) no-repeat'],
    ['background', 'var(--surface)'],
    ['outline', '2px solid var(--ring)'],
    ['overflow', 'hidden auto scroll'],
  ])('%s: %s cannot be expanded statically', (field, value) => {
    expect(expandShorthand(field, value)).toBeUndefined()
  })

  test('the family table lists only longhands, nested shorthands resolved', () => {
    expect(shorthandsOf('borderTopColor')).toEqual(
      expect.arrayContaining(['border', 'borderTop', 'borderColor']),
    )
    expect(SHORTHANDS['transition']).toContain('transitionProperty')
  })
})
