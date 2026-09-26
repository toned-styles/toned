/** Pure and ambient override authoring share one checked declaration vocabulary. */
import {
  defineSystem,
  defineToken,
  overrideSheet,
  type Variants,
} from '@toned/core'
import { overrideStyles } from './index.ts'

const ui = defineSystem({
  id: 'override-query-types',
  tokens: {
    opacity: defineToken({
      values: [0, 0.5, 1],
      resolve: (opacity) => ({ opacity }),
    }),
  },
  conditions: { media: { wide: 800 }, states: { open: '[data-open]' } },
})
const sheet = ui
  .stylesheet({
    Root: { $kind: 'view', opacity: 0.5 },
    Label: { $kind: 'text' },
  })
  .variants(($: Variants<{ active: boolean }>) => ({
    [$.active(true)]: { Root: { opacity: 1 } },
  }))

overrideSheet(sheet, (q) => ({
  Root: { opacity: null, [q.not(q.state('hover'))]: { opacity: 0 } },
  [q.all(q.media('wide'), q.part('Root').state('hover'))]: {
    Label: { $style: { fontSize: 18 } },
  },
  [q.platform('web')]: { Root: { $style: { position: 'sticky' } } },
}))
overrideStyles(sheet, (q) => ({
  Root: { opacity: null, [q.not(q.state('hover'))]: { opacity: 0 } },
  [q.all(q.media('wide'), q.part('Root').state('hover'))]: {
    Label: { $style: { fontSize: 18 } },
  },
  [q.platform('native')]: { Root: { $style: { elevation: 2 } } },
})).variants(($, q) => ({
  [$('shared')]: { Label: { $style: { fontSize: 16 } } },
  [$.active(true)]: {
    $compose: 'shared',
    [q.platform('web')]: { Root: { $style: { cursor: 'pointer' } } },
    [q.all(q.media('wide'), q.part('Root').state('hover'))]: {
      Root: { opacity: 1 },
    },
  },
}))
overrideSheet(sheet, {}, ($, q) => ({
  [$('shared')]: { Label: { $style: { fontSize: 16 } } },
  [$.active(true)]: {
    $compose: 'shared',
    Root: {
      opacity: null,
      [q.all(q.media('wide'), q.state('hover'))]: { opacity: 0 },
    },
  },
}))

// @ts-expect-error compound root rules only target known parts
overrideSheet(sheet, (q) => ({
  [q.all(q.media('wide'))]: { Missing: { opacity: 0 } },
}))
// @ts-expect-error the ambient API uses the same part validation
overrideStyles(sheet, (q) => ({
  [q.all(q.media('wide'))]: { Missing: { opacity: 0 } },
}))
// @ts-expect-error sheet-level compound keys cannot use implicit local state
overrideSheet(sheet, (q) => ({
  [q.all(q.state('hover'))]: { Root: { opacity: 0 } },
}))
// @ts-expect-error ambient sheet-level keys likewise require a named source part
overrideStyles(sheet, (q) => ({
  [q.not(q.state('hover'))]: { Root: { opacity: 0 } },
}))
// @ts-expect-error a view's portable style cannot gain text-only properties
overrideStyles(sheet, { Root: { $style: { fontSize: 20 } } })
// @ts-expect-error a compound platform predicate does not widen portable style
overrideSheet(sheet, (q) => ({
  [q.all(q.platform('web'))]: { Root: { $style: { cursor: 'pointer' } } },
}))
// @ts-expect-error unknown names cannot be composed by pure overrides
overrideSheet(sheet, {}, ($) => ({
  [$.active(true)]: { $compose: 'missing', Root: { opacity: 0 } },
}))
// @ts-expect-error unknown names cannot be composed by ambient overrides
overrideStyles(sheet, {}).variants(($) => ({
  [$.active(true)]: { $compose: 'missing', Root: { opacity: 0 } },
}))
// @ts-expect-error nullable style leaves do not make composition metadata nullable
overrideSheet(sheet, {}, ($) => ({
  [$.active(true)]: { $compose: null, Root: { opacity: 0 } },
}))
// @ts-expect-error nullable style leaves do not make ambient composition nullable
overrideStyles(sheet, {}).variants(($) => ({
  [$.active(true)]: { $compose: null, Root: { opacity: 0 } },
}))

// @ts-expect-error base part metadata cannot be removed by an override
overrideSheet(sheet, { Root: { $kind: null } })
// @ts-expect-error even the same kind is not an override declaration
overrideSheet(sheet, { Root: { $kind: 'view' } })
// @ts-expect-error conditional overrides cannot change static part metadata
overrideSheet(sheet, { Root: { 'Root:hover': { $kind: 'text' } } })
// @ts-expect-error legacy metadata cannot be removed through ambient overrides
overrideStyles(sheet, { Root: { $$type: null } })
// @ts-expect-error metadata presence is rejected even when its value is undefined
overrideStyles(sheet, { Root: { $kind: undefined } })
// @ts-expect-error named override fragments do not own part metadata
overrideSheet(sheet, {}, ($) => ({ [$('named')]: { Root: { $kind: 'view' } } }))

overrideStyles(sheet, { 'Root~:open': { Label: { $style: { fontSize: 14 } } } })
overrideSheet(sheet, { 'Root~:hover': { Root: { opacity: 0 } } })
// @ts-expect-error sibling channels still validate the declared source state
overrideStyles(sheet, { 'Root~:missing': { Label: { opacity: 0 } } })

// Object-valued tokens are opaque to declaration metadata validation.
const payload = {
  $kind: 'payload',
  $$type: 'payload',
  $compose: 'payload',
  opacity: 0.5,
} as const
const payloadSystem = defineSystem({
  id: 'override-payload-types',
  tokens: {
    payload: defineToken({
      values: [payload],
      resolve: (value) => ({ opacity: value.opacity }),
    }),
  },
})
const payloadSheet = payloadSystem.stylesheet({ Root: { payload } })
overrideSheet(payloadSheet, { Root: { payload } })
overrideStyles(payloadSheet, { Root: { payload } })
overrideSheet(payloadSheet, {
  // @ts-expect-error opacity remains checked against the token's authored object shape
  Root: { payload: { ...payload, opacity: 'wrong' } },
})
overrideSheet(payloadSheet, {
  Root: {
    payload: { $kind: null, $$type: null, $compose: null, opacity: 0.5 },
  },
})
