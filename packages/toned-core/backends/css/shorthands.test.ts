import { describe, expect, it } from 'vitest'

import { buildStyles } from '../../build/index.ts'
import { ui } from '../../scorecard/fixture/system.ts'
import { createWebRenderer } from '../../server/index.ts'
import { defineSystem, defineToken } from '../../system/definers.ts'

const web = createWebRenderer(ui, {
  manifest: buildStyles(ui, { sheets: [] }).manifest,
})
const root = (sheet: object) =>
  (web.resolve(sheet as never) as Record<string, { style: object }>)['Root']!
    .style as Record<string, string>

describe('a shorthand beside a conditional longhand', () => {
  it('is split into longhands, so the condition cannot revert it', () => {
    const style = root(
      // @ts-expect-error — the types reject the pair; untyped and composed
      // sheets still reach the runtime, which separates it
      ui.stylesheet((q) => ({
        Root: {
          '@platform web': { $style: { transition: 'opacity 200ms ease' } },
          [q.state('open')]: {
            '@platform web': { $style: { transitionProperty: 'transform' } },
          },
        },
      })),
    )
    expect(style).not.toHaveProperty('transition')
    expect(style['transitionDuration']).toBe('200ms')
    expect(style['transitionTimingFunction']).toBe('ease')
    expect(style['transitionProperty']).toMatch(
      /^var\(--scorecard-toned-rule-\d+-transitionProperty, opacity\)$/,
    )
  })

  it('splits a conditional shorthand beside a resting longhand', () => {
    const style = root(
      // @ts-expect-error — as above
      ui.stylesheet((q) => ({
        Root: {
          '@platform web': { $style: { overflowY: 'auto' } },
          [q.state('open')]: {
            '@platform web': { $style: { overflow: 'hidden' } },
          },
        },
      })),
    )
    expect(style).not.toHaveProperty('overflow')
    expect(style['overflowY']).toMatch(/, auto\)$/)
    expect(style['overflowX']).toMatch(/, revert-layer\)$/)
  })

  it('rejects a shorthand it cannot split, naming both fields and the fix', () => {
    expect(() =>
      root(
        ui.stylesheet(
          (q) =>
            ({
              Root: {
                '@platform web': { $style: { transition: 'var(--motion)' } },
                [q.state('open')]: {
                  '@platform web': {
                    $style: { transitionProperty: 'transform' },
                  },
                },
              },
            }) as never,
        ),
      ),
    ).toThrow(
      /'transition' and 'transitionProperty'.*Write the longhands \(transitionProperty, transitionDuration/,
    )
  })

  it('keeps static, unsplittable pairs as authored', () => {
    const style = root(
      ui.stylesheet({
        Root: {
          '@platform web': {
            $style: { animation: 'spin 1s', animationPlayState: 'paused' },
          },
        },
      }),
    )
    expect(style['animation']).toBe('spin 1s')
    expect(style['animationPlayState']).toBe('paused')
  })

  it('splits legacy raw styles too', () => {
    const legacy = defineSystem(
      { gap: defineToken({ values: [1], resolve: (gap) => ({ gap }) }) },
      { states: { open: '[data-open]' } },
    )
    const sheet = legacy.stylesheet({
      Root: {
        style: { padding: '4px 8px' },
        ':open': { style: { paddingTop: 0 } },
      },
    } as never)
    const style = createWebRenderer(legacy, {
      manifest: buildStyles(legacy, { sheets: [] }).manifest,
    }).resolve(sheet as never)['Root' as never]!['style'] as Record<
      string,
      string
    >
    expect(style).not.toHaveProperty('padding')
    expect(style['paddingLeft']).toBe('8px')
    expect(style['paddingTop']).toMatch(
      /^var\(--toned-rule-\d+-paddingTop, 4px\)$/,
    )
  })
})

describe('a CSS-wide keyword', () => {
  it('under a condition is rejected, naming the fix', () => {
    expect(() =>
      root(
        ui.stylesheet({
          Root: {
            bgColor: 'accent',
            ':hover': {
              '@platform web': { $style: { backgroundColor: 'inherit' } },
            },
          },
        } as never),
      ),
    ).toThrow(/backgroundColor: 'inherit' under a condition.*\$webRules/)
  })

  it('at rest is kept: it is the chain fallback, where keywords work', () => {
    const style = root(
      ui.stylesheet({
        Root: {
          '@platform web': { $style: { backgroundColor: 'inherit' } },
          ':hover': { bgColor: 'accent' },
        },
      }),
    )
    expect(style['backgroundColor']).toMatch(/, inherit\)$/)
  })
})
