type Breakpoints<O> = { __breakpoints: O }

const defineBreakpoints = <O extends Record<string, number>>(
  obj: O,
): Breakpoints<O> => {
  return { __breakpoints: obj }
}

// biome-ignore lint/suspicious/noExplicitAny: placeholder declaration
declare const defineSelectors: any
// biome-ignore lint/suspicious/noExplicitAny: placeholder declaration
declare const defineRules: any

export const breakpoints = defineBreakpoints({
  '@xs': 0,
  '@sm': 480,
  '@md': 768,
  '@lg': 992,
  '@xl': 1200,
})

// introduce platform-specific conditionals? eg 'platform.web' or `$$web` with configuration

// web only? should we support it at all?
// export const selectors = defineSelectors({
//   hover: '&:hover',
//   focus: '&:focus',
//   active: '&:active',
// })

// need to make sure it's supported in react native too?
// see features in https://github.com/ericf/css-mediaquery/blob/c87f3c818162225d9f4d5d19a897156b3014663b/index.js#L42-L80
// export const rules = defineRules({
//   print: '@media print',
//   dark: '@media (prefers-color-scheme: dark)',
//   light: '@media (prefers-color-scheme: light)',
//   reducedMotion: '@media (prefers-reduced-motion)',
//   supportsNesting: '@supports selector(&)',
// })

// export const hover = defineSelector('&:hover')
// export const focus = defineSelector('&:focus')
