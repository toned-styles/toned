import { defineSystem, defineToken } from '../system/definers.ts'
const ui = defineSystem(
  { paint: defineToken({ values: ['base', 'accent'], resolve: v => ({ backgroundColor: v }) }) },
  {
    breakpoints: { __breakpoints: { md: 768 } },
    containers: { field: { wide: 400 }, card: { narrow: 200 } },
    states: { open: '[data-open]' },
  },
)
const { q } = ui
ui.stylesheet({
  Root: {
    $kind: 'view',
    $style: { opacity: 0 },
    [q.media('md')]: { [q.state('hover')]: { paint: 'accent' } },
    '@container field wide': { paint: 'base' },
    '@platform web': {
      $style: { position: 'sticky' },
      ':hover': { $style: { position: 'fixed' } },
    },
    '@platform native': { $style: { paddingHorizontal: 12 } },
  },
})
ui.stylesheet(q => ({
  Root: { $kind: 'text', [q.media('md')]: { paint: 'accent' }, $style: { fontSize: 12 } },
}))
// @ts-expect-error unknown media
q.media('mdd')
// @ts-expect-error unknown state
q.state('hovver')
// @ts-expect-error conditions belong to their container
q.container('field', 'narrow')
// @ts-expect-error unsupported host
q.platform('ios')
ui.stylesheet({
  Root: {
    // @ts-expect-error portable style cannot promise sticky on native
    $style: { position: 'sticky' },
  },
})
ui.stylesheet({
  Root: {
    // @ts-expect-error native-only shorthand needs a platform gate
    $style: { paddingHorizontal: 12 },
  },
})
ui.stylesheet({
  Root: {
    [q.media('md')]: {
      // @ts-expect-error recursive token typo
      piant: 'accent',
    },
  },
})
ui.stylesheet({
  Root: {
    [q.state('hover')]: { paint: 'accent' },
    // @ts-expect-error computed atom must preserve typo checking
    piant: 'accent',
  },
})
ui.stylesheet({
  Root: {
    '@platform native': {
      // @ts-expect-error web-only native style
      $style: { position: 'sticky' },
    },
  },
})
ui.stylesheet({
  Root: {
    '@platform web': {
      // @ts-expect-error contradictory platform nesting
      '@platform native': { paint: 'base' },
    },
  },
})
ui.stylesheet({
  Root: {
    $kind: 'view',
    ':hover': {
      // @ts-expect-error kind is static
      $kind: 'text',
    },
  },
})
ui.stylesheet({
  Root: {
    // @ts-expect-error structured advanced predicates are not element keys
    [q.all(q.media('md'))]: { paint: 'base' },
    // @ts-expect-error even beside an invalid advanced key ordinary typos are rejected
    piant: 'accent',
  },
})

const textOnly = defineToken({
  values: ['body'],
  $types: ['text'],
  resolve: value => ({ color: value }),
})
const canonical = defineSystem({ id: 'canonical', tokens: { textOnly } })
canonical.stylesheet({
  Root: {
    // @ts-expect-error canonical systems default to a view, so text-only tokens require an explicit text kind
    textOnly: 'body',
  },
})
const textSheet = canonical.stylesheet({ Label: { $kind: 'text', textOnly: 'body' } })
// @ts-expect-error variants inherit the declared static kind
textSheet.variants<{ open: boolean }>(($, q) => ({
  [$.open(true)]: { Label: { [q.state('hover')]: { textOnly: 'body' }, $kind: 'view' } },
}))
const invalidPortable = {
  id: 'portable',
  tokens: {},
  conditions: { containers: { field: { wide: '25rem' } } },
} as const
// @ts-expect-error portable system thresholds cannot depend on font metrics
defineSystem(invalidPortable)
// @ts-expect-error all requires known atoms rather than arbitrary strings
q.all('@unknown')

const simple = ui.stylesheet({ Root: { paint: 'base' } })
simple.when(q.all(q.media('md'), q.part('Root').state('hover')), { Root: { paint: 'accent' } })
simple.when(q.all(q.media('md')), {
  Root: {
    // @ts-expect-error advanced rule maps retain token typo checks
    piant: 'accent',
  },
})
simple.when(q.all(q.media('md')), {
  // @ts-expect-error advanced rule maps only address declared parts
  Nope: { paint: 'accent' },
})

const flexible = defineToken({
  values: ['auto'],
  dynamic: 'number',
  properties: ['width'],
  resolve: value => ({ width: value }),
})
const flexibleSystem = defineSystem({ flexible })
flexibleSystem.stylesheet({ Root: { flexible: 17 } })
flexibleSystem.stylesheet({
  Root: {
    // @ts-expect-error the explicit dynamic input is numeric, not arbitrary text
    flexible: 'oops',
  },
})
simple.variants<{ open: boolean }>(($, q) =>
  // @ts-expect-error checked variant return rejects excess token keys
  q.rules({ [$.open(true)]: { Root: { [q.state('hover')]: { paint: 'base' }, piant: 'accent' } } }),
)

simple.variants<{ open: boolean }>(($, q) =>
  q.rules({ [$.open(true)]: { Root: { [q.state('hover')]: { paint: 'accent' } } } }),
)

simple.variants<{ open: boolean }>()(($, q) => ({
  [$.open(true)]: { Root: { [q.state('hover')]: { paint: 'accent' } } },
}))
// @ts-expect-error the canonical inferred callback rejects an excess token beside a computed atom
simple.variants<{ open: boolean }>()(($, q) => ({
  [$.open(true)]: { Root: { [q.state('hover')]: { paint: 'base' }, piant: 'accent' } },
}))
// @ts-expect-error unknown nested properties are checked recursively
simple.variants<{ open: boolean }>()(($, q) => ({
  [$.open(true)]: { Root: { [q.state('hover')]: { piant: 'base' } } },
}))
// @ts-expect-error wrong token values are checked through the canonical factory
simple.variants<{ open: boolean }>()($ => ({ [$.open(true)]: { Root: { paint: 'typo' } } }))

ui.stylesheet({
  Text: {
    $kind: 'text',
    $style: {
      // @ts-expect-error unitless CSS lineHeight and native logical lengths are not the same contract
      lineHeight: 1.5,
    },
  },
})
ui.stylesheet({
  Text: {
    $kind: 'text',
    $style: {
      // @ts-expect-error auto is a native-only alignment value
      textAlign: 'auto',
    },
  },
})
ui.stylesheet({
  Root: {
    $style: {
      // @ts-expect-error shorthand flex has incompatible numeric semantics
      flex: 1,
    },
  },
})
ui.stylesheet({
  Text: {
    $kind: 'text',
    '@platform web': { $style: { lineHeight: 1.5 } },
    '@platform native': { $style: { lineHeight: 18 } },
  },
})
const mediaNamed = defineSystem({
  id: 'media-named',
  tokens: {},
  conditions: { media: { md: 400 }, containers: { card: { wide: 400 } } },
})
mediaNamed.stylesheet(q => ({ Root: { [q.media('md')]: { $style: { opacity: 0 } } } }))
