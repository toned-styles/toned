/**
 * Declared CSS variables, checked when a sheet of a namespaced system is
 * created (development only).
 *
 * A namespaced system renames every custom property it emits into its own
 * namespace (`--x` → `--<id>-x`) except those listed in
 * `externalCssVariables`. A `var(--x)` written in `$style` that names neither
 * a variable the system owns nor a listed one is renamed too, and then
 * resolves to nothing: the fallback, or the property's initial value, with no
 * error anywhere. The system owns:
 *
 * - a custom property the sheet itself sets (`$style: { '--bar': '3rem' }`),
 *   on any part, in any condition, in a base sheet it extends, or in a variant;
 * - core's own parameters, `--toned-*` and `--toned_*` (bridge variables
 *   included), which core writes and never asks an author to list.
 *
 * The check reads each `$style` once per sheet creation, never per resolve,
 * and runs only where `isDev()` holds, as toned's development warnings do.
 *
 * @module system/css-variables
 */
import { outsideStrings } from './namespace.ts'

const REFERENCE = /var\(\s*(--[a-zA-Z_][\w-]*)/g
const CORE = /^--toned[-_]/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype

/** A key that names a part: not a condition, selector, or `$`/style member. */
const isPartKey = (key: string) =>
  /^[A-Za-z_][\w-]*$/.test(key) && key !== 'style'

type Use = { name: string; value: string; part: string | undefined }

/** Every custom property a `style` object sets, and every `var()` it reads. */
function collect(
  node: unknown,
  part: string | undefined,
  defined: Set<string>,
  uses: Use[],
): void {
  if (Array.isArray(node)) {
    for (const entry of node) collect(entry, part, defined, uses)
    return
  }
  if (node === null || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node)) {
    if (key === 'style') {
      if (isRecord(value)) readStyle(value, part, defined, uses)
    } else if (key !== '$webRules' && key !== '$grid' && key !== '$area') {
      collect(value, isPartKey(key) ? key : part, defined, uses)
    }
  }
  for (const symbol of Object.getOwnPropertySymbols(node))
    collect((node as Record<symbol, unknown>)[symbol], part, defined, uses)
}

function readStyle(
  style: Record<string, unknown>,
  part: string | undefined,
  defined: Set<string>,
  uses: Use[],
): void {
  for (const [property, value] of Object.entries(style)) {
    if (property.startsWith('--')) defined.add(property)
    if (typeof value !== 'string' || !value.includes('var(')) continue
    outsideStrings(value, (text) => {
      for (const [, name] of text.matchAll(REFERENCE))
        uses.push({ name: name!, value, part })
      return text
    })
  }
}

/**
 * Throws for the first `var()` in the sheet's `$style` values that names a
 * variable the system neither owns nor lists, naming the variable, what it
 * would be renamed to, and the listed ones.
 */
export function assertDeclaredCssVariables(
  rules: unknown,
  id: string,
  external: readonly string[] = [],
): void {
  const defined = new Set<string>()
  const uses: Use[] = []
  collect(rules, undefined, defined, uses)
  if (!uses.length) return
  const listed = new Set(external)
  const bad = uses.find(
    ({ name }) => !listed.has(name) && !defined.has(name) && !CORE.test(name),
  )
  if (!bad) return
  const where = bad.part ? ` in ${bad.part}'s $style` : ' in $style'
  const names = external.length
    ? external.map((name) => `'${name}'`).join(', ')
    : 'none'
  throw new Error(
    `Toned: '${bad.value}'${where} names '${bad.name}', which system '${id}' neither sets nor lists, so it would be renamed to '--${id}-${bad.name.slice(2)}' and resolve to nothing. Add '${bad.name}' to defineSystem({ externalCssVariables }), or set it in this sheet. External: ${names}`,
  )
}
