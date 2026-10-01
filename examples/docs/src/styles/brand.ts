/**
 * The site's raw palette and font stacks.
 *
 * Stylesheets never read this file: `tokens.ts` gives each value a role
 * (`text: 'muted'`, `fill: 'surface'`) and sheets name the role. The values
 * live here because two consumers cannot read Toned tokens — the Shiki theme
 * in `highlight.ts` and the CodeMirror theme in the playground editor.
 */
export const brand = {
  ink: '#17234b',
  body: '#34405f',
  muted: '#5d6784',
  faint: '#8a93ad',
  blue: '#284bdd',
  blueHover: '#203cb2',
  blueLine: '#bac8ff',
  blueWash: '#dce4ff',
  blueSoft: '#edf1ff',
  blueTint: '#f4f6ff',
  page: '#fbfcff',
  pageGlass: '#fbfcffe6',
  surface: '#ffffff',
  sunken: '#f8faff',
  border: '#dce2f4',
  borderStrong: '#c3cced',
  divider: '#e8ecf6',
  codeBg: '#f7f8fd',
  codeChrome: '#f2f4fb',
  codeInk: '#24305a',
  danger: '#b3261e',
  dangerStrong: '#7d1a14',
  dangerSoft: '#fdecea',
  dangerLine: '#f3c9c4',
  success: '#1d7a4c',
  successSoft: '#eaf6ef',
  successLine: '#cde9d8',
  warning: '#a04a12',
  warningSoft: '#fdf1e7',
} as const

export const fonts = {
  sans: '"Avenir Next", Avenir, "Segoe UI", system-ui, sans-serif',
  mono: '"SF Mono", ui-monospace, "Cascadia Code", "JetBrains Mono", Menlo, monospace',
} as const

/** Metrics shared by the playground's static code and CodeMirror. */
export const editorMetrics = {
  fontSize: 13,
  lineHeight: 20,
  paddingY: 16,
  paddingX: 16,
} as const
