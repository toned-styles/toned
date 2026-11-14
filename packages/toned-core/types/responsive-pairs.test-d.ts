/**
 * Compile-time contract for declared responsive pairs: a token that declares
 * the conditions it responds to (`responsiveTokens: { maxW: ['md'] }`) may
 * only be set directly under those conditions. `tsc` is the test: every
 * `@ts-expect-error` fails the build if its error disappears.
 */
import { defineSystem, defineToken } from '../system/index.ts'

const maxW = defineToken({
  values: ['gutter', '32'] as const,
  resolve: (value) => ({ maxWidth: value === 'gutter' ? '100%' : '32rem' }),
})
const gap = defineToken({
  values: [1, 2] as const,
  resolve: (value) => ({ gap: value }),
})
const ui = defineSystem(
  { maxW, gap },
  {
    breakpoints: { __breakpoints: { md: 768, lg: 1024 } },
    responsiveTokens: { maxW: ['md'] },
  },
)
const legacy = defineSystem(
  { maxW, gap },
  {
    breakpoints: { __breakpoints: { md: 768, lg: 1024 } },
    responsiveTokens: ['maxW'],
  },
)

// --- accepted ------------------------------------------------------------------

ui.stylesheet({
  Root: {
    maxW: 'gutter',
    '@md': { maxW: '32' },
    // A token without declared pairs keeps its chain under any condition.
    '@lg': { gap: 2 },
    // Nested conditions compile to a chain, not a responsive atom.
    ':hover': { '@lg': { maxW: '32' } },
  },
})
ui.stylesheet({ Root: { maxW: 'gutter' }, '@md': { Root: { maxW: '32' } } })
// The legacy list keeps every condition.
legacy.stylesheet({ Root: { '@lg': { maxW: '32' } } })

// --- an undeclared pair -------------------------------------------------------

ui.stylesheet({
  // @ts-expect-error — maxW declares only 'md'
  Root: { maxW: 'gutter', '@lg': { maxW: '32' } },
})
ui.stylesheet({
  Root: { maxW: 'gutter' },
  // @ts-expect-error — the same pair through a root condition block
  '@lg': { Root: { maxW: '32' } },
})

// --- the declaration itself ---------------------------------------------------

defineSystem(
  { maxW },
  {
    breakpoints: { __breakpoints: { md: 768 } },
    // @ts-expect-error — 'xl' is not a declared condition
    responsiveTokens: { maxW: ['xl'] },
  },
)
