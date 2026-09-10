import { describe, expect, test } from 'vitest'
import { writeVarChain } from './varChain.ts'

describe('writeVarChain', () => {
  test('returns null and writes nothing when there are no links', () => {
    const style: Record<string, unknown> = {}

    // null, not the base: the caller keeps whatever it already had, which may
    // be a number that still needs unit-suffixing downstream.
    expect(writeVarChain(style, 'padding', 4, [])).toBeNull()
    expect(style).toEqual({})
  })

  test('writes a toggle-gated custom property and wraps the base', () => {
    const style: Record<string, unknown> = {}

    const chain = writeVarChain(style, 'padding', '4px', [
      { prefix: 'media-md', value: '16px' },
    ])

    expect(style['--media-md__padding']).toBe('var(--media-md) 16px')
    expect(chain).toBe('var(--media-md__padding, 4px)')
  })

  test('kebab-cases the CSS property in the custom property name', () => {
    const style: Record<string, unknown> = {}

    writeVarChain(style, 'backgroundColor', '#fff', [
      { prefix: 'toned_hover', value: '#f00' },
    ])

    expect(style['--toned_hover__background-color']).toBe(
      'var(--toned_hover) #f00',
    )
  })

  test('nests links so the last one is outermost, i.e. highest priority', () => {
    const style: Record<string, unknown> = {}

    const chain = writeVarChain(style, 'padding', '4px', [
      { prefix: 'media-sm', value: '8px' },
      { prefix: 'media-md', value: '16px' },
    ])

    expect(chain).toBe(
      'var(--media-md__padding, var(--media-sm__padding, 4px))',
    )
  })

  test('omits the fallback when there is no base value', () => {
    const style: Record<string, unknown> = {}

    expect(
      writeVarChain(style, 'padding', null, [
        { prefix: 'media-md', value: '16px' },
      ]),
    ).toBe('var(--media-md__padding)')

    expect(
      writeVarChain({}, 'padding', undefined, [
        { prefix: 'media-md', value: '16px' },
      ]),
    ).toBe('var(--media-md__padding)')

    // An empty base would substitute to nothing, so it is no base at all.
    expect(
      writeVarChain({}, 'padding', '', [{ prefix: 'media-md', value: '16px' }]),
    ).toBe('var(--media-md__padding)')
  })

  test('returns null when every link is skipped', () => {
    const style: Record<string, unknown> = {}

    const chain = writeVarChain(style, 'padding', '4px', [
      { prefix: 'media-sm', value: null },
      { prefix: 'media-md', value: undefined },
      { prefix: 'media-lg', value: '' },
    ])

    // Not 'var(...)' wrapping nothing, and not the base restated — the caller
    // must be able to tell that it should leave the property alone.
    expect(chain).toBeNull()
    expect(style).toEqual({})
  })

  test('emits falsy-but-real values such as 0', () => {
    const style: Record<string, unknown> = {}

    const chain = writeVarChain(style, 'opacity', '1', [
      { prefix: 'media-md', value: 0 },
    ])

    expect(style['--media-md__opacity']).toBe('var(--media-md) 0')
    expect(chain).toBe('var(--media-md__opacity, 1)')
  })

  test('appends a per-link suffix so raw style keeps its own namespace', () => {
    const style: Record<string, unknown> = {}

    writeVarChain(style, 'cursor', 'pointer', [
      { prefix: 'toned_hover', value: 'grab', suffix: '__style' },
    ])

    expect(style['--toned_hover__cursor__style']).toBe(
      'var(--toned_hover) grab',
    )
  })

  test('mixes suffixed and unsuffixed links in one chain', () => {
    const style: Record<string, unknown> = {}

    const chain = writeVarChain(style, 'color', '#fff', [
      { prefix: 'toned_hover', value: '#000' },
      { prefix: 'toned_hover', value: 'red', suffix: '__style' },
    ])

    expect(chain).toBe(
      'var(--toned_hover__color__style, var(--toned_hover__color, #fff))',
    )
  })
})

describe('writeVarChain unit handling', () => {
  // A style map is shared between web and React Native, so lengths are written
  // as bare numbers. Everything that turns one into CSS text has to add `px`,
  // and this is the last such point: the result is a string, so neither
  // `applyStyles` nor React's `style` prop will do it afterwards.

  test('adds px to a numeric link value', () => {
    const style: Record<string, unknown> = {}

    writeVarChain(style, 'padding', null, [{ prefix: 'media-md', value: 16 }])

    expect(style['--media-md__padding']).toBe('var(--media-md) 16px')
  })

  test('adds px to a numeric base, which becomes the fallback', () => {
    const style: Record<string, unknown> = {}

    const chain = writeVarChain(style, 'padding', 4, [
      { prefix: 'media-md', value: 16 },
    ])

    // 'var(--media-md__padding, 4)' would be an invalid length below md, and
    // an invalid var() fallback takes the whole declaration with it.
    expect(chain).toBe('var(--media-md__padding, 4px)')
  })

  test('adds px through every level of a multi-link chain', () => {
    const style: Record<string, unknown> = {}

    const chain = writeVarChain(style, 'marginTop', 2, [
      { prefix: 'media-sm', value: 8 },
      { prefix: 'media-md', value: 16 },
    ])

    expect(style['--media-sm__margin-top']).toBe('var(--media-sm) 8px')
    expect(style['--media-md__margin-top']).toBe('var(--media-md) 16px')
    expect(chain).toBe(
      'var(--media-md__margin-top, var(--media-sm__margin-top, 2px))',
    )
  })

  test('leaves unitless properties alone', () => {
    const style: Record<string, unknown> = {}

    const chain = writeVarChain(style, 'flexGrow', 0, [
      { prefix: 'media-md', value: 1 },
    ])

    expect(style['--media-md__flex-grow']).toBe('var(--media-md) 1')
    expect(chain).toBe('var(--media-md__flex-grow, 0)')
  })

  test('suffixes a zero length, matching applyStyles', () => {
    const style: Record<string, unknown> = {}

    const chain = writeVarChain(style, 'gap', 0, [
      { prefix: 'media-md', value: 0 },
    ])

    expect(style['--media-md__gap']).toBe('var(--media-md) 0px')
    expect(chain).toBe('var(--media-md__gap, 0px)')
  })

  test('never double-suffixes a value that already carries a unit', () => {
    const style: Record<string, unknown> = {}

    const chain = writeVarChain(style, 'padding', '1rem', [
      { prefix: 'media-md', value: '2em' },
    ])

    expect(style['--media-md__padding']).toBe('var(--media-md) 2em')
    expect(chain).toBe('var(--media-md__padding, 1rem)')
  })

  test('passes a var() base through untouched, so chains can compose', () => {
    const style: Record<string, unknown> = {}

    // This is the pseudo pass layering on top of a breakpoint chain.
    const chain = writeVarChain(
      style,
      'padding',
      'var(--media-md__padding, 4px)',
      [{ prefix: 'toned_hover', value: 24 }],
    )

    expect(chain).toBe(
      'var(--toned_hover__padding, var(--media-md__padding, 4px))',
    )
  })

  test('leaves a calc() or other keyword value alone', () => {
    const style: Record<string, unknown> = {}

    const chain = writeVarChain(style, 'padding', 'calc(var(--base) * 2)', [
      { prefix: 'media-md', value: 'auto' },
    ])

    expect(style['--media-md__padding']).toBe('var(--media-md) auto')
    expect(chain).toBe('var(--media-md__padding, calc(var(--base) * 2))')
  })
})
