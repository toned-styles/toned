/** The alpha modifier — parsing, CSS emission, exec resolution, literals. */
import { describe, expect, test } from 'vitest'
import { generate } from '../dom/generate.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import { alphaLiteral, splitAlphaValue } from './alpha.ts'

const bgColor = defineToken({
  values: ['primary', 'card', 'transparent'] as const,
  resolve: (value, tokens) => ({
    backgroundColor: value === 'transparent' ? 'transparent' : tokens[value],
  }),
  alphaChannel: ['backgroundColor'],
  alphaSteps: [30, 50, 90],
})

// No alphaChannel — must behave exactly as before.
const textColor = defineToken({
  values: ['foreground'] as const,
  resolve: (value, tokens) => ({ color: tokens[value] }),
})

const system = defineSystem({ bgColor, textColor })

// biome-ignore lint/suspicious/noExplicitAny: tests inspect dynamic style output
const exec = (style: Record<string, unknown>, useClassName: boolean): any =>
  system.exec(
    {
      tokens: new Proxy({}, { get: (_t, p: string) => `var(--${p})` }),
      useClassName,
    },
    // biome-ignore lint/suspicious/noExplicitAny: test drives the open surface
    style as any,
  )

describe('splitAlphaValue', () => {
  test('parses value/step', () => {
    expect(splitAlphaValue('primary/90')).toEqual({ base: 'primary', alpha: 90 })
    expect(splitAlphaValue('danger-surface/12.5')).toEqual({
      base: 'danger-surface',
      alpha: 12.5,
    })
  })

  test('rejects malformed values', () => {
    expect(splitAlphaValue('primary')).toBeNull()
    expect(splitAlphaValue('primary/')).toBeNull()
    expect(splitAlphaValue('/90')).toBeNull()
    expect(splitAlphaValue('primary/0')).toBeNull()
    expect(splitAlphaValue('primary/100')).toBeNull()
    expect(splitAlphaValue('primary/abc')).toBeNull()
    expect(splitAlphaValue(4)).toBeNull()
  })
})

describe('generated CSS', () => {
  const css = generate(system.system)

  test('alpha-capable colour rules route through relative colour syntax', () => {
    expect(css).toContain(
      '.bgColor_primary{background-color:rgb(from var(--primary) r g b / calc(alpha * var(--toned-alpha-background-color, 1)));}',
    )
  })

  test('unwrappable values stay literal', () => {
    expect(css).toContain('.bgColor_transparent{background-color:transparent;}')
  })

  test('tokens without an alphaChannel are untouched', () => {
    expect(css).toContain('.textColor_foreground{color:var(--foreground);}')
  })

  test('registers a non-inheriting parameter per channel', () => {
    expect(css).toContain(
      "@property --toned-alpha-background-color {syntax:'<number>';inherits:false;initial-value:1;}",
    )
  })

  test('emits one class per declared step, escaped', () => {
    expect(css).toContain('.bgColor\\$50{--toned-alpha-background-color:0.5}')
    expect(css).toContain('.bgColor\\$90{--toned-alpha-background-color:0.9}')
  })
})

describe('exec, className mode', () => {
  test('an enumerated step resolves to base class + step class', () => {
    const out = exec({ bgColor: 'primary/50' }, true)
    expect(out.className).toContain('bgColor_primary')
    expect(out.className).toContain('bgColor$50')
    expect(out.style).toEqual({})
  })

  test('an off-scale alpha resolves to base class + inline parameter', () => {
    const out = exec({ bgColor: 'primary/42' }, true)
    expect(out.className).toContain('bgColor_primary')
    expect(out.className).not.toContain('$42')
    expect(out.style['--toned-alpha-background-color']).toBe('0.42')
  })

  test('a plain value is untouched', () => {
    const out = exec({ bgColor: 'primary' }, true)
    expect(out.className).toContain('bgColor_primary')
    expect(out.className).not.toContain('$')
  })
})

describe('exec, inline mode (native/email path)', () => {
  test('var() references route through relative colour syntax', () => {
    const out = exec({ bgColor: 'primary/50' }, false)
    expect(out.style.backgroundColor).toBe('rgb(from var(--primary) r g b / calc(alpha * 0.5))')
  })

  test('literal tokens compute an rgba', () => {
    const literalTokens = { primary: '#2f54eb' }
    // biome-ignore lint/suspicious/noExplicitAny: tests inspect dynamic style output
    const out: any = system.exec(
      { tokens: literalTokens, useClassName: false },
      // biome-ignore lint/suspicious/noExplicitAny: test drives the open surface
      { bgColor: 'primary/50' } as any,
    )
    expect(out.style.backgroundColor).toBe('rgba(47, 84, 235, 0.5)')
  })
})

describe('alphaLiteral', () => {
  test('hex forms', () => {
    expect(alphaLiteral('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)')
    expect(alphaLiteral('#2f54eb', 0.9)).toBe('rgba(47, 84, 235, 0.9)')
    expect(alphaLiteral('#2f54eb80', 0.5)).toBe('rgba(47, 84, 235, 0.251)')
  })

  test('rgb()/rgba() forms compose alphas', () => {
    expect(alphaLiteral('rgb(20 20 28)', 0.3)).toBe('rgba(20, 20, 28, 0.3)')
    expect(alphaLiteral('rgb(20 20 28 / 0.5)', 0.5)).toBe('rgba(20, 20, 28, 0.25)')
  })
})

describe('defineAnimations', async () => {
  const { defineAnimations } = await import('../system/index.ts')
  const motion = defineAnimations({
    'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
    'zoom-in-95': {
      from: { opacity: 0, transform: 'scale(0.95)' },
      to: { opacity: 1, transform: 'scale(1)' },
    },
  })
  const animSystem = defineSystem(
    { bgColor, animation: motion.animation },
    { animations: motion.animations },
  )

  test('keyframes are compiled with the system', () => {
    const css = generate(animSystem.system)
    expect(css).toContain('@keyframes toned_fade-in {from {opacity:0;}to {opacity:1;}}')
    expect(css).toContain('@keyframes toned_zoom-in-95 {')
  })

  test('the animation token emits its class through the ordinary loop', () => {
    const css = generate(animSystem.system)
    expect(css).toContain('.animation_fade-in{animation-name:toned_fade-in;}')
  })

  test('a stylesheet references an animation by name', () => {
    const out = animSystem.exec(
      { tokens: {}, useClassName: true },
      // biome-ignore lint/suspicious/noExplicitAny: test drives the open surface
      { animation: 'fade-in' } as any,
    )
    expect(out.className).toContain('animation_fade-in')
  })
})

describe('bridges', async () => {
  const { bridgeVarName } = await import('./css.ts')

  const placeholderColor = defineToken({
    values: ['muted', 'faint'] as const,
    resolve: (value, tokens) => ({
      [bridgeVarName('placeholder', 'color')]: tokens[value],
    }),
  })
  const iconSize = defineToken({
    values: [3, 4, 5] as const,
    resolve: value => ({
      [bridgeVarName('icon', 'width')]: `calc(var(--base) * ${value})`,
      [bridgeVarName('icon', 'height')]: `calc(var(--base) * ${value})`,
    }),
  })
  const bridgeSystem = defineSystem(
    { bgColor, placeholderColor, iconSize },
    {
      bridges: {
        placeholder: { selector: '::placeholder', properties: ['color'] },
        icon: { selector: "svg:not([class*='size-'])", properties: ['width', 'height'] },
      },
    },
  )
  const css = generate(bridgeSystem.system)

  test('pseudo-element bridges attach to the element', () => {
    expect(css).toContain('._::placeholder {color: var(--toned-b-placeholder-color, initial);}')
  })

  test('descendant bridges target under the element', () => {
    expect(css).toContain(
      "._ svg:not([class*='size-']) {width: var(--toned-b-icon-width, initial);height: var(--toned-b-icon-height, initial);}",
    )
  })

  test('the boundary reset stops parameters at component boundaries', () => {
    expect(css).toContain(
      '._ {--toned-b-placeholder-color: initial;--toned-b-icon-width: initial;--toned-b-icon-height: initial;}',
    )
    // ...and precedes the setter classes, so a setter wins on order.
    expect(css.indexOf('._ {--toned-b-placeholder-color')).toBeLessThan(
      css.indexOf('.placeholderColor_muted'),
    )
  })

  test('bridge tokens are ordinary tokens — atomic classes and all', () => {
    expect(css).toContain('.placeholderColor_muted{--toned-b-placeholder-color:var(--muted);}')
    expect(css).toContain('.iconSize_4{--toned-b-icon-width:calc(var(--base) * 4);--toned-b-icon-height:calc(var(--base) * 4);}')
    const out = bridgeSystem.exec(
      { tokens: new Proxy({}, { get: (_t, p: string) => `var(--${String(p)})` }), useClassName: true },
      // biome-ignore lint/suspicious/noExplicitAny: test drives the open surface
      { placeholderColor: 'muted', iconSize: 4 } as any,
    )
    expect(out.className).toContain('placeholderColor_muted')
    expect(out.className).toContain('iconSize_4')
  })
})
