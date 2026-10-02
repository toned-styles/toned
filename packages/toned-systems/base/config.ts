type Breakpoints<O> = { __breakpoints: O }

const defineBreakpoints = <O extends Record<string, number | string>>(
  obj: O,
): Breakpoints<O> => {
  return { __breakpoints: obj }
}

/*
 * Rem-based (480/768/992/1200px at the 16px default root), so the scale tracks
 * the user's font-size preference the way Tailwind v4's does. sm40 is
 * Tailwind's `sm` (40rem = 640px), which several shadcn rules key on; it slots
 * between sm and md. A scale must keep ONE unit — mixed px/rem ordering
 * inverts under font scaling.
 */
export const breakpoints = defineBreakpoints({
  xs: 0,
  sm: '30rem',
  sm40: '40rem',
  md: '48rem',
  lg: '62rem',
  xl: '75rem',
})
