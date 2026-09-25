/** Single-call variant authoring: these assertions compile against public exports. */
import { defineSystem, defineToken, type Variants } from '../index.ts'

const ui = defineSystem({
  id: 'annotated-variants',
  tokens: {
    padding: defineToken({
      values: [2, 4],
      resolve: (padding) => ({ padding }),
    }),
  },
  conditions: {
    media: { md: 768 },
    containers: { card: { wide: 400 } },
    states: { open: '[data-open]' },
  },
})
const base = ui.stylesheet({
  Root: { $kind: 'view' },
  Label: { $kind: 'text' },
})
type Size = 's' | 'm'
type Mods = { size?: Size; variant: 'accent' | 'quiet' }
const sheet = base.variants(
  ($: Variants<Mods>, q) => ({
    [$.size('s').variant('accent')]: {
      Root: {
        padding: 2,
        [q.media('md')]: { padding: 4 },
        [q.container('card', 'wide')]: { padding: 4 },
        [q.state('open')]: { padding: 2 },
        '@platform web': { $style: { position: 'sticky' } },
        '@platform native': { $style: { paddingHorizontal: 12 } },
      },
      Label: { $style: { fontSize: 12 } },
    },
  }),
  { defaults: { variant: 'quiet' } },
)
type Meta = NonNullable<typeof sheet.__toned__>
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false
export const mods: Equal<Meta['mods'], Mods> = true
export const defaults: Equal<Meta['defaults'], { readonly variant: 'quiet' }> =
  true
export const parts: Equal<keyof Meta['elements'], 'Root' | 'Label'> = true
export const kind: Equal<Meta['elements']['Label'], 'text'> = true

// @ts-expect-error extra token must not fall through to a compatibility overload
base.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { Root: { padding: 2, typo: 4 } },
}))
// @ts-expect-error extra part beside a known part is rejected
base.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { Root: { padding: 2 }, Missing: {} },
}))
// @ts-expect-error kind restrictions are retained
base.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { Root: { $style: { fontSize: 12 } } },
}))
// @ts-expect-error conditional declarations cannot change static kind
base.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { Root: { $kind: 'text' } },
}))
// @ts-expect-error recursive validation checks inferred callback return values
base.variants(($: Variants<Mods>, q) => ({
  [$.size('s')]: { Root: { [q.media('md')]: { padding: 2, typo: 1 } } },
}))
base.variants(($: Variants<Mods>) => ({
  // @ts-expect-error variant values remain exact
  [$.size('xl')]: { Root: { padding: 2 } },
}))
// @ts-expect-error token values remain exact
base.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { Root: { padding: 'wrong' } },
}))
base.variants(($: Variants<Mods>) => ({
  // @ts-expect-error optional means omittable; undefined is not a selectable value
  [$.size(undefined)]: { Root: { padding: 2 } },
}))
base.variants(($: Variants<Mods>, q) => ({
  // @ts-expect-error query names stay system-bound
  [$.size('s')]: { Root: { [q.media('mdd')]: { padding: 2 } } },
}))
base.variants(($: Variants<Mods>, q) => {
  // @ts-expect-error query source parts are known before the callback
  q.part('Missing').state('hover')
  return { [$.size('s')]: { Root: { padding: 2 } } }
})
// @ts-expect-error portable styles cannot promise web-only positioning
base.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { Root: { $style: { position: 'sticky' } } },
}))
// @ts-expect-error platform widening retains the part kind
base.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { Root: { '@platform web': { $style: { fontSize: 12 } } } },
}))
base.variants(
  ($: Variants<Mods>) => ({ [$.size('s')]: { Root: { padding: 2 } } }),
  // @ts-expect-error wrong default value
  { defaults: { size: 'xl' } },
)
base.variants(
  ($: Variants<Mods>) => ({ [$.size('s')]: { Root: { padding: 2 } } }),
  // @ts-expect-error unknown default axis
  { defaults: { other: 's' } },
)
base.variants(
  ($: Variants<Mods>) => ({ [$.size('s')]: { Root: { padding: 2 } } }),
  // @ts-expect-error undefined is not a declared default
  { defaults: { size: undefined } },
)
// @ts-expect-error empty schemas still receive exact declaration checks
base.variants(($: Variants<{}>) => ({
  named: { Root: { padding: 2, typo: 1 } },
}))
// @ts-expect-error open schemas cannot fall through to an unchecked overload
base.variants(($: Variants<Record<string, string>>) => ({
  [$['size']!('s')]: { Root: { padding: 2, typo: 1 } },
}))

// Existing explicit-generic, curried and object forms remain callable.
base.variants<Mods>(($) => ({ [$.size('s')]: { Root: { padding: 2 } } }))
base.variants<Mods>()(($) => ({ [$.size('s')]: { Root: { padding: 2 } } }))
base.variants<Mods>({ '[size=s]': { Root: { padding: 2 } } })

// Interfaces and type aliases are equally usable as reusable axis schemas.
interface ComponentVariants {
  size?: Size
  active: boolean
}
const interfaceSheet = base.variants(
  ($: Variants<ComponentVariants>, q) => ({
    [$.size('s')]: { Root: { padding: 2, [q.state('hover')]: { padding: 4 } } },
  }),
  { defaults: { active: true } },
)
type InterfaceMeta = NonNullable<typeof interfaceSheet.__toned__>
export const interfaceMods: Equal<InterfaceMeta['mods'], ComponentVariants> =
  true
export const interfaceDefaults: Equal<
  InterfaceMeta['defaults'],
  { readonly active: true }
> = true
// @ts-expect-error axis values must remain scalar
export type InvalidSchema = Variants<{ size: { value: string } }>
base.variants(($: Variants<ComponentVariants>) => ({
  // @ts-expect-error interfaces retain their exact variant values
  [$.size('xl')]: { Root: { padding: 2 } },
}))

// Named fragments keep colocated state rules under their declared parts.
export const composed = base.variants(($: Variants<Mods>, q) => ({
  [$('interactive')]: {
    Root: { [q.state('hover')]: { padding: 4 } },
  },
  [$.variant('accent')]: {
    $compose: 'interactive',
    Root: { padding: 2 },
  },
}))

const sharedFactory = ($: Variants<Mods>) =>
  ({ [$.size('s')]: { Root: { padding: 2 } } }) as const
base.variants(sharedFactory)
const widenedFactory = ($: Variants<Mods>) => ({
  [$.size('s')]: { Root: { padding: 2 } },
})
// @ts-expect-error extracted factories must preserve finite token literal types
base.variants(widenedFactory)
