import { defineCssToken, defineToken } from '../defineCssToken.ts'
import { SpaceUnit } from './unit.ts'

export const overflow = defineCssToken('overflow', [
  'hidden',
  'auto',
  'visible',
  'scroll',
])
export const overflowX = defineCssToken('overflowX', [
  'hidden',
  'auto',
  'visible',
  'scroll',
])
export const overflowY = defineCssToken('overflowY', [
  'hidden',
  'auto',
  'visible',
  'scroll',
])

const paddingValues = [
  new Number(),
  // The common steps of the 4px scale, enumerated as literals so static CSS
  // generation (`dom/generate.ts`) can emit an atomic class for each and the
  // runtime resolves them by className instead of an inline style. The boxed
  // Number above still covers any other value dynamically — an off-scale
  // number simply resolves inline, exactly as every number did before.
  0,
  0.5,
  1,
  1.5,
  2,
  2.5,
  3,
  3.5,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  14,
  16,
  20,
  24,
  32,
  'xxsmal',
  'xsmall',
  'small',
  'medium',
  'large',
  'xlarge',
  'xxlarge',
] as const

export const padding = defineCssToken(
  ['paddingLeft', 'paddingTop', 'paddingBottom', 'paddingRight'],
  paddingValues,
  SpaceUnit,
)
export const paddingX = defineCssToken(
  ['paddingLeft', 'paddingRight'],
  paddingValues,
  SpaceUnit,
)
export const paddingY = defineCssToken(
  ['paddingTop', 'paddingBottom'],
  paddingValues,
  SpaceUnit,
)
export const paddingLeft = defineCssToken(
  'paddingLeft',
  paddingValues,
  SpaceUnit,
)
export const paddingRight = defineCssToken(
  'paddingRight',
  paddingValues,
  SpaceUnit,
)
export const paddingTop = defineCssToken('paddingTop', paddingValues, SpaceUnit)
export const paddingBottom = defineCssToken(
  'paddingBottom',
  paddingValues,
  SpaceUnit,
)

export const gap = defineCssToken('gap', paddingValues, SpaceUnit)

/*
 * Margins and insets share the padding scale plus its negative half and
 * 'auto' — same relative-to-base semantics, enumerated for static generation
 * exactly like the padding steps (an off-scale number still resolves inline).
 */
const marginValues = [
  new Number(),
  -0.5,
  -1,
  -1.5,
  -2,
  -2.5,
  -3,
  -3.5,
  -4,
  -5,
  -6,
  -8,
  'auto',
  ...paddingValues.filter((v): v is number => typeof v === 'number'),
] as const
export const rowGap = defineCssToken('rowGap', paddingValues, SpaceUnit)
export const columnGap = defineCssToken('columnGap', paddingValues, SpaceUnit)

export const flexLayout = defineToken({
  values: ['column', 'column-reverse', 'row', 'row-reverse'],
  resolve: (value) => ({
    display: 'flex',
    flexDirection: value,
  }),
})

export const flexBasis = defineCssToken('flexBasis', paddingValues, SpaceUnit)
export const flexGrow = defineCssToken('flexGrow', ['0', '1'])
export const flexWrap = defineCssToken('flexWrap', [
  'wrap',
  'wrap-reverse',
  'nowrap',
])
export const flexShrink = defineCssToken('flexShrink', ['0', '1'])
export const justifyContent = defineCssToken('justifyContent', [
  'normal',
  'flex-start',
  'flex-end',
  'center',
  'space-between',
  'space-around',
  'space-evenly',
  'stretch',
])
export const justifyItems = defineCssToken('justifyItems', [
  'flex-start',
  'flex-end',
  'center',
  'stretch',
])
export const justifySelf = defineCssToken('justifySelf', [
  'auto',
  'flex-start',
  'flex-end',
  'center',
  'stretch',
])

export const alignContent = defineCssToken('alignContent', [
  'normal',
  'flex-start',
  'flex-end',
  'center',
  'space-between',
  'space-around',
  'space-evenly',
  'baseline',
  'stretch',
])

export const alignItems = defineCssToken('alignItems', [
  'flex-start',
  'flex-end',
  'center',
  'baseline',
  'stretch',
])

export const alignSelf = defineCssToken('alignSelf', [
  'auto',
  'flex-start',
  'flex-end',
  'center',
  'baseline',
  'stretch',
])

export const placeContent = defineCssToken('placeContent', [
  'start',
  'end',
  'center',
  'space-between',
  'space-around',
  'space-evenly',
  'baseline',
  'stretch',
])

export const placeItems = defineCssToken('placeItems', [
  'start',
  'end',
  'center',
  'baseline',
  'stretch',
])

export const placeSelf = defineCssToken('placeSelf', [
  'auto',
  'start',
  'end',
  'center',
  'stretch',
])

// Margin tokens (padding scale + negatives + auto)
const MarginUnit = (value: Number | String, tokens: Parameters<typeof SpaceUnit>[1]) =>
  value === 'auto' ? 'auto' : SpaceUnit(value, tokens)

export const margin = defineCssToken(
  ['marginLeft', 'marginTop', 'marginBottom', 'marginRight'],
  marginValues,
  MarginUnit,
)
export const marginX = defineCssToken(['marginLeft', 'marginRight'], marginValues, MarginUnit)
export const marginY = defineCssToken(['marginTop', 'marginBottom'], marginValues, MarginUnit)
export const marginTop = defineCssToken('marginTop', marginValues, MarginUnit)
export const marginBottom = defineCssToken('marginBottom', marginValues, MarginUnit)
export const marginLeft = defineCssToken('marginLeft', marginValues, MarginUnit)
export const marginRight = defineCssToken('marginRight', marginValues, MarginUnit)

// Sizing lives in sizes.ts (base-relative, enumerated) — the spread order in
// index.ts lets it own width/height and friends.

// Display & positioning
export const display = defineCssToken('display', [
  'block',
  'inline',
  'inline-block',
  'flex',
  'inline-flex',
  'grid',
  'none',
])
export const position = defineCssToken('position', [
  'static',
  'relative',
  'absolute',
  'fixed',
  'sticky',
])

// Insets ride the margin scale (base-relative, negatives, enumerated); a
// boxed String keeps percentages and calc() available dynamically.
const offsetValues = [new String(), 0, ...marginValues] as const
export const top = defineCssToken('top', offsetValues, MarginUnit)
export const left = defineCssToken('left', offsetValues, MarginUnit)
export const right = defineCssToken('right', offsetValues, MarginUnit)
export const bottom = defineCssToken('bottom', offsetValues, MarginUnit)

// Not base-relative — a stacking index, enumerated for static generation.
export const zIndex = defineCssToken('zIndex', [
  new Number(),
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  10,
  20,
  30,
  40,
  50,
] as const)


// Interaction
export const cursor = defineCssToken('cursor', [
  'auto',
  'default',
  'pointer',
  'text',
  'not-allowed',
  'grab',
  'grabbing',
])
export const opacity = defineCssToken('opacity', [new Number()] as const)
export const pointerEvents = defineCssToken('pointerEvents', [
  'auto',
  'none',
])
