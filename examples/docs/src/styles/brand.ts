/**
 * The site's one palette and type scale. Every page — homepage, docs,
 * playground, gallery — reads these values so the whole site feels like one
 * product. Stylesheets reference them through `$style`/`@platform web`.
 */
export const brand = {
  ink: '#17234b',
  body: '#34405f',
  muted: '#5d6784',
  faint: '#8a93ad',
  blue: '#284bdd',
  blueHover: '#203cb2',
  blueSoft: '#edf1ff',
  blueTint: '#f4f6ff',
  page: '#fbfcff',
  surface: '#ffffff',
  border: '#dce2f4',
  divider: '#e8ecf6',
  codeBg: '#f7f8fd',
  codeInk: '#24305a',
  danger: '#b3261e',
  dangerSoft: '#fdecea',
  success: '#1d7a4c',
} as const

export const fonts = {
  sans: '"Avenir Next", Avenir, "Segoe UI", system-ui, sans-serif',
  mono: '"SF Mono", ui-monospace, "Cascadia Code", "JetBrains Mono", Menlo, monospace',
} as const

/** Height of the sticky site header, shared by sticky offsets below it. */
export const headerHeight = 64
