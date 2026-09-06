/**
 * Compile-time contracts for `useStyles` — `tsc` IS the test: every
 * `@ts-expect-error` line fails the build if the error disappears.
 *
 * The load-bearing guarantee: `{...s.container}` is only spreadable for
 * elements the stylesheet DECLARED — a typo'd element name is a compile
 * error, not a silent `any`.
 */
import { defineSystem, defineToken } from '@toned/core'
import { bind, overrideStyles, useBind, useStyles } from './index.ts'

const bgColor = defineToken({
  values: ['base', 'accent'] as const,
  resolve: (value) => ({ backgroundColor: value }),
})

const system = defineSystem({ bgColor })

const plain = system.stylesheet({
  container: { bgColor: 'base' },
  label: { bgColor: 'accent' },
})

const varianted = system
  .stylesheet({ root: { bgColor: 'base' } })
  .variants<{ tone: 'calm' | 'loud' }>(($) => ({
    [$.tone('loud')]: { root: { bgColor: 'accent' } },
  }))

export function Plain() {
  const s = useStyles(plain)
  s.container.className
  s.label.style
  s.container.with({ className: 'x' })
  // @ts-expect-error — no such element was declared
  s.nope
  return null
}

export function Varianted() {
  const s = useStyles(varianted, { tone: 'calm' })
  s.root.className
  // @ts-expect-error — no such element was declared
  s.typo
  return null
}

export function VariantedMods() {
  // @ts-expect-error — 'shouty' is not a declared tone
  useStyles(varianted, { tone: 'shouty' })
  // @ts-expect-error — a varianted stylesheet requires its mods
  useStyles(varianted)
  return null
}

// useBind/bind share useStyles' contract: the bound set is exactly the declared
// elements (a component that also carries `.with`), and mods type identically.
export function BoundPlain() {
  const s = useBind(plain)
  s.container.with({ className: 'x' })
  // @ts-expect-error — no such element was declared
  s.nope
  return null
}

export function BoundVarianted() {
  const s = useBind(varianted, { tone: 'calm' })
  s.root
  // @ts-expect-error — no such element was declared
  s.typo
  return null
}

export function BoundVariantedMods() {
  // @ts-expect-error — 'shouty' is not a declared tone
  useBind(varianted, { tone: 'shouty' })
  // @ts-expect-error — a varianted stylesheet requires its mods
  useBind(varianted)
  return null
}

// `as` infers the target's interface: intrinsic props for a tag, the
// component's own props for a component. The no-`as` signature forbids `as`,
// so a failed `as` call cannot fall through to it and silently pass.
export function BoundAs() {
  const s = useBind(plain)
  const Needs = (_props: { x: number; className?: string }) => null

  s.container({ as: 'button', type: 'submit' })
  s.container({ as: Needs, x: 1, className: 'y' })
  // @ts-expect-error — 'href' is not a button prop
  s.container({ as: 'button', href: '/nope' })
  // @ts-expect-error — an anchor's `type` is a string, not a number
  s.container({ as: 'a', type: 2 })
  // @ts-expect-error — Needs requires `x`
  s.container({ as: Needs })
  // @ts-expect-error — `x` must be a number
  s.container({ as: Needs, x: 'one' })
  return null
}

export function ModlessBind() {
  const { container } = bind(plain)
  container.with({ className: 'x' })
  // @ts-expect-error — no such element was declared
  bind(plain).nope
  return null
}

/*
 * `overrideStyles` says what the stylesheet says, about the elements the
 * target declared. Each `@ts-expect-error` below is a rule that used to be
 * unenforceable, because a sheet exported for overriding was type-erased.
 */
const overridable = system
  .stylesheet({ root: { bgColor: 'base' }, icon: { bgColor: 'accent' } })
  .variants<{ size: 'sm' | 'lg' }>(($) => ({
    [$.size('sm')]: { root: { bgColor: 'accent' } },
  }))

// Base rules: the nested blocks the stylesheet accepts, an override accepts.
overrideStyles(overridable, {
  root: { bgColor: 'accent', ':hover': { bgColor: 'base' } },
})

// @ts-expect-error — an element the sheet never declared
overrideStyles(overridable, { nope: { bgColor: 'base' } })

// @ts-expect-error — a value the token does not have
overrideStyles(overridable, { root: { bgColor: 'nope' } })

// Variants: the sheet's own axes, replacing a matcher or adding one.
overrideStyles(overridable, {}).variants(($) => ({
  [$.size('sm')]: { root: { bgColor: 'base' } },
  [$.size('lg')]: { icon: { ':hover': { bgColor: 'accent' } } },
}))

overrideStyles(overridable, {}).variants(($) => ({
  // @ts-expect-error — a value the axis does not have
  [$.size('xl')]: { root: { bgColor: 'base' } },
}))

overrideStyles(overridable, {}).variants(($) => ({
  // @ts-expect-error — an axis the sheet does not declare
  [$.tone('quiet')]: { root: { bgColor: 'base' } },
}))

// @ts-expect-error — an unknown element inside a matcher
overrideStyles(overridable, {}).variants(($) => ({
  [$.size('sm')]: { nope: { bgColor: 'base' } },
}))

// @ts-expect-error — a bad token value inside a matcher
overrideStyles(overridable, {}).variants(($) => ({
  [$.size('sm')]: { root: { bgColor: 'nope' } },
}))
