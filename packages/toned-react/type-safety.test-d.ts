/**
 * Compile-time contracts for `useStyles` — `tsc` IS the test: every
 * `@ts-expect-error` line fails the build if the error disappears.
 *
 * The load-bearing guarantee: `{...s.container}` is only spreadable for
 * elements the stylesheet DECLARED — a typo'd element name is a compile
 * error, not a silent `any`.
 */
import { defineSystem, defineToken } from '@toned/core'
import { useStyles } from './index.ts'

const bgColor = defineToken({
  values: ['base', 'accent'] as const,
  resolve: value => ({ backgroundColor: value }),
})

const system = defineSystem({ bgColor })

const plain = system.stylesheet({
  container: { bgColor: 'base' },
  label: { bgColor: 'accent' },
})

const varianted = system
  .stylesheet({ root: { bgColor: 'base' } })
  .variants<{ tone: 'calm' | 'loud' }>($ => ({
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
