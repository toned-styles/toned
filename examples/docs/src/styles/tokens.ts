import { defineToken } from '@toned/core'

import { brand, editorMetrics, fonts } from './brand.ts'

/**
 * The documentation site's design vocabulary.
 *
 * Every value a stylesheet may use is named here once, by the role it plays.
 * Sheets then say `text: 'muted'` or `elevation: 'raised'`; a raw colour,
 * shadow or font size in a sheet is a sign that a role is missing.
 */

const pick =
  <const Map extends Record<string, unknown>>(map: Map) =>
  (value: keyof Map) =>
    map[value]

const roles = <const Map extends Record<string, unknown>>(map: Map) =>
  Object.keys(map) as Array<keyof Map & string>

// ── Colour ──────────────────────────────────────────────────────────────

const textColors = {
  default: brand.ink,
  body: brand.body,
  muted: brand.muted,
  faint: brand.faint,
  accent: brand.blue,
  'accent-strong': brand.blueHover,
  'on-accent': brand.surface,
  'on-accent-muted': brand.blueWash,
  code: brand.codeInk,
  danger: brand.danger,
  'danger-strong': brand.dangerStrong,
  success: brand.success,
  warning: brand.warning,
} as const

const fillColors = {
  none: 'transparent',
  page: brand.page,
  // The sticky header: the page colour, let through by its backdrop blur.
  'page-glass': brand.pageGlass,
  surface: brand.surface,
  sunken: brand.sunken,
  tint: brand.blueTint,
  accent: brand.blue,
  'accent-strong': brand.blueHover,
  'accent-soft': brand.blueSoft,
  code: brand.codeBg,
  'code-chrome': brand.codeChrome,
  danger: brand.danger,
  'danger-soft': brand.dangerSoft,
  success: brand.success,
  'success-soft': brand.successSoft,
  warning: brand.warning,
  'warning-soft': brand.warningSoft,
  neutral: brand.faint,
  rule: brand.border,
} as const

const borderColors = {
  default: brand.border,
  subtle: brand.divider,
  strong: brand.borderStrong,
  accent: brand.blue,
  'accent-soft': brand.blueLine,
  danger: brand.dangerLine,
  success: brand.successLine,
  none: 'transparent',
} as const

/** Text colour, by role. */
export const text = defineToken({
  values: roles(textColors),
  resolve: (value) => ({ color: pick(textColors)(value) }),
})

/** Background colour, by role. */
export const fill = defineToken({
  values: roles(fillColors),
  resolve: (value) => ({ backgroundColor: pick(fillColors)(value) }),
})

// ── Borders ─────────────────────────────────────────────────────────────

const hairline = { borderWidth: 1, borderStyle: 'solid' } as const

const borders = {
  none: { borderWidth: 0, borderStyle: 'none' },
  all: hairline,
  dashed: { borderWidth: 1, borderStyle: 'dashed' },
  top: { borderTopWidth: 1, borderTopStyle: 'solid' },
  right: { borderRightWidth: 1, borderRightStyle: 'solid' },
  bottom: { borderBottomWidth: 1, borderBottomStyle: 'solid' },
  // A two-pixel edge that marks the current item in a list or tab strip.
  'marker-left': { borderLeftWidth: 2, borderLeftStyle: 'solid' },
  'marker-bottom': { borderBottomWidth: 2, borderBottomStyle: 'solid' },
} as const

/** Which edges carry a line. Its colour is `borderTone`. */
export const border = defineToken({
  values: roles(borders),
  resolve: pick(borders),
})

/** Border colour, by role. */
export const borderTone = defineToken({
  values: roles(borderColors),
  resolve: (value) => ({ borderColor: pick(borderColors)(value) }),
})

const radii = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 14,
  '3xl': 16,
  '4xl': 20,
  // A large finite step, so a spring can interpolate to it (9999 would snap).
  '5xl': 36,
  full: 9999,
} as const

/** Corner radius. */
export const radius = defineToken({
  values: roles(radii),
  resolve: (value) => ({ borderRadius: pick(radii)(value) }),
})

// ── Elevation ───────────────────────────────────────────────────────────

const shadows = {
  none: 'none',
  resting: '0 1px 2px #17234b0a',
  raised: '0 1px 2px #17234b08, 0 16px 40px #284bdd0a',
  panel: '0 1px 2px #17234b0a, 0 12px 32px #17234b0d',
  floating: '0 24px 80px #284bdd0a',
  hover: '0 10px 30px #284bdd14',
  'focus-ring': '0 0 0 4px #284bdd1f',
} as const

export const elevation = defineToken({
  values: roles(shadows),
  resolve: (value) => ({ boxShadow: pick(shadows)(value) }),
})

// ── Typography ──────────────────────────────────────────────────────────

const families = { sans: fonts.sans, mono: fonts.mono } as const

export const font = defineToken({
  values: roles(families),
  resolve: (value) => ({ fontFamily: pick(families)(value) }),
})

const weights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 650,
  heavy: 700,
} as const

export const weight = defineToken({
  values: roles(weights),
  resolve: (value) => ({ fontWeight: pick(weights)(value) }),
})

const sourceText = {
  fontFamily: fonts.mono,
  letterSpacing: 0,
  tabSize: 2,
  whiteSpace: 'pre',
  fontVariantLigatures: 'none',
} as const

/**
 * The type scale. A role fixes the size, and the leading and tracking where
 * they belong to the role; weight and colour stay separate tokens.
 */
const textStyles = {
  display: {
    fontSize: 'clamp(3.25rem, 7.8vw, 6.5rem)',
    lineHeight: 1.02,
    letterSpacing: '-0.07em',
  },
  headline: {
    fontSize: 'clamp(2.2rem, 4.5vw, 3.7rem)',
    lineHeight: 1.12,
    letterSpacing: '-0.055em',
  },
  title: {
    fontSize: 'clamp(2.1rem, 4vw, 2.75rem)',
    lineHeight: 1.1,
    letterSpacing: '-0.035em',
  },
  banner: { fontSize: 36, lineHeight: 1.15, letterSpacing: '-0.05em' },
  heading: { fontSize: 24, lineHeight: 1.3, letterSpacing: '-0.02em' },
  subheading: { fontSize: 18, lineHeight: 1.4, letterSpacing: '-0.01em' },
  feature: { fontSize: 20, letterSpacing: '-0.03em' },
  'lead-large': { fontSize: 20, lineHeight: 1.6 },
  lead: { fontSize: 19, lineHeight: 1.6 },
  intro: { fontSize: 18, lineHeight: 1.6 },
  prose: { fontSize: 16, lineHeight: 1.75 },
  body: { fontSize: 16, lineHeight: 1.6 },
  'body-large': { fontSize: 17 },
  'body-small': { fontSize: 15 },
  ui: { fontSize: 14 },
  caption: { fontSize: 13 },
  label: { fontSize: 12 },
  eyebrow: {
    fontSize: 13,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  overline: {
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  badge: { fontSize: 10, lineHeight: '16px' },
  code: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 1.7 },
  'code-inline': { fontFamily: fonts.mono, fontSize: '0.85em' },
  glyph: { fontSize: 22 },
  // Source as the editor sets it: CodeMirror must lay out identical lines.
  editor: {
    ...sourceText,
    fontSize: editorMetrics.fontSize,
    lineHeight: `${editorMetrics.lineHeight}px`,
  },
  output: { ...sourceText, fontSize: 12, lineHeight: '19px' },
} as const

export const textStyle = defineToken({
  values: roles(textStyles),
  resolve: pick(textStyles),
})

const alignments = { left: 'left', center: 'center', right: 'right' } as const

export const textAlign = defineToken({
  values: roles(alignments),
  resolve: (value) => ({ textAlign: pick(alignments)(value) }),
})

const wrapping = {
  normal: { whiteSpace: 'normal' },
  nowrap: { whiteSpace: 'nowrap' },
  pre: { whiteSpace: 'pre' },
  'pre-wrap': { whiteSpace: 'pre-wrap' },
  // Even line lengths for headings; no orphans for paragraphs.
  balance: { textWrap: 'balance' },
  pretty: { textWrap: 'pretty' },
  // Long identifiers break rather than widen their container.
  anywhere: { overflowWrap: 'anywhere' },
  'pre-wrap-anywhere': { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  // One line, cut with an ellipsis.
  truncate: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
} as const

/** How text behaves when it meets the edge of its box. */
export const wrap = defineToken({
  values: roles(wrapping),
  resolve: pick(wrapping),
})

/** Figures that keep their width, so counters do not jitter. */
export const numeric = defineToken({
  values: ['tabular'] as const,
  resolve: () => ({ fontVariantNumeric: 'tabular-nums' }),
})

// ── Motion ──────────────────────────────────────────────────────────────

const transitions = {
  colors: 'color .15s, background-color .15s, border-color .15s',
  lift: 'border-color .15s, box-shadow .15s, transform .15s',
  resize: 'max-width 180ms ease',
} as const

export const motion = defineToken({
  values: roles(transitions),
  resolve: (value) => ({ transition: pick(transitions)(value) }),
})

// ── Layout ──────────────────────────────────────────────────────────────

/** Height of the sticky site header; everything pinned below it starts here. */
const headerHeight = 64
/** Clearance for an in-page anchor: the header plus breathing room. */
const anchorOffset = headerHeight + 24

const barHeights = {
  header: headerHeight,
  tabs: 44,
  code: 38,
  status: 32,
} as const

/** Fixed-height strips of chrome. */
export const bar = defineToken({
  values: roles(barHeights),
  resolve: (value) => ({ height: pick(barHeights)(value) }),
})

const measures = {
  site: 1440,
  home: 1200,
  gallery: 1180,
  wide: 1040,
  article: 760,
  headline: 950,
  intro: 660,
  copy: 620,
  lead: 610,
} as const

/** Maximum line and column widths. */
export const measure = defineToken({
  values: roles(measures),
  resolve: (value) => ({ maxWidth: pick(measures)(value) }),
})

const belowHeader = `calc(100vh - ${headerHeight}px)`

const pins = {
  top: { position: 'sticky', top: 0 },
  'below-header': { position: 'sticky', top: headerHeight },
  // A fixed sheet that covers the viewport under the header.
  drawer: {
    position: 'fixed',
    top: headerHeight,
    right: 0,
    bottom: 0,
    left: 0,
  },
} as const

/** Where an element stays while the page scrolls. */
export const pin = defineToken({ values: roles(pins), resolve: pick(pins) })

const fits = {
  'below-header': { height: belowHeader },
  'below-header-max': { maxHeight: belowHeader },
} as const

/** Sizes an element to the viewport that remains under the header. */
export const fit = defineToken({ values: roles(fits), resolve: pick(fits) })

/** Keeps a linked heading clear of the sticky header. */
export const anchor = defineToken({
  values: ['below-header'] as const,
  resolve: () => ({ scrollMarginTop: anchorOffset }),
})

const tracks = {
  single: 'minmax(0, 1fr)',
  halves: '1fr 1fr',
  'even-halves': 'repeat(2, minmax(0, 1fr))',
  thirds: 'repeat(3, minmax(0, 1fr))',
  quarters: 'repeat(4, minmax(0, 1fr))',
  cards: 'repeat(auto-fill, minmax(260px, 1fr))',
  'preview-controls': 'minmax(0, 1fr) minmax(240px, 0.65fr)',
  'steps-source': '0.85fr minmax(0, 1.15fr)',
  'source-preview': 'minmax(0, 0.9fr) minmax(0, 1.1fr)',
} as const

/** Grid column tracks. */
export const columns = defineToken({
  values: roles(tracks),
  resolve: (value) => ({
    display: 'grid',
    gridTemplateColumns: pick(tracks)(value),
  }),
})

const dots = (color: string, size: number) => ({
  backgroundImage: `radial-gradient(${color} 1px, transparent 1px)`,
  backgroundSize: `${size}px ${size}px`,
})

const textures = {
  dots: dots(brand.border, 16),
  'dots-accent': dots('#b8c5ed', 16),
  'dots-wide': dots(brand.divider, 20),
} as const

/** A dotted canvas behind previews. */
export const texture = defineToken({
  values: roles(textures),
  resolve: pick(textures),
})
