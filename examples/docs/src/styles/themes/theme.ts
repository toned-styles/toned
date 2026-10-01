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
  /** The window. A full `background`. */
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
  /** A `background-image` laid over `accent` and `danger`: light on a filled control. */
  sheen: string
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
  /** The border of a panel. */
  line: string
  /** The border of a control. */
  lineStrong: string
  /** The border of a control that is filled with `accent` or `danger`. */
  lineFilled: string
  /** A divider between rows or columns. */
  rule: string
  /** The ring that separates overlapping avatars. */
  cutout: string
  track: string
  /** The filled part of a progress bar. A full `background`. */
  meter: string
  /** The well of a segmented control, and its selected option. */
  tray: string
  thumb: string
  onThumb: string
  /** The handle of a switch and of a slider. */
  knob: string
  /** The well behind the tabs, and the selected tab. */
  tabTray: string
  tabSelected: string
  onTabSelected: string
  /** The line under the selected tab, for themes that underline it. */
  tabIndicator: string
  /** Chart bars other than the newest one, which takes `accent`. */
  chart: string
  caret: string
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
  displayTracking: string
  smoothing: string

  // ── Shape ─────────────────────────────────────────────────────────────
  radiusControl: string
  /** A part nested inside a control: a segment in its tray, a tab in its well. */
  radiusInner: string
  radiusTab: string
  radiusTabTray: string
  radiusPanel: string
  radiusWindow: string
  radiusAppBar: string
  radiusBadge: string
  radiusPill: string
  radiusChart: string
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
  /** The line under the app bar. */
  barRule: string
  /** The thickness of the line under the selected tab. */
  tabRule: string
  meterHeight: string
  /** A complete `outline` for keyboard focus. */
  focusRing: string
  focusOffset: string

  // ── Depth ─────────────────────────────────────────────────────────────
  shadowPanel: string
  /** A checkbox, a switch track. */
  shadowControl: string
  shadowButton: string
  shadowField: string
  shadowThumb: string
  shadowKnob: string
  /** The current navigation item, project and tab. */
  shadowSelected: string
  shadowAppBar: string
  /** The well behind the tabs; themes that underline tabs draw the rule here. */
  shadowTabTray: string
  shadowOverlay: string
  /** The frame around the whole interface. */
  shadowWindow: string
  /** `backdrop-filter` for the window and for overlays. */
  blur: string

  // ── Density ───────────────────────────────────────────────────────────
  /** One spacing step; `gap: 3` is three of these. */
  unit: string
  controlHeight: string
  /** The space around the app bar: a theme may float it inside the window. */
  barInset: string
  tabTrayPad: string
  /** `align-self` for the tab list: across the column, or as wide as its tabs. */
  tabTrayAlign: string

  // ── Motion ────────────────────────────────────────────────────────────
  duration: string
  easing: string
  /** `transform` while a control is held down. */
  press: string
  disabledOpacity: string

  // ── Structure ─────────────────────────────────────────────────────────
  /** `display` for the window's title and status bars. */
  titleBar: string
  statusBar: string
  /** `content` around a button label and before the selected list item. */
  buttonOpen: string
  buttonClose: string
  bullet: string
  /** `content` after the page title: a text-mode cursor. */
  cursor: string
  /** `shape-rendering` for icons: a pixel theme turns smoothing off. */
  iconRendering: 'auto' | 'crispEdges'
}
