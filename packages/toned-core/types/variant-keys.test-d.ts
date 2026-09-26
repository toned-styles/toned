import { defineSystem, defineToken, type Variants } from '../index.ts'
const ui = defineSystem({
  id: 'variant-key-validation',
  tokens: {
    padding: defineToken({
      values: [2, 4],
      resolve: (padding) => ({ padding }),
    }),
  },
  conditions: { media: { md: 768 } },
})
const base = ui.stylesheet({ Root: {} })
type Mods = {
  size: 's' | 'm'
  active: boolean
  count: 0 | 2
  'a]b': 'a=b|[c]%' | '*'
}
base.variants(($: Variants<Mods>, q) => ({
  '[size=s]': { Root: { padding: 2 } },
  '[size=s][size=m][count=2]': { Root: { padding: 4 } },
  '[active]': { Root: { padding: 2 } },
  '[active=false]': { Root: { padding: 2 } },
  '[size=*]': { Root: { padding: 2 } },
  '[a%5Db=a%3Db%7C%5Bc%5D%25]': { Root: { padding: 2 } },
  '[a%5Db=%2A]': { Root: { padding: 2 } },
  [$('shared')]: { Root: { padding: 2 } },
  [$.size('s').active(true)]: { $compose: 'shared' },
  [q.all($.size('m'), q.media('md'))]: { Root: { padding: 4 } },
  '@media md': { Root: { padding: 2 } },
  '@platform.web': { Root: { $style: { opacity: 1 } } },
}))
// @ts-expect-error unknown literal axis
base.variants(($: Variants<Mods>) => ({
  '[missing=x]': { Root: { padding: 2 } },
}))
// @ts-expect-error unknown literal key
base.variants(($: Variants<Mods>) => ({ wat: { Root: { padding: 2 } } }))
// @ts-expect-error invalid value on a known axis
base.variants(($: Variants<Mods>) => ({
  '[size=wrong]': { Root: { padding: 2 } },
}))
// @ts-expect-error bare attributes mean true and require an axis allowing true
base.variants(($: Variants<Mods>) => ({ '[size]': { Root: { padding: 2 } } }))
// @ts-expect-error numeric values remain finite
base.variants(($: Variants<Mods>) => ({
  '[count=1]': { Root: { padding: 2 } },
}))
// @ts-expect-error a valid prefix cannot hide trailing syntax
base.variants(($: Variants<Mods>) => ({
  '[size=s]junk': { Root: { padding: 2 } },
}))
// @ts-expect-error malformed attribute
base.variants(($: Variants<Mods>) => ({ '[size=s': { Root: { padding: 2 } } }))
// @ts-expect-error a computed valid selector does not hide an explicit invalid key
base.variants(($: Variants<Mods>) => ({
  [$.size('s')]: { Root: { padding: 2 } },
  wat: { Root: { padding: 2 } },
}))
// @ts-expect-error encoded attributes still check the declared value
base.variants(($: Variants<Mods>) => ({
  '[a%5Db=wrong]': { Root: { padding: 2 } },
}))
// @ts-expect-error condition aliases must use declared names
base.variants(($: Variants<Mods>) => ({
  '@media typo': { Root: { padding: 2 } },
}))

base.variants(($: Variants<Mods>) => ({
  '@platform.web': { Root: { $style: { cursor: 'pointer' } } },
}))
