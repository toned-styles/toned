/**
 * Compile-time contracts for the host-facing type features. This file carries
 * no runtime assertions — `tsc` IS the test (it compiles with the package;
 * every `@ts-expect-error` line fails the build if the error disappears).
 */
import { defineSystem, defineToken } from '../system/index.ts'

const bgColor = defineToken({
  values: ['base', 'accent'] as const,
  resolve: (value) => ({ backgroundColor: value }),
})

// A text-only token: RN has no colour on views, only on Text.
const textColor = defineToken({
  values: ['body', 'faint'] as const,
  resolve: (value) => ({ color: value }),
  $types: ['text'],
})

const system = defineSystem(
  { bgColor, textColor },
  { breakpoints: { __breakpoints: { md: 768 } } },
)

// --- $$type-constrained tokens ----------------------------------------------

system.stylesheet({
  // Untyped elements opt out of enforcement: everything is accepted.
  anything: { bgColor: 'base', textColor: 'body' },
  // A declared view takes view-safe tokens…
  box: { $$type: 'view', bgColor: 'base' },
  // …and a declared text element takes text tokens.
  label: { $$type: 'text', textColor: 'body', bgColor: 'accent' },
})

system.stylesheet({
  box: {
    $$type: 'view',
    // @ts-expect-error — textColor declares $types: ['text']; a view cannot take it
    textColor: 'body',
  },
})

// --- inherit: a text token a View may carry as an inheritable value (§2) ------
// On web this is CSS inheritance (the token emits `color` on the div, which
// descendants inherit); on native the binding turns it into a Text context
// default. Marked `inherit`, it is LEGAL on a view despite $types: ['text'].
const inheritText = defineToken({
  values: ['body', 'faint'] as const,
  resolve: (value) => ({ color: value }),
  $types: ['text'],
  inherit: true,
})
const inheritSys = defineSystem({ bgColor, textColor, inheritText })

inheritSys.stylesheet({
  // A View provides the inheritable text value — legal because inherit: true.
  container: { $$type: 'view', inheritText: 'body' },
  // …and it stays legal on its natural home, a text element.
  label: { $$type: 'text', inheritText: 'faint' },
})

// A non-inherit text token is still forbidden on a view (regression guard).
inheritSys.stylesheet({
  container: {
    $$type: 'view',
    // @ts-expect-error — textColor has no inherit flag; a view cannot take it
    textColor: 'body',
  },
})

// --- '@platform.<name>' keys -------------------------------------------------

system.stylesheet({
  root: {
    bgColor: 'base',
    '@platform.web': { bgColor: 'accent' },
    '@platform.native': { bgColor: 'base' },
  },
})

system.stylesheet({
  root: {
    // @ts-expect-error — not a declared platform
    '@platform.ios': { bgColor: 'accent' },
  },
})

// --- alpha modifier value widening -------------------------------------------

system.stylesheet({ root: { bgColor: 'base' } })
system.stylesheet({
  root: {
    // @ts-expect-error — bgColor declared no alphaChannel, so no '/alpha' form
    bgColor: 'base/50',
  },
})

const washable = defineToken({
  values: ['base'] as const,
  resolve: (value) => ({ backgroundColor: value }),
  alphaChannel: ['backgroundColor'],
})
const washSystem = defineSystem({ washable })
washSystem.stylesheet({ root: { washable: 'base/50' } })

// --- declared states -> ':alias' keys ---------------------------------------
const stateSys = defineSystem(
  { bgColor },
  { states: { open: "[data-state='open']" } },
)
stateSys.stylesheet({
  root: {
    bgColor: 'base',
    ':open': { bgColor: 'accent' },
    ':hover': { bgColor: 'accent' },
  },
})
// (An undeclared state key like ':closed' gets no toggle at runtime — proven
// in stylesheet/variant-pseudo.test.ts; excess-property checking through this
// deep intersection is unreliable, so it is asserted at runtime, not here.)

export {}
