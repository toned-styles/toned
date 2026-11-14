/**
 * Compile-time contracts for declared CSS variables: in a namespaced system a
 * literal `var(--x)` in `$style` must name a variable the system owns (one the
 * sheet sets, or core's `--toned-*`) or one listed in `externalCssVariables`.
 * `tsc` is the test; every `Has<…>` below must be `true`.
 */
import { defineSystem, defineToken } from '../system/index.ts'
import type { TonedError } from './errors.ts'
import type { StylesheetValidation } from './stylesheet.ts'
import type { VariableNames } from './variables.ts'

const gap = defineToken({
  values: [0, 1] as const,
  resolve: (value) => ({ gap: value * 4 }),
})

const ui = defineSystem({
  id: 'vars',
  externalCssVariables: ['--app-surface', '--brand-ink'],
  tokens: { gap },
})

type S = (typeof ui)['system']
type Rules<T> = StylesheetValidation<S, T>
type MessageOf<E> = E extends TonedError<infer M> ? M : never
type Has<E, Pattern extends string> = [MessageOf<E>] extends [never]
  ? false
  : MessageOf<E> extends Pattern
    ? true
    : false
type Accepted<E> = [MessageOf<E>] extends [never] ? true : false

// --- names are read from every var() in a value ---------------------------------

type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
export const one: Eq<VariableNames<'var(--a)'>, '--a'> = true
export const spaced: Eq<
  VariableNames<'calc(var( --a, 0%) + var(--b))'>,
  '--a' | '--b'
> = true
export const nested: Eq<
  VariableNames<'var(--a, var(--b))'>,
  '--a' | '--b'
> = true
export const none: Eq<VariableNames<'1px solid red'>, never> = true

// --- an unlisted variable is a type error that names the fix --------------------

export const unlisted: Has<
  Rules<{
    Root: { '@platform web': { $style: { backgroundColor: 'var(--brand)' } } }
  }>['Root']['@platform web']['$style']['backgroundColor'],
  `'var(--brand)' names '--brand', which this system neither sets nor lists, so it would be renamed and resolve to nothing. Add '--brand' to defineSystem({ externalCssVariables }), or set it in this sheet. External: ${`'--app-surface', '--brand-ink'` | `'--brand-ink', '--app-surface'`}`
> = true
ui.stylesheet({
  // @ts-expect-error — '--brand' is neither set nor listed
  Root: { '@platform web': { $style: { backgroundColor: 'var(--brand)' } } },
})
ui.stylesheet({
  Root: {
    ':hover': {
      // @ts-expect-error — inside a condition, and with a fallback
      '@platform web': { $style: { width: 'var(--progress, 0%)' } },
    },
  },
})
ui.stylesheet({
  // @ts-expect-error — in a $style list entry
  Root: { '@platform web': { $style: [{ borderColor: 'var(--ink)' }] } },
})

// --- listed, core and sheet-set variables are accepted --------------------------

export const listed: Accepted<
  Rules<{
    Root: {
      '@platform web': { $style: { backgroundColor: 'var(--app-surface)' } }
    }
  }>['Root']['@platform web']['$style']['backgroundColor']
> = true
ui.stylesheet({
  Root: {
    '@platform web': {
      $style: {
        '--bar': '3rem',
        backgroundColor: 'var(--app-surface, var(--brand-ink))',
        borderColor: 'var(--toned-b-placeholder-color)',
      },
    },
  },
  Panel: { '@platform web': { $style: { top: 'calc(var(--bar) + 1px)' } } },
})
// A quoted var() is text, as it is at runtime.
ui.stylesheet({
  Root: { '@platform web': { $style: { content: '"var(--brand)"' } } },
})
// A value that is not a literal is not checked.
declare const dynamic: string
ui.stylesheet({
  Root: { '@platform web': { $style: { width: dynamic } } },
})

// --- systems that are not checked -----------------------------------------------

// A list that is not a literal tuple cannot be checked.
declare const computed: string[]
const open = defineSystem({
  id: 'open',
  externalCssVariables: computed,
  tokens: { gap },
})
open.stylesheet({
  Root: { '@platform web': { $style: { borderColor: 'var(--anything)' } } },
})
// A system without an id is not namespaced: nothing is renamed.
const plain = defineSystem({ gap })
plain.stylesheet({
  Root: { '@platform web': { $style: { borderColor: 'var(--anything)' } } },
})
