/**
 * Compile-time contracts for the host-facing type features. This file carries
 * no runtime assertions — `tsc` IS the test (it compiles with the package;
 * every `@ts-expect-error` line fails the build if the error disappears).
 */
import { defineSystem, defineToken } from '../system/index.ts'

const bgColor = defineToken({
  values: ['base', 'accent'] as const,
  resolve: value => ({ backgroundColor: value }),
})

// A text-only token: RN has no colour on views, only on Text.
const textColor = defineToken({
  values: ['body', 'faint'] as const,
  resolve: value => ({ color: value }),
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
  resolve: value => ({ backgroundColor: value }),
  alphaChannel: ['backgroundColor'],
})
const washSystem = defineSystem({ washable })
washSystem.stylesheet({ root: { washable: 'base/50' } })

export {}
