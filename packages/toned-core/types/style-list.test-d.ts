/**
 * Compile-time contracts for `$style` lists: the same element-kind typing as
 * the single form, in parts, conditions and platform blocks. `tsc` is the test.
 */
import { defineSystem, defineToken } from '../system/index.ts'

const gap = defineToken({
  values: [0, 1, 2] as const,
  resolve: (value) => ({ gap: value * 4 }),
})
const ui = defineSystem({
  id: 'lists',
  tokens: { gap },
  conditions: { media: { md: 768 } },
})

const focusRing = { outlineWidth: 2, outlineStyle: 'solid' } as const
const dim = false as boolean

ui.stylesheet({
  Root: {
    $style: [{ opacity: 0.5 }, dim && { opacity: 1 }, null, { zIndex: null }],
    '@md': { $style: [{ opacity: 1 }] },
    '@platform web': {
      $style: [focusRing, dim && { cursor: 'pointer' }, { maxWidth: '42rem' }],
    },
  },
  Label: { $kind: 'text', $style: [{ color: 'red' }, { fontSize: 12 }] },
})

// @ts-expect-error web-only CSS in a portable list entry
ui.stylesheet({ Root: { $style: [{ opacity: 0.5 }, { cursor: 'pointer' }] } })
ui.stylesheet({
  Root: {
    '@platform web': {
      // @ts-expect-error a misspelt property beside a valid one
      $style: [{ cursor: 'pointer', cursr: 'x' }],
    },
  },
})
ui.stylesheet({
  // @ts-expect-error a view part takes no text properties, in a list too
  Root: { $kind: 'view', $style: [{ color: 'red' }] },
})
// @ts-expect-error a list entry is a style object
ui.stylesheet({ Root: { $style: ['bold'] } })

// The pure helper and t() take lists too.
ui.style({ $style: [{ opacity: 0.5 }, { zIndex: 1 }] })
ui.t({ $style: [{ opacity: 0.5 }] })
