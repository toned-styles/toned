/**
 * System animations at runtime: what `defineAnimations` accepts, the static
 * frame each reduced-motion mode rests on (computed from the keyframes), and
 * the CSS the build emits for it from the system alone.
 */
import { describe, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { createWebRenderer } from '../server/index.ts'
import { reducedMotionFrame } from './animations.ts'
import { defineAnimations, defineSystem } from './index.ts'

const motion = defineAnimations(
  {
    pulse: {
      keyframes: { '50%': { opacity: 0.5 } },
      duration: 2000,
      iterations: 'infinite',
      reducedMotion: 'none',
    },
    fade: {
      keyframes: { from: { opacity: 0 }, to: { opacity: 1 } },
      duration: 200,
      fillMode: 'both',
      reducedMotion: 'end',
    },
    glow: {
      keyframes: {
        '0%, 100%': { boxShadow: '0 0 4px red' },
        '50%': { boxShadow: '0 0 8px blue' },
      },
      duration: 4000,
      iterations: 'infinite',
      reducedMotion: { at: '50%' },
    },
    status: {
      keyframes: { '75%, 100%': { transform: 'scale(2)', opacity: 0 } },
      duration: 1000,
      iterations: 'infinite',
      reducedMotion: 'keep',
    },
    rise: {
      keyframes: {
        from: { opacity: 0, translateY: 8, rotate: 10 },
        to: { opacity: 1, translateY: 0, scaleX: 2 },
      },
      duration: 300,
      reducedMotion: 'end',
    },
  },
  {
    durations: { slow: 400 },
    easings: { emphasized: 'cubic-bezier(0.2, 0, 0, 1)' },
  },
)
const ui = defineSystem({
  id: 'anim',
  tokens: { ...motion.tokens },
  conditions: {
    animations: motion.animations,
    states: { open: '[data-open]' },
  },
})
const { css, manifest } = buildStyles(ui)
const web = createWebRenderer(ui, { manifest })
const REDUCED = '@media (prefers-reduced-motion: reduce)'
/** The reduced-motion block the build emits, unwrapped. */
const reduced = css.slice(css.indexOf(REDUCED))

describe('defineAnimations', () => {
  test('refuses an animation without reducedMotion, naming the modes', () => {
    expect(() =>
      defineAnimations({
        bare: { keyframes: { to: { opacity: 1 } } },
      } as never),
    ).toThrow(
      "Toned: animation 'bare' has no reducedMotion; declare 'none', 'end', { at: '<offset>%' } or 'keep'",
    )
    expect(() =>
      defineAnimations({ bare: { to: { opacity: 1 } } } as never),
    ).toThrow(/animation 'bare' has no reducedMotion/)
  })

  test('refuses { at } on an offset the keyframes do not declare', () => {
    expect(() =>
      defineAnimations({
        a: {
          keyframes: { '50%': { opacity: 0 } },
          reducedMotion: { at: '30%' },
        },
      } as never),
    ).toThrow(
      "Toned: animation 'a' rests at 30%, which its keyframes do not declare; its offsets: 50%",
    )
  })

  test('refuses a resting frame that would need an interpolated value', () => {
    // At 50% opacity is declared but translateY only at the ends: the browser
    // would interpolate it, so the frame cannot be read off the keyframes.
    expect(() =>
      defineAnimations({
        a: {
          keyframes: {
            from: { opacity: 0, translateY: 4 },
            '50%': { opacity: 1 },
            to: { opacity: 0, translateY: 0 },
          },
          reducedMotion: { at: '50%' },
        },
      }),
    ).toThrow(
      "Toned: animation 'a' rests at 50%, where translateY is not declared but is animated elsewhere; declare translateY at 50% or rest at another offset",
    )
  })

  test("refuses the name 'none', which is the token's stop", () => {
    expect(() =>
      defineAnimations({
        none: { keyframes: { to: { opacity: 1 } }, reducedMotion: 'none' },
      }),
    ).toThrow(
      "Toned: 'none' cannot name an animation; animation: 'none' stops one",
    )
  })
})

describe('the resting frame comes from the keyframes', () => {
  const frame = (
    name: keyof typeof motion.animations,
    mode?: Parameters<typeof reducedMotionFrame>[1],
  ) =>
    reducedMotionFrame(
      motion.animations[name],
      mode ?? motion.animations[name].reducedMotion,
    )

  test('{ at } reads the declared offset, across a comma list', () => {
    expect(frame('glow')).toEqual({ boxShadow: '0 0 8px blue' })
    expect(frame('glow', { at: '0%' })).toEqual({ boxShadow: '0 0 4px red' })
    expect(frame('glow', { at: '100%' })).toEqual({ boxShadow: '0 0 4px red' })
  })

  test("'end' is the frame the last iteration finishes on", () => {
    expect(frame('fade')).toEqual({ opacity: 1 })
    const ends = (
      direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse',
      iterations: number,
    ) =>
      reducedMotionFrame(
        {
          keyframes: { from: { opacity: 0 }, to: { opacity: 1 } },
          direction,
          iterations,
          reducedMotion: 'end',
        },
        'end',
      )
    expect(ends('reverse', 1)).toEqual({ opacity: 0 })
    expect(ends('alternate', 2)).toEqual({ opacity: 0 })
    expect(ends('alternate', 3)).toEqual({ opacity: 1 })
    expect(ends('alternate-reverse', 2)).toEqual({ opacity: 1 })
  })

  test("'end' on an implicit end is the element's own value: no field written", () => {
    expect(
      reducedMotionFrame(
        { keyframes: { '50%': { opacity: 0.5 } }, reducedMotion: 'end' },
        'end',
      ),
    ).toEqual({})
  })

  test("'none' writes nothing and 'keep' has no frame", () => {
    expect(frame('pulse')).toEqual({})
    expect(frame('status')).toBeUndefined()
  })
})

describe('CSS emission per mode', () => {
  test('the keyframes are emitted once, as authored, outside reduced motion', () => {
    expect(css).toContain('@keyframes anim-toned_pulse {50% {opacity:0.5;}}')
    expect(css).toContain(
      '@keyframes anim-toned_glow {0%, 100% {box-shadow:0 0 4px red;}50% {box-shadow:0 0 8px blue;}}',
    )
  })

  test('the portable transform channels compile to the CSS individual transforms', () => {
    expect(css).toContain(
      '@keyframes anim-toned_rise {from {opacity:0;translate:0px 8px;rotate:10deg;}to {opacity:1;translate:0px 0px;scale:2 1;}}',
    )
  })

  test('reduced motion redefines each animation by mode, under a condition toned owns', () => {
    expect(css.split(REDUCED)).toHaveLength(2)
    // none: no frames, so the element shows its own style.
    expect(reduced).toContain('@keyframes anim-toned_pulse {}')
    // end and { at }: the resting frame for the whole timeline.
    expect(reduced).toContain(
      '@keyframes anim-toned_fade {0%, 100% {opacity:1;}}',
    )
    expect(reduced).toContain(
      '@keyframes anim-toned_glow {0%, 100% {box-shadow:0 0 8px blue;}}',
    )
    // keep: not redefined.
    expect(reduced).not.toContain('@keyframes anim-toned_status ')
  })

  test('a local override reads a variant name only reduced motion defines', () => {
    const { Ping, Halo, Plain } = web.resolve(
      ui.stylesheet({
        Ping: { animation: 'pulse', reducedMotion: 'keep' },
        Halo: { animation: 'glow', reducedMotion: { at: '0%' } },
        Plain: { animation: 'pulse', reducedMotion: 'none' },
      }),
    )
    // Outside reduced motion the variable is unset and the animation is the
    // authored one; under it the variable names the variant.
    expect(Ping.className).toContain('anim--animation_pulse~keep')
    expect(css).toContain(
      '.anim--animation_pulse\\~keep{animation-name:var(--anim-toned_rm-pulse--keep, anim-toned_pulse);',
    )
    expect(reduced).toContain(
      '--anim-toned_rm-pulse--keep: anim-toned_pulse__keep;',
    )
    expect(reduced).toContain(
      '@keyframes anim-toned_pulse__keep {50% {opacity:0.5;}}',
    )
    expect(Halo.className).toContain('anim--animation_glow~at-0')
    // A variant with the same frame as another names its keyframes: glow
    // ends on 100%, and its 0% and 100% are one block, so 'end', 0% and 100%
    // share one definition.
    expect(reduced).toContain(
      '@keyframes anim-toned_glow__end {0%, 100% {box-shadow:0 0 4px red;}}',
    )
    expect(reduced).toContain(
      '--anim-toned_rm-glow--at-0: anim-toned_glow__end;',
    )
    expect(reduced).toContain(
      '--anim-toned_rm-glow--at-100: anim-toned_glow__end;',
    )
    expect(reduced).not.toContain('@keyframes anim-toned_glow__at-')
    // A variant equal to the default names the redefined animation itself.
    expect(reduced).toContain('--anim-toned_rm-pulse--end: anim-toned_pulse;')
    // The default mode is no variant.
    expect(Plain.className).toContain('anim--animation_pulse')
    expect(Plain.className).not.toContain('~')
  })

  test('the build reads the system only: the same CSS with or without sheets', () => {
    ui.stylesheet({ Root: { animation: 'status', reducedMotion: 'none' } })
    expect(buildStyles(ui).css).toBe(css)
  })
})

describe('composition in a part', () => {
  test('duration, easing and delay override the animation timing in order', () => {
    const { Root } = web.resolve(
      ui.stylesheet({
        Root: {
          animation: 'fade',
          duration: 'slow',
          easing: 'emphasized',
          delay: 120,
        },
      }),
    )
    // fade sets a duration, so the later duration overrides it inline; it
    // sets no easing, so the easing is its own class.
    expect(Root.className).toContain('anim--animation_fade')
    expect(Root.className).toContain('anim--easing_emphasized')
    expect(css).toContain(
      '.anim--easing_emphasized{animation-timing-function:cubic-bezier(0.2, 0, 0, 1);}',
    )
    expect(Root.style).toMatchObject({
      animationDuration: '400ms',
      animationDelay: '120ms',
    })
  })

  test("animation: 'none' stops an animation under a condition", () => {
    const { Root } = web.resolve(
      ui.stylesheet({
        Root: { animation: 'pulse', ':open': { animation: 'none' } },
      }),
    )
    expect(Root.style?.['animationName']).toBe(
      'var(--anim-toned-rule-1-animationName, anim-toned_pulse)',
    )
    expect(Object.values(Root.style ?? {})).toContain(
      'var(--anim-toned_open) none',
    )
  })

  test('a reducedMotion override needs its animation beside it', () => {
    expect(() =>
      ui.stylesheet({
        Root: { animation: 'pulse', ':open': { reducedMotion: 'keep' } },
      }),
    ).toThrow(
      "Toned: reducedMotion 'keep' has no animation beside it; write it in the same block as animation: '<name>'",
    )
    expect(() =>
      ui.stylesheet({
        Root: { animation: 'pulse', reducedMotion: { at: '30%' } as never },
      }),
    ).toThrow(
      "Toned: animation 'pulse' rests at 30%, which its keyframes do not declare; its offsets: 50%",
    )
  })
})

describe('the build emits only the motion CSS a system can use', () => {
  test('a system without animations emits no keyframes, reduced-motion block or variants', () => {
    const plain = defineSystem({ id: 'anim-plain', tokens: {} })
    const out = buildStyles(plain).css
    expect(out).not.toContain('@keyframes')
    expect(out).not.toContain('prefers-reduced-motion')
    expect(out).not.toContain('toned_rm-')
  })

  test('without the reducedMotion token, no override variables, variants or classes', () => {
    const bare = defineSystem({
      id: 'anim-bare',
      tokens: { animation: motion.animation },
      conditions: { animations: motion.animations },
    })
    const out = buildStyles(bare).css
    // The defaults are still emitted, per mode.
    expect(out).toContain('@keyframes anim-bare-toned_pulse {}')
    expect(out).not.toContain('toned_rm-')
    expect(out).not.toMatch(/@keyframes anim-bare-toned_\w[\w-]*__/)
    expect(out).not.toContain('\\~')
  })

  test('with it, the variants a part can name are emitted', () => {
    expect(css).toContain('--anim-toned_rm-pulse--keep')
    expect(css).toContain('.anim--animation_pulse\\~keep{')
  })
})
