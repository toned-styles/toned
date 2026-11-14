/**
 * Compile-time contracts for `defineSystem({ targets })`: a part's `$style`
 * is what every declared target supports, and a feature a declared target
 * cannot render is a type error, not a runtime rejection. `tsc` is the test.
 */
import type { Variants } from '../index.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import { webRules } from '../web/rules.ts'
import type { TonedError } from './errors.ts'
import type { StylesheetValidation } from './stylesheet.ts'
import type { Target } from './targets.ts'

const gap = defineToken({
  values: [0, 1, 2] as const,
  resolve: (value) => ({ gap: value * 4 }),
})
const conditions = {
  media: { md: 768 },
  states: { open: "[data-state='open']" },
} as const

const web = defineSystem({
  id: 'web',
  targets: ['web'],
  tokens: { gap },
  conditions,
})
const portable = defineSystem({ id: 'portable', tokens: { gap }, conditions })
const both = defineSystem({
  id: 'both',
  targets: ['web', 'native'],
  tokens: { gap },
  conditions,
})
const mail = defineSystem({
  id: 'mail',
  targets: ['web', 'email'],
  tokens: { gap },
  conditions,
})
const native = defineSystem({
  id: 'native',
  targets: ['native'],
  tokens: { gap },
  conditions,
})
const pdf = defineSystem({
  id: 'pdf',
  targets: ['pdf'],
  tokens: { gap },
  conditions,
})

export const declared: readonly Target[] | undefined = web.targets

// --- web only: plain $style is CSS, at the root and inside conditions --------

web.stylesheet({
  Root: {
    $style: { cursor: 'pointer', '--accent': 'red', maxWidth: '42rem' },
    ':hover': { $style: { textDecoration: 'underline' } },
    '@md': { $style: [{ cursor: 'default' }, { userSelect: 'none' }] },
  },
})
// @ts-expect-error a CSS property typo is still a typo
web.stylesheet({ Root: { $style: { cursr: 'pointer' } } })
web.stylesheet({
  Root: {
    // @ts-expect-error a view part still takes no text properties
    $style: { color: 'red' },
  },
})

// --- no targets, and ['web', 'native']: the portable style, as before ----------

portable.stylesheet({ Root: { $style: { opacity: 0.5 } } })
// @ts-expect-error cursor is web-only in the portable style
portable.stylesheet({ Root: { $style: { cursor: 'pointer' } } })
// @ts-expect-error the same with both targets declared
both.stylesheet({ Root: { $style: { cursor: 'pointer' } } })
both.stylesheet({
  Root: { '@platform web': { $style: { cursor: 'pointer' } } },
})

// --- native only -------------------------------------------------------------

native.stylesheet({ Root: { $style: { elevation: 2 } } })
// @ts-expect-error cursor is not a native style
native.stylesheet({ Root: { $style: { cursor: 'pointer' } } })

// --- web and email: the inline-safe subset, no conditions, no CSS extensions --

mail.stylesheet({ Root: { gap: 1, $style: { cursor: 'pointer' } } })
// @ts-expect-error a CSS variable has no value in an inline style
mail.stylesheet({ Root: { $style: { '--accent': 'red' } } })
// @ts-expect-error email renders no hover
mail.stylesheet({ Root: { ':hover': { gap: 1 } } })
// @ts-expect-error nor media
mail.stylesheet({ Root: { '@md': { gap: 1 } } })
// @ts-expect-error nor a declared state
mail.stylesheet({ Root: { ':open': { gap: 1 } } })
mail.stylesheet({
  Root: { gap: 1 },
  Item: { gap: 1 },
  // @ts-expect-error nor a cross-part key
  'Root:hover': { Item: { gap: 2 } },
})
mail.stylesheet({
  Root: {
    '@platform web': {
      // @ts-expect-error nor a CSS extension
      $webRules: webRules({ '&::before': { content: '"*"' } }),
    },
  },
})
// Variants are static, so they still work.
mail
  .stylesheet({ Root: { gap: 0 } })
  .variants(($: Variants<{ size: 's' | 'm' }>) => ({
    [$.size('m')]: { Root: { gap: 2 } },
  }))

// @ts-expect-error a PDF system has no conditions either
pdf.stylesheet({ Root: { '@md': { gap: 1 } } })

// --- the messages name the targets and the fix ---------------------------------

type MessageOf<E> = E extends TonedError<infer M> ? M : never
type Has<E, Pattern extends string> = [MessageOf<E>] extends [never]
  ? false
  : MessageOf<E> extends Pattern
    ? true
    : false

export const staticCondition: Has<
  StylesheetValidation<
    (typeof mail)['system'],
    { Root: { ':hover': { gap: 1 } } }
  >['Root'][':hover'],
  `':hover' is a condition, and this system's 'email' target renders one static style per part: use a variant ([$.<axis>(value)]) instead, or drop the static target`
> = true

export const staticRootCondition: Has<
  StylesheetValidation<
    (typeof mail)['system'],
    { Root: { gap: 1 }; '@md': { Root: { gap: 2 } } }
  >['@md'],
  `'@md' is a condition, and this system's 'email' target${string}`
> = true

// @ts-expect-error an unknown target
defineSystem({ id: 'bad', targets: ['ios'], tokens: { gap } })
