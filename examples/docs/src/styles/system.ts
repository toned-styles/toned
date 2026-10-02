import { defineAnimations, defineSystem, defineToken } from '@toned/core'
import { system as baseTokens } from '@toned/systems/base'

import * as site from './tokens.ts'

const { breakpoints, ...base } = baseTokens

const motion = defineAnimations({
  'token-flow': {
    keyframes: { from: { strokeDashoffset: 28 }, to: { strokeDashoffset: 0 } },
    duration: 1800,
    easing: 'linear',
    iterations: 'infinite',
  },
})

/** The studio's accent palette; the token diagram shows these resolved values. */
export const tones = {
  blue: { accent: '#284bdd', soft: '#e8edff' },
  violet: { accent: '#7040cb', soft: '#ede9fc' },
  coral: { accent: '#b63f31', soft: '#fce8e2' },
} as const

/**
 * One system for the whole site: the base layout vocabulary, the site's own
 * roles from `tokens.ts`, and the studio's theme tokens below. The studio's
 * web theme is local to its root, so sibling instances stay independent.
 */
export const docsSystem = defineSystem(
  {
    ...base,
    ...site,
    container: defineToken({
      values: ['preview'] as const,
      resolve: (value) => ({
        containerName: value,
        containerType: 'inline-size',
      }),
    }),
    animation: motion.animation,
    accent: defineToken({
      values: ['blue', 'violet', 'coral'] as const,
      resolve: (value: keyof typeof tones) => ({
        '--studio-accent': tones[value].accent,
        '--studio-soft': tones[value].soft,
      }),
    }),
    scheme: defineToken({
      values: ['light', 'dark'] as const,
      resolve: (value) => ({
        '--studio-card': value === 'dark' ? '#18213c' : '#fff',
        '--studio-ink': value === 'dark' ? '#f4f6ff' : '#182554',
        '--studio-track': value === 'dark' ? '#ffffff24' : '#18255415',
      }),
    }),
    surface: defineToken({
      values: ['accent', 'soft', 'card', 'track'] as const,
      resolve: (value) => ({ backgroundColor: `var(--studio-${value})` }),
    }),
    ink: defineToken({
      values: ['default', 'accent', 'white'] as const,
      resolve: (value) => ({
        color:
          value === 'white'
            ? '#fff'
            : `var(--studio-${value === 'default' ? 'ink' : 'accent'})`,
      }),
    }),
    depth: defineToken({
      values: ['raised'] as const,
      resolve: () => ({ boxShadow: '0 24px 64px #18255418' }),
    }),
    curve: defineToken({
      values: ['sharp', 'soft', 'round', 'pill'] as const,
      resolve: (value: 'sharp' | 'soft' | 'round' | 'pill') => ({
        borderRadius: { sharp: 4, soft: 12, round: 20, pill: 999 }[value],
      }),
    }),
  },
  {
    breakpoints,
    animations: motion.animations,
    containers: { preview: { wide: 120 } },
  },
)

export const { stylesheet } = docsSystem
