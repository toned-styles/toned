type Breakpoints<O> = { __breakpoints: O }

const defineBreakpoints = <O extends Record<string, number | string>>(
  obj: O,
): Breakpoints<O> => {
  return { __breakpoints: obj }
}

// biome-ignore lint/suspicious/noExplicitAny: placeholder declaration
declare const defineSelectors: any
// biome-ignore lint/suspicious/noExplicitAny: placeholder declaration
declare const defineRules: any

/*
 * Rem-based (was px: 480/768/992/1200 — identical at the 16px default root,
 * and the scale now tracks the user's font-size preference the way Tailwind
 * v4's does). sm40 is tw's `sm` (40rem = 640px), which several shadcn rules
 * key on; it slots between sm and md. A scale must keep ONE unit — mixed
 * px/rem ordering inverts under font scaling.
 */
export const breakpoints = defineBreakpoints({
  xs: 0,
  sm: '30rem',
  sm40: '40rem',
  md: '48rem',
  lg: '62rem',
  xl: '75rem',
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
