/**
 * The scorecard's responsive fixture: a small legacy-form system with
 * responsive atoms, which only legacy systems resolve to classes today. It has
 * Daylight's shape in miniature: width breakpoints plus non-width media
 * conditions, a four-sided `margin` token, and declared pairs, so the
 * responsive-atom metric moves with both the pair declaration and the
 * shorthand collapse.
 */
import { defineSystem, defineToken } from '../../index.ts'

export const margin = defineToken({
  values: [0, 1, 2, 4] as const,
  resolve: (value) => ({
    marginTop: `${value * 4}px`,
    marginRight: `${value * 4}px`,
    marginBottom: `${value * 4}px`,
    marginLeft: `${value * 4}px`,
  }),
})
export const maxW = defineToken({
  values: ['gutter', '20', '32'] as const,
  resolve: (value) => ({
    maxWidth: value === 'gutter' ? 'calc(100% - 2rem)' : `${value}rem`,
  }),
})
export const textStep = defineToken({
  values: ['sm', 'base'] as const,
  resolve: (value) => ({ fontSize: value === 'sm' ? '0.875rem' : '1rem' }),
})

export const breakpoints = {
  __breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    pointerCoarse: '(pointer: coarse)',
    motionSafe: '(prefers-reduced-motion: no-preference)',
  },
} as const

const tokens = { margin, maxW, textStep }

export const responsive = defineSystem(tokens, {
  breakpoints,
  responsiveTokens: { margin: ['md'], maxW: ['sm', 'md'], textStep: ['md'] },
})

/** The same system without responsive atoms: the metric's baseline. */
export const unresponsive = defineSystem(tokens, { breakpoints })
