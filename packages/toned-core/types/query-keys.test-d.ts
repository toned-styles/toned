import { defineSystem, defineToken, type Variants } from '../index.ts'
const ui = defineSystem(
  {
    paint: defineToken({
      values: ['base', 'accent'],
      resolve: (color) => ({ color }),
    }),
  },
  {
    breakpoints: { __breakpoints: { md: 768 } },
    states: { open: '[data-open]' },
  },
)
const { q } = ui
const sheet = ui.stylesheet((q) => ({
  Root: {
    paint: 'base',
    [q.all(q.media('md'), q.state('hover'))]: { paint: 'accent' },
  },
  Label: { $kind: 'text', $style: { fontSize: 12 } },
  [q.any(q.part('Root').state('hover'), q.not(q.media('md')))]: {
    Root: { paint: 'base' },
  },
  [q.part('Root').has('Label', 'open')]: { Root: { paint: 'accent' } },
}))
sheet.variants(($: Variants<{ size: 's' | 'm' }>, q) => ({
  [q.all($.size('s'), q.media('md'))]: { Root: { paint: 'accent' } },
  [$.size('m')]: {
    [q.not(q.part('Root').state('hover'))]: { Label: { paint: 'base' } },
    Root: { [q.all(q.state('hover'), q.media('md'))]: { paint: 'accent' } },
  },
}))
ui.stylesheet({
  Root: {
    [q.all(q.media('md'))]: {
      // @ts-expect-error nested token typo
      paaint: 'accent',
    },
  },
})
ui.stylesheet({
  Root: {
    // @ts-expect-error source part is validated after base names are inferred
    [q.part('Missing').has('Root', 'open')]: { paint: 'accent' },
  },
})
ui.stylesheet({
  Root: {},
  // @ts-expect-error target part is validated after base names are inferred
  [q.part('Root').has('Missing', 'open')]: { Root: { paint: 'accent' } },
})
ui.stylesheet({
  Root: {
    [q.all(q.media('md'))]: {
      // @ts-expect-error platform algebra does not widen portable host styles
      $style: { position: 'sticky' },
    },
    [q.platform('web')]: {
      [q.all(q.media('md'))]: { $style: { position: 'sticky' } },
    },
  },
})
// @ts-expect-error variant query blocks retain exact declaration checking
sheet.variants(($: Variants<{ size: 's' }>, q) => ({
  [$.size('s')]: { [q.all(q.media('md'))]: { Root: { paaint: 'accent' } } },
}))
ui.stylesheet({
  Root: {},
  // @ts-expect-error local state has no owner at the sheet root
  [q.all(q.state('hover'))]: { Root: { paint: 'accent' } },
})
// @ts-expect-error local state has no owner at a variant rule root
sheet.variants(($: Variants<{ size: 's' }>, q) => ({
  [$.size('s')]: { [q.all(q.state('hover'))]: { Root: { paint: 'accent' } } },
}))
const canonical = defineSystem({ id: 'query-kinds', tokens: {} })
// @ts-expect-error view part does not accept text-only styles through a root query
canonical.stylesheet((q) => ({
  Root: {},
  Label: { $kind: 'text' },
  [q.not(q.platform('native'))]: {
    Root: { $style: { fontSize: 12 } },
    Label: { $style: { fontSize: 12 } },
  },
}))
declare const selector: Variants<{ size: 's' | 'm' }>
const canonicalKey = q.all(selector.size('s'), q.not(q.media('md')))
const exactKey: '@query a:[size=s]|a:@md|not|all:2|' = canonicalKey
void exactKey
