import { defineSystem, defineToken, type Variants } from '../index.ts'
import type { ExtractNamedStyles } from './composition.ts'

const ui = defineSystem({
  padding: defineToken({ values: [2, 4], resolve: (padding) => ({ padding }) }),
})
const base = ui.stylesheet({ Root: {}, Label: {} })
type Mods = { size: 's' | 'm' }

declare const selector: Variants<Mods>
const rules = {
  [selector('interactive')]: { Root: { padding: 2 } },
  [selector('spacing')]: { Label: { padding: 4 } },
  [selector.size('s')]: { $compose: 'interactive' },
}
type Expect<T extends true> = T
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false
export type _Names = Expect<
  Equal<ExtractNamedStyles<typeof rules>, 'interactive' | 'spacing'>
>
export type _NoNames = Expect<
  Equal<ExtractNamedStyles<{ '[size=s]': {} }>, never>
>

base.variants(($: Variants<Mods>) => ({
  [$('interactive')]: { Root: { padding: 2 } },
  [$('spacing')]: { $compose: 'interactive', Label: { padding: 4 } },
  [$.size('s')]: { $compose: ['interactive', 'spacing'], Root: { padding: 4 } },
  [$.size('m')]: { Root: { $compose: 'Label' } },
}))

// @ts-expect-error unknown named fragment
base.variants(($: Variants<Mods>) => ({
  [$('interactive')]: { Root: { padding: 2 } },
  [$.size('s')]: { $compose: 'interactiv' },
}))
// @ts-expect-error a selector without named declarations cannot compose arbitrary names
base.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { $compose: 'missing' },
}))
// @ts-expect-error array members must all refer to declared names
base.variants(($: Variants<Mods>) => ({
  [$('interactive')]: { Root: { padding: 2 } },
  [$.size('s')]: { $compose: ['interactive', 'missing'] },
}))
// @ts-expect-error nested named-fragment references are checked too
base.variants(($: Variants<Mods>) => ({
  [$('interactive')]: { $compose: 'missing', Root: { padding: 2 } },
  [$.size('s')]: { $compose: 'interactive' },
}))
// @ts-expect-error a named fragment cannot contain undeclared parts
base.variants(($: Variants<Mods>) => ({
  [$('interactive')]: { Root: { padding: 2 }, Missing: { padding: 2 } },
  [$.size('s')]: { $compose: 'interactive' },
}))
// @ts-expect-error exact token checks also apply within named fragments
base.variants(($: Variants<Mods>) => ({
  [$('interactive')]: { Root: { padding: 2, paddding: 4 } },
  [$.size('s')]: { $compose: 'interactive' },
}))
// @ts-expect-error element-level composition uses declared parts, not fragment names
base.variants(($: Variants<Mods>) => ({
  [$('interactive')]: { Root: { padding: 2 } },
  [$.size('s')]: { Root: { $compose: 'interactive' } },
}))
// @ts-expect-error string-valued references cannot bypass the finite named vocabulary
base.variants(($: Variants<Mods>) => ({
  [$('interactive')]: { Root: { padding: 2 } },
  [$.size('s')]: { $compose: 'interactive' as string },
}))

const kinds = ui.stylesheet({
  Root: { $kind: 'view' },
  Label: { $kind: 'text' },
  Caption: { $kind: 'text' },
})
kinds.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { Label: { $compose: 'Caption' } },
}))
// @ts-expect-error text-only declarations cannot be copied into a view part
kinds.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { Root: { $compose: 'Label' } },
}))
// @ts-expect-error view-only tokens are not necessarily legal on text parts
kinds.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { Label: { $compose: 'Root' } },
}))
const fragments = ['interactive', 'spacing'] as const
base.variants(($: Variants<Mods>) => ({
  [$('interactive')]: { Root: { padding: 2 } },
  [$('spacing')]: { Label: { padding: 4 } },
  [$.size('s')]: { $compose: fragments },
}))

base.variants(($: Variants<Mods>, q) => ({
  [$('interactive')]: { Root: { padding: 2 } },
  [$.size('s')]: {
    [q.all(q.part('Root').state('hover'))]: {
      $compose: 'interactive',
      Label: { $compose: 'Root' },
      [q.not(q.part('Root').state('focus'))]: { $compose: 'interactive' },
    },
  },
}))
// @ts-expect-error named references remain finite inside query groups
base.variants(($: Variants<Mods>, q) => ({
  [$('interactive')]: { Root: { padding: 2 } },
  [$.size('s')]: {
    [q.all(q.part('Root').state('hover'))]: { $compose: 'missing' },
  },
}))

const conditional = defineSystem({
  id: 'composition-conditions',
  tokens: {
    padding: defineToken({
      values: [2, 4],
      resolve: (padding) => ({ padding }),
    }),
  },
  conditions: { media: { md: 768 }, containers: { card: { wide: 400 } } },
}).stylesheet({
  Root: { $kind: 'view' },
  Source: { $kind: 'view' },
  Label: { $kind: 'text' },
})
conditional.variants(($: Variants<Mods>, q) => ({
  [$('shared')]: { Root: { padding: 2 } },
  [$.size('s')]: {
    [q.media('md')]: { $compose: 'shared', Root: { $compose: 'Source' } },
    '@media md': { Root: { padding: 4 } },
    [q.container('card', 'wide')]: { Root: { padding: 4 } },
    '@container card wide': { Root: { padding: 4 } },
    [q.part('Root').state('hover')]: { Source: { padding: 4 } },
    [q.platform('web')]: { Root: { $style: { cursor: 'pointer' } } },
    [q.platform('native')]: { Root: { $style: { paddingHorizontal: 2 } } },
  },
}))
// @ts-expect-error condition groups preserve declared part kinds
conditional.variants(($: Variants<Mods>, q) => ({
  [$.size('s')]: { [q.media('md')]: { Root: { $compose: 'Label' } } },
}))
// @ts-expect-error root platform groups reject raw styles from the other platform
conditional.variants(($: Variants<Mods>, q) => ({
  [$.size('s')]: {
    [q.platform('native')]: { Root: { $style: { cursor: 'pointer' } } },
  },
}))
// @ts-expect-error changing kind is forbidden under root conditions too
conditional.variants(($: Variants<Mods>, q) => ({
  [$.size('s')]: { [q.media('md')]: { Root: { $kind: 'text' } } },
}))

base.variants(($: Variants<Mods>, q) => ({
  // @ts-expect-error query helpers accept checked variant builders, not raw undeclared axes
  [q.all('[missing=x]')]: { Root: { padding: 2 } },
}))
base.variants(($: Variants<Mods>, q) => ({
  // @ts-expect-error a valid-looking raw string still bypasses the finite variant schema
  [q.not('[size=wrong]')]: { Root: { padding: 2 } },
}))
