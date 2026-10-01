import { defineToken, defineTokenFor, type WebInlineStyle } from '@toned/core'
import type { Theme } from './theme.ts'

/**
 * The showcase's vocabulary. Stylesheets name a role (`fill: 'raised'`,
 * `edge: 'panel'`); each resolver reads the active theme to decide what that
 * role looks like. `defineTokenFor<Theme>()` limits a resolver to fields the
 * theme schema declares.
 */
const token = defineTokenFor<Theme, WebInlineStyle>()

/** Rules for pseudo-elements, keyed by the selector suffix. */
type PseudoRules = Record<string, Record<string, string | number>>

const roles = <const Map extends Record<string, unknown>>(map: Map) =>
  Object.keys(map) as Array<keyof Map & string>

/** `n` spacing steps of the theme's unit. */
const steps = (theme: Theme, n: number) => `calc(${theme.unit} * ${n})`
const scale = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8] as const

// ── Colour ──────────────────────────────────────────────────────────────

const fills = {
  stage: 'stage',
  surface: 'surface',
  raised: 'raised',
  sunken: 'sunken',
  overlay: 'overlay',
  accent: 'accent',
  'accent-hover': 'accentHover',
  neutral: 'neutral',
  'neutral-hover': 'neutralHover',
  danger: 'danger',
  'danger-hover': 'dangerHover',
  selected: 'selected',
  hover: 'hover',
  bar: 'bar',
  head: 'head',
  ok: 'ok',
  warn: 'warn',
  bad: 'bad',
  track: 'track',
  meter: 'meter',
  ink: 'ink',
} as const satisfies Record<string, keyof Theme>

/** Background, by role. */
export const fill = token({
  values: [...roles(fills), 'none'],
  resolve: (value, theme) => ({
    background: value === 'none' ? 'transparent' : theme[fills[value]],
  }),
})

const inks = {
  default: 'ink',
  strong: 'inkStrong',
  muted: 'inkMuted',
  accent: 'accent',
  'on-accent': 'onAccent',
  'on-neutral': 'onNeutral',
  danger: 'danger',
  'on-danger': 'onDanger',
  'on-selected': 'onSelected',
  'on-bar': 'onBar',
  'on-head': 'onHead',
  'on-ok': 'onOk',
  'on-warn': 'onWarn',
  'on-bad': 'onBad',
  surface: 'surface',
} as const satisfies Record<string, keyof Theme>

/** Text and icon colour, by role. */
export const ink = token({
  values: roles(inks),
  resolve: (value, theme) => ({ color: theme[inks[value]] }),
})

// ── Shape ───────────────────────────────────────────────────────────────

/** Which outline a part carries. The theme chooses width, style and colour. */
export const edge = token({
  values: [
    'panel',
    'control',
    'filled',
    'field',
    'rule',
    'side',
    'cutout',
    'none',
  ],
  resolve: (value, theme) => {
    if (value === 'panel')
      return {
        borderTopWidth: theme.panelRule,
        borderRightWidth: theme.panelBorder,
        borderBottomWidth: theme.panelBorder,
        borderLeftWidth: theme.panelBorder,
        borderStyle: theme.panelBorderStyle,
        borderColor: theme.line,
      }
    if (value === 'field')
      return {
        borderTopWidth: theme.fieldBorder,
        borderRightWidth: theme.fieldBorder,
        borderBottomWidth: theme.fieldRule,
        borderLeftWidth: theme.fieldBorder,
        borderStyle: theme.controlBorderStyle,
        borderColor: theme.lineStrong,
      }
    if (value === 'control' || value === 'filled')
      return {
        borderWidth: theme.controlBorder,
        borderStyle: theme.controlBorderStyle,
        borderColor: value === 'filled' ? theme.lineFilled : theme.lineStrong,
      }
    // A divider under a row, or beside a column.
    if (value === 'rule' || value === 'side')
      return {
        borderWidth:
          value === 'rule'
            ? `0 0 ${theme.ruleWidth} 0`
            : `0 ${theme.ruleWidth} 0 0`,
        borderStyle: theme.ruleStyle,
        borderColor: theme.line,
      }
    // Separates overlapping avatars from each other.
    if (value === 'cutout')
      return {
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: theme.surface,
      }
    return { borderWidth: 0, borderStyle: 'none', borderColor: 'transparent' }
  },
})

export const corner = token({
  values: ['control', 'panel', 'pill', 'none'],
  resolve: (value, theme) => ({
    borderRadius:
      value === 'control'
        ? theme.radiusControl
        : value === 'panel'
          ? theme.radiusPanel
          : value === 'pill'
            ? theme.radiusPill
            : 0,
  }),
})

export const depth = token({
  values: ['panel', 'control', 'overlay', 'window', 'none'],
  resolve: (value, theme) => ({
    boxShadow:
      value === 'panel'
        ? theme.shadowPanel
        : value === 'control'
          ? theme.shadowControl
          : value === 'overlay'
            ? theme.shadowOverlay
            : value === 'window'
              ? theme.shadowWindow
              : 'none',
  }),
})

/** What a translucent surface does to whatever is behind it. */
export const frost = token({
  values: ['surface'],
  resolve: (_value, theme) => ({
    backdropFilter: theme.blur,
    WebkitBackdropFilter: theme.blur,
  }),
})

// ── Type ────────────────────────────────────────────────────────────────

export const type = token({
  values: ['body', 'small', 'label', 'control', 'title', 'display', 'data'],
  resolve: (value, theme) => {
    if (value === 'small') return { fontSize: theme.sizeSmall }
    if (value === 'label')
      return {
        fontSize: theme.sizeSmall,
        fontWeight: theme.weightStrong,
        textTransform: theme.labelCase,
        letterSpacing: theme.labelTracking,
      }
    if (value === 'control')
      return {
        fontFamily: theme.fontBody,
        fontSize: theme.sizeBody,
        fontWeight: theme.weightStrong,
        lineHeight: theme.leading,
        textTransform: theme.caps,
      }
    if (value === 'title')
      return {
        fontFamily: theme.fontDisplay,
        fontSize: theme.sizeTitle,
        fontWeight: theme.weightStrong,
        textTransform: theme.caps,
        lineHeight: 1.25,
      }
    if (value === 'display')
      return {
        fontFamily: theme.fontDisplay,
        fontSize: theme.sizeDisplay,
        fontWeight: theme.weightDisplay,
        fontStyle: theme.displayStyle,
        textTransform: theme.caps,
        lineHeight: 1.1,
      }
    if (value === 'data')
      return {
        fontFamily: theme.fontData,
        fontVariantNumeric: 'tabular-nums',
      }
    return {
      fontFamily: theme.fontBody,
      fontSize: theme.sizeBody,
      fontWeight: theme.weightBody,
      lineHeight: theme.leading,
      WebkitFontSmoothing: theme.smoothing,
    }
  },
})

export const weight = token({
  values: ['strong'],
  resolve: (_value, theme) => ({ fontWeight: theme.weightStrong }),
})

// ── Density ─────────────────────────────────────────────────────────────

export const gap = token({
  values: scale,
  resolve: (value, theme) => ({ gap: steps(theme, value) }),
})

export const pad = token({
  values: scale,
  resolve: (value, theme) => ({ padding: steps(theme, value) }),
})

export const padX = token({
  values: scale,
  resolve: (value, theme) => ({ paddingInline: steps(theme, value) }),
})

export const padY = token({
  values: scale,
  resolve: (value, theme) => ({ paddingBlock: steps(theme, value) }),
})

/** Fixed sizes that follow the theme's control height or spacing unit. */
export const size = token({
  values: [
    'control',
    'square',
    'avatar',
    'box',
    'switch',
    'thumb',
    'meter',
    'swatch',
  ],
  resolve: (value, theme) => {
    const square = (side: string) => ({
      width: side,
      height: side,
      flexShrink: 0,
    })
    if (value === 'control') return { minHeight: theme.controlHeight }
    // At least square: a theme may still draw brackets around the icon.
    if (value === 'square')
      return {
        minWidth: theme.controlHeight,
        height: theme.controlHeight,
        flexShrink: 0,
      }
    if (value === 'avatar') return square(steps(theme, 7))
    if (value === 'box') return square(steps(theme, 4.5))
    if (value === 'thumb') return square(steps(theme, 4))
    if (value === 'swatch') return square(steps(theme, 3))
    if (value === 'switch')
      return { width: steps(theme, 10), height: steps(theme, 6), flexShrink: 0 }
    return { height: steps(theme, 2) }
  },
})

/** Pulls an avatar over the one before it. */
export const overlap = token({
  values: ['avatar'],
  resolve: (_value, theme) => ({ marginInlineStart: steps(theme, -1) }),
})

// ── Motion ──────────────────────────────────────────────────────────────

export const motion = token({
  values: ['themed'],
  resolve: (_value, theme) => ({
    transitionProperty:
      'background, color, border-color, box-shadow, transform, opacity',
    transitionDuration: theme.duration,
    transitionTimingFunction: theme.easing,
  }),
})

/** How a control moves while it is held down. */
export const press = token({
  values: ['down'],
  resolve: (_value, theme) => ({ transform: theme.press }),
})

/** Moves a switch's thumb to its on position. */
export const slide = token({
  values: ['on', 'off'],
  resolve: (value, theme) => ({
    transform: value === 'on' ? `translateX(${steps(theme, 4)})` : 'none',
  }),
})

export const focus = token({
  values: ['ring'],
  resolve: (_value, theme) => ({
    outline: theme.focusRing,
    outlineOffset: theme.focusOffset,
  }),
})

// ── Structure ───────────────────────────────────────────────────────────

/**
 * Parts that exist in some themes only. The theme supplies the `display`
 * value, so a stylesheet can declare a title bar without knowing which themes
 * draw one.
 */
export const chrome = token({
  values: ['title-bar', 'status-bar'],
  resolve: (value, theme) => ({
    display: value === 'title-bar' ? theme.titleBar : theme.statusBar,
  }),
})

/** Text a theme draws around a part: `[ Save ]`, or a marker on the selection. */
export const affix = token({
  values: ['button', 'bullet'],
  resolve: () => ({}),
  pseudoRules: (value, theme): PseudoRules =>
    value === 'button'
      ? {
          '::before': { content: theme.buttonOpen },
          '::after': { content: theme.buttonClose },
        }
      : { '::before': { content: theme.bullet } },
})

const sliderTrack = (theme: Theme) => ({
  height: steps(theme, 2),
  background: theme.track,
  borderRadius: theme.radiusPill,
})

const sliderThumb = (theme: Theme) => ({
  appearance: 'none',
  width: steps(theme, 4.5),
  height: steps(theme, 4.5),
  background: theme.accent,
  borderWidth: theme.controlBorder,
  borderStyle: theme.controlBorderStyle,
  borderColor: theme.lineStrong,
  borderRadius: theme.radiusPill,
  boxShadow: theme.shadowControl,
})

/**
 * Surfaces the browser draws and no element can stand in for: the parts of a
 * range input, the dialog backdrop and the text selection.
 */
export const native = token({
  values: ['slider', 'dialog', 'selection'],
  resolve: (value) =>
    value === 'slider' ? { appearance: 'none', background: 'transparent' } : {},
  pseudoRules: (value, theme): PseudoRules => {
    if (value === 'slider')
      return {
        '::-webkit-slider-runnable-track': sliderTrack(theme),
        '::-moz-range-track': sliderTrack(theme),
        '::-webkit-slider-thumb': {
          ...sliderThumb(theme),
          // Centres the thumb on the thinner track.
          marginTop: steps(theme, -1.25),
        },
        '::-moz-range-thumb': sliderThumb(theme),
      }
    if (value === 'dialog') return { '::backdrop': { background: theme.scrim } }
    return {
      ' ::selection': { background: theme.ink, color: theme.surface },
    }
  },
})

// ── Layout ──────────────────────────────────────────────────────────────
// Arrangement does not change with the theme, so these read no theme fields.

const flows = {
  row: { display: 'flex', flexDirection: 'row' },
  column: { display: 'flex', flexDirection: 'column' },
  wrap: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
  inline: { display: 'inline-flex', flexDirection: 'row' },
  block: { display: 'block' },
  cell: { display: 'table-cell' },
  hidden: { display: 'none' },
} as const

export const flow = defineToken({
  values: roles(flows),
  resolve: (value) => flows[value],
})

const alignments = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
} as const

export const align = defineToken({
  values: roles(alignments),
  resolve: (value) => ({ alignItems: alignments[value] }),
})

const justifications = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
} as const

export const justify = defineToken({
  values: roles(justifications),
  resolve: (value) => ({ justifyContent: justifications[value] }),
})

const flexes = {
  // Takes the remaining room, and may shrink below its content.
  fill: { flexGrow: 1, flexShrink: 1, flexBasis: '0%', minWidth: 0 },
  fixed: { flexGrow: 0, flexShrink: 0 },
  full: { width: '100%' },
  tall: { height: '100%' },
} as const

export const flex = defineToken({
  values: roles(flexes),
  resolve: (value) => flexes[value],
})

const grids = {
  stats: 'repeat(auto-fit, minmax(150px, 1fr))',
  fields: 'repeat(auto-fit, minmax(200px, 1fr))',
  chart: 'repeat(12, minmax(0, 1fr))',
} as const

export const tracks = defineToken({
  values: roles(grids),
  resolve: (value) => ({
    display: 'grid',
    gridTemplateColumns: grids[value],
  }),
})

const measures = {
  window: 1120,
  sidebar: 208,
  dialog: 440,
  menu: 200,
  chart: 96,
  meter: 64,
  percent: '4ch',
} as const

export const measure = defineToken({
  values: roles(measures),
  resolve: (value) =>
    value === 'chart'
      ? { height: measures.chart }
      : value === 'window'
        ? { width: '100%', maxWidth: measures.window }
        : value === 'meter' || value === 'percent'
          ? { minWidth: measures[value] }
          : value === 'dialog'
            ? { width: measures.dialog, maxWidth: 'calc(100vw - 32px)' }
            : value === 'menu'
              ? { minWidth: measures.menu }
              : { width: measures.sidebar, flexShrink: 0 },
})

const placements = {
  origin: { position: 'relative' },
  menu: { position: 'absolute', top: '100%', right: 0, zIndex: 3 },
  toast: { position: 'absolute', right: 16, bottom: 16, zIndex: 2 },
  // A select's arrow, over the control's trailing edge.
  chevron: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
} as const

/** Where a part sits relative to the part that owns it. */
export const place = defineToken({
  values: roles(placements),
  resolve: (value) => placements[value],
})

const overflows = {
  clip: { overflow: 'hidden' },
  'scroll-x': { overflowX: 'auto' },
  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nowrap: { whiteSpace: 'nowrap' },
} as const

export const overflow = defineToken({
  values: roles(overflows),
  resolve: (value) => overflows[value],
})

export const textAlign = defineToken({
  values: ['left', 'center', 'right'] as const,
  resolve: (value) => ({ textAlign: value }),
})

/** Resets a native control so the tokens above decide how it looks. */
export const reset = defineToken({
  values: ['control', 'table', 'dialog', 'list'] as const,
  resolve: (value) =>
    value === 'control'
      ? { appearance: 'none', margin: 0, cursor: 'pointer' }
      : value === 'table'
        ? { borderCollapse: 'collapse', width: '100%' }
        : value === 'dialog'
          ? { margin: 'auto', maxHeight: 'calc(100vh - 32px)' }
          : { listStyle: 'none', margin: 0 },
})
