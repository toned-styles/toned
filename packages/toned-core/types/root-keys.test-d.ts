/**
 * Compile-time contracts for the ROOT keys that address parts: condition
 * blocks and cross-element keys. Their values are related to the root shape,
 * and a relation does not reject unknown keys, so a typo inside
 * `'@md': { Root: { … } }` and a cross key naming a part the sheet does not
 * have would otherwise be accepted silently. `tsc` is the test: every
 * `@ts-expect-error` fails the build if its error disappears.
 */
import { defineSystem, defineToken } from '../system/index.ts'

const gap = defineToken({
  values: [1, 2, 4] as const,
  resolve: (value) => ({ gap: value }),
})
const ui = defineSystem(
  { gap },
  {
    breakpoints: { __breakpoints: { md: 768, lg: 1024 } },
    containers: { card: { sm: 80 } },
    states: { open: "[data-state='open']" },
  },
)

// --- valid root blocks and cross keys ----------------------------------------

const base = ui.stylesheet({
  Root: { gap: 1 },
  Item: { gap: 2 },
  '@md': { Root: { gap: 2, ':hover': { gap: 4 } }, Item: { gap: 1 } },
  '@media lg': { Root: { gap: 4 } },
  '@container card sm': { Item: { gap: 4 } },
  '@card/sm': { Item: { gap: 4 } },
  '@md&card/>=100': { Root: { gap: 1 } },
  '@platform web': { Item: { $style: { opacity: 0.5 } } },
  'Root:hover': { Item: { gap: 4 } },
  'Root~:open': { Item: { gap: 2 } },
  // Undeclared condition names stay open at the root (see
  // type-constraints.test-d.ts); resolution warns and drops them.
  '@nope/>=100': { Root: { gap: 1 } },
})
base.extend({ '@md': { Root: { gap: 4 } }, 'Item:hover': { Root: { gap: 2 } } })

// --- condition blocks walk their parts ---------------------------------------

ui.stylesheet({
  Root: { gap: 1 },
  '@md': {
    // @ts-expect-error — not a token, inside a root breakpoint block
    Root: { gapp: 2 },
  },
})
ui.stylesheet({
  Root: { gap: 1 },
  '@media md': {
    // @ts-expect-error — the `@media` spelling is walked the same way
    Root: { gapp: 2 },
  },
})
ui.stylesheet({
  Root: { gap: 1 },
  '@container card sm': {
    // @ts-expect-error — and the `@container` alias
    Root: { gapp: 2 },
  },
})
ui.stylesheet({
  Root: { gap: 1 },
  '@md&card/>=100': {
    // @ts-expect-error — and a condition expression
    Root: { gapp: 2 },
  },
})
ui.stylesheet({
  Root: { gap: 1 },
  '@platform web': {
    // @ts-expect-error — and a root platform block
    Root: { gapp: 2 },
  },
})
ui.stylesheet({
  Root: { gap: 1 },
  '@md': {
    Root: {
      // @ts-expect-error — nested state blocks inside the root block too
      ':hover': { gapp: 2 },
    },
  },
})
base.extend({
  '@md': {
    // @ts-expect-error — extend() walks its root blocks the same way
    Root: { gapp: 2 },
  },
})

// --- cross-element keys must name a part and a state -------------------------

ui.stylesheet({
  Root: { gap: 1 },
  // @ts-expect-error — `Nope` is not a part of this sheet
  'Nope:hover': { Root: { gap: 2 } },
})
ui.stylesheet({
  Root: { gap: 1 },
  // @ts-expect-error — nor as a sibling-channel source
  'Nope~:open': { Root: { gap: 2 } },
})
ui.stylesheet({
  Root: { gap: 1 },
  // @ts-expect-error — `:nope` is not a declared state
  'Root:hover:nope': { Root: { gap: 2 } },
})
ui.stylesheet({
  Root: { gap: 1 },
  'Root:hover': {
    // @ts-expect-error — the block under a cross key is walked as well
    Root: { gapp: 2 },
  },
})
base.extend({
  // @ts-expect-error — extend() rejects an unknown source part too
  'Nope:hover': { Root: { gap: 2 } },
})
