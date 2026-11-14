/**
 * The scorecard's fixture system: a small, self-contained descriptor system
 * with every vocabulary the corpus and suites exercise. Tokens have finite
 * scales, one named media threshold (`md`), one declared state (`open`), one
 * bridge (`placeholder`), two contexts (`card` offering hover, `prose` with
 * the value `faq`) and one application-owned CSS variable. It is
 * namespaced (`id`), so an unlisted `var()` is renamed, as in a real app.
 * One animation (`fade-in`) and one bridge token (`placeholderColor`) cover
 * motion and bridges.
 */
import {
  bridgeVarName,
  defineAnimations,
  defineSystem,
  defineToken,
} from '../../index.ts'

const palette = {
  surface: 'var(--app-surface)',
  accent: '#2563eb',
  muted: '#6b7280',
} as const
type Paint = keyof typeof palette

export const gap = defineToken({
  values: [0, 1, 2, 4] as const,
  resolve: (value) => ({ gap: value * 4 }),
})
export const padding = defineToken({
  values: [0, 1, 2, 4] as const,
  resolve: (value) => ({ padding: value * 4 }),
})
export const opacity = defineToken({
  values: [0, 0.5, 1] as const,
  resolve: (value) => ({ opacity: value }),
})
export const bgColor = defineToken({
  values: ['surface', 'accent', 'muted'] as const,
  resolve: (value: Paint) => ({ backgroundColor: palette[value] }),
})
export const textColor = defineToken({
  values: ['surface', 'accent', 'muted'] as const,
  resolve: (value: Paint) => ({ color: palette[value] }),
})
/** Writes the `placeholder` bridge's variable, as a real system's token would. */
export const placeholderColor = defineToken({
  values: ['accent', 'muted'] as const,
  resolve: (value: Paint) => ({
    [bridgeVarName('placeholder', 'color')]: palette[value],
  }),
})

const motion = defineAnimations({
  'fade-in': {
    keyframes: { from: { opacity: 0 }, to: { opacity: 1 } },
    duration: 200,
  },
})

export const ui = defineSystem({
  id: 'scorecard',
  externalCssVariables: ['--app-surface'],
  tokens: {
    gap,
    padding,
    opacity,
    bgColor,
    textColor,
    placeholderColor,
    animation: motion.animation,
  },
  conditions: {
    animations: motion.animations,
    media: { md: 768 },
    states: { open: "[data-state='open']" },
    contexts: {
      card: { states: ['hover'] },
      prose: { values: ['faq'] },
    },
    bridges: {
      placeholder: { selector: '::placeholder', properties: ['color'] },
    },
  },
})
