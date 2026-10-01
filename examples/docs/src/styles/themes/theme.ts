/**
 * What a theme has to supply. Tokens read these fields and nothing else, so a
 * theme that satisfies this type can restyle every stylesheet in the showcase.
 *
 * Every value is a CSS value: on the web each field becomes one custom
 * property, and the generated classes refer to it.
 */
export type Theme = {
  // ── Colour ────────────────────────────────────────────────────────────
  /** Behind the window. A full `background`, so it may be a gradient. */
  stage: string
  surface: string
  raised: string
  sunken: string
  /** Menus, dialogs and toasts. */
  overlay: string
  ink: string
  inkStrong: string
  inkMuted: string
  accent: string
  accentHover: string
  onAccent: string
  neutral: string
  neutralHover: string
  onNeutral: string
  danger: string
  dangerHover: string
  onDanger: string
  selected: string
  onSelected: string
  /** A row or quiet control under the pointer. */
  hover: string
  bar: string
  onBar: string
  head: string
  onHead: string
  ok: string
  onOk: string
  warn: string
  onWarn: string
  bad: string
  onBad: string
  line: string
  lineStrong: string
  /** The border of a control that is filled with `accent` or `danger`. */
  lineFilled: string
  track: string
  /** The filled part of a progress bar. A full `background`. */
  meter: string
  scrim: string

  // ── Type ──────────────────────────────────────────────────────────────
  fontBody: string
  fontDisplay: string
  fontData: string
  sizeBody: string
  sizeSmall: string
  sizeTitle: string
  sizeDisplay: string
  weightBody: string
  weightStrong: string
  weightDisplay: string
  leading: string
  /** `text-transform` for titles and controls. */
  caps: string
  labelCase: string
  labelTracking: string
  displayStyle: string
  smoothing: string

  // ── Shape ─────────────────────────────────────────────────────────────
  radiusControl: string
  radiusPanel: string
  radiusPill: string
  /** A panel's top edge, and its other three: a theme may rule one edge only. */
  panelRule: string
  panelBorder: string
  panelBorderStyle: string
  controlBorder: string
  /** A field's bottom edge, and its other three. */
  fieldRule: string
  fieldBorder: string
  controlBorderStyle: string
  ruleWidth: string
  ruleStyle: string
  /** A complete `outline` for keyboard focus. */
  focusRing: string
  focusOffset: string

  // ── Depth ─────────────────────────────────────────────────────────────
  shadowPanel: string
  shadowControl: string
  shadowOverlay: string
  /** The frame around the whole interface. */
  shadowWindow: string
  /** `backdrop-filter` for surfaces. */
  blur: string

  // ── Density ───────────────────────────────────────────────────────────
  /** One spacing step; `gap: 3` is three of these. */
  unit: string
  controlHeight: string

  // ── Motion ────────────────────────────────────────────────────────────
  duration: string
  easing: string
  /** `transform` while a control is held down. */
  press: string

  // ── Structure ─────────────────────────────────────────────────────────
  /** `display` for the window's title and status bars. */
  titleBar: string
  statusBar: string
  /** `content` around a button label and before the selected list item. */
  buttonOpen: string
  buttonClose: string
  bullet: string
}
