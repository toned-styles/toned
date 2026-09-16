import type { TailwindBackend } from '../backends/tailwind.ts'
import { camelToKebab } from '../utils/css.ts'
import { serializeCssValue } from '../utils/css-value.ts'

/** Inject Tailwind's public `compile` function. Applications retain ownership of
 * their imports, theme, plugins, prefix, version and CSS layer ordering. */
export type TailwindCompiler = (
  source: string,
) => Promise<{ build(candidates: string[]): string }>

const compact = (value: string) => value.trim()

/** Read block headers without mistaking a comment/string mentioning a class for
 * a delivered utility. This is a lexical inventory, not a CSS equivalence parser. */
function blockHeaders(css: string): Set<string> {
  const headers = new Set<string>()
  let text = ''
  let quote = ''
  for (let index = 0; index < css.length; index++) {
    const char = css[index]!
    if (char === '\\') {
      text += char + (css[++index] ?? '')
      continue
    }
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2)
      index = end < 0 ? css.length : end + 1
      continue
    }
    if (char === '{') {
      headers.add(text.trim())
      text = ''
    } else if (char === '}' || char === ';') text = ''
    else text += char
  }
  return headers
}

/** Deliberately exact: a rem scale is not a pixel scale, and a utility that
 * writes multiple fields is not an exact mapping for one normalized field.
 * Arbitrary literal utilities and fixed custom-property utilities are portable
 * across Tailwind theme choices. Unknown expression equivalence fails closed. */
function assertProbe(
  css: string,
  field: string,
  expected: string,
  utility: string,
) {
  const matches = [...css.matchAll(/\.toned_mapping_probe\s*\{([^{}]*)\}/g)]
  if (matches.length !== 1)
    throw new Error(
      `Toned Tailwind build: ${utility} is conditional or did not compile to one declaration block`,
    )
  const declarations = matches[0]![1]!
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(';')
    .map((value) => value.trim())
    .filter(Boolean)
  const declaration = `${camelToKebab(field)}: ${expected}`
  if (declarations.length !== 1) {
    throw new Error(
      `Toned Tailwind build: ${utility} must write only ${field}; compiled ${declarations.join('; ')}`,
    )
  }
  const index = declarations[0]!.indexOf(':')
  const actualField = declarations[0]!.slice(0, index).trim()
  const actualValue = compact(declarations[0]!.slice(index + 1))
  if (actualField !== camelToKebab(field) || actualValue !== compact(expected))
    throw new Error(
      `Toned Tailwind build: ${utility} does not mean ${declaration}; compiled ${declarations[0]}`,
    )
}

/** Validation uses the application's actual Tailwind compiler and theme, not
 * assumptions inferred from candidate names. No compiler is imported at runtime. */
export async function compileTailwindProfile(
  profile: TailwindBackend,
  options: { compile: TailwindCompiler; source: string },
): Promise<string> {
  const checks = [
    ...profile.mappings.map((mapping) => ({
      ...mapping,
      expected: serializeCssValue(mapping.field, mapping.value),
    })),
    ...profile.parameters.map((mapping) => ({
      ...mapping,
      expected: `var(${mapping.variable})`,
    })),
  ]
  for (const check of checks) {
    const probe = await options.compile(
      `${options.source}\n.toned_mapping_probe { @apply ${check.utility}; }`,
    )
    assertProbe(probe.build([]), check.field, check.expected, check.utility)
  }
  const compiler = await options.compile(options.source)
  const css = compiler.build([...profile.candidates])
  const selectors = blockHeaders(css)
  for (const candidate of profile.candidates) {
    const selector =
      '.' + candidate.replace(/[^a-zA-Z0-9_-]/g, (value) => `\\${value}`)
    if (!selectors.has(selector))
      throw new Error(
        `Toned Tailwind build: missing compiled candidate ${candidate}; include @tailwind utilities`,
      )
  }
  return css
}
