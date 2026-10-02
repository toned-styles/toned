/** A namespace is a build identity, not a selector scope or a runtime theme. */
export function validateSystemId(id: string): string {
  if (!/^[a-z][a-z0-9-]*$/.test(id))
    throw new Error(
      'Toned: system id must be a lowercase kebab-case CSS identifier',
    )
  return id
}
const outsideStrings = (value: string, transform: (text: string) => string) =>
  value
    .split(
      /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|url\([^)]*\))/g,
    )
    .map((piece, i) => (i % 2 ? piece : transform(piece)))
    .join('')
export function externalCssVariables(
  names: readonly string[] = [],
): readonly string[] {
  if (names.some((name) => !/^--[a-zA-Z_][\w-]*$/.test(name)))
    throw new Error(
      'Toned: external CSS variables must be complete custom-property names',
    )
  return Object.freeze([...new Set(names)].sort())
}
const parameters = (value: string, id: string, external: ReadonlySet<string>) =>
  outsideStrings(value, (part) =>
    part.replace(/--[a-zA-Z_][\w-]*/g, (name) =>
      external.has(name) ? name : `--${id}-${name.slice(2)}`,
    ),
  )
const animations = (value: string, id: string) =>
  value.replace(/(?<![\w-])toned_([\w-]+)/g, `${id}-toned_$1`)
export function namespaceCss(
  css: string,
  id: string,
  options?: { scope?: string; externalCssVariables?: readonly string[] },
): string {
  validateSystemId(id)
  const external = new Set(externalCssVariables(options?.externalCssVariables))
  return outsideStrings(parameters(css, id, external), (part) =>
    animations(part, id),
  ).replace(/([^{}]+)\{/g, (block, selector: string) => {
    if (selector.trimStart().startsWith('@')) return block
    // The caller's scope prefixes every selector in the list, each possibly
    // after whitespace (a later rule, a list item, a rule inside an at-rule).
    return `${selectorList(selector)
      .map((item) => {
        const lead = item.length - item.trimStart().length
        const scoped =
          options?.scope && item.startsWith(`${options.scope} `, lead)
            ? lead + options.scope.length + 1
            : lead
        return (
          item.slice(0, scoped) +
          outsideStrings(item.slice(scoped), (part) =>
            part.replace(
              /\.((?:\\.|[-_a-zA-Z])(?:\\.|[-_a-zA-Z0-9])*)/g,
              (_match, name: string) =>
                name === '_' || name === '_s' ? `.${name}` : `.${id}--${name}`,
            ),
          )
        )
      })
      .join(',')}{`
  })
}
/** Splits a selector list on its top-level commas, keeping each item's spacing. */
function selectorList(selector: string): string[] {
  const items: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < selector.length; i++) {
    const char = selector[i]
    if (quote) {
      if (char === '\\') i++
      else if (char === quote) quote = ''
    } else if (char === '"' || char === "'") quote = char
    else if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth--
    else if (char === ',' && depth === 0) {
      items.push(selector.slice(start, i))
      start = i + 1
    }
  }
  items.push(selector.slice(start))
  return items
}
export function namespaceOutput<
  T extends { style: object; className?: string },
>(
  output: T,
  id: string,
  options?: { externalCssVariables?: readonly string[] },
): T {
  validateSystemId(id)
  const external = new Set(externalCssVariables(options?.externalCssVariables))
  const style: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(output.style)) {
    style[key.startsWith('--') ? parameters(key, id, external) : key] =
      typeof value === 'string'
        ? outsideStrings(parameters(value, id, external), (part) =>
            animations(part, id),
          )
        : value
  }
  return {
    ...output,
    style,
    ...(output.className !== undefined
      ? {
          className: output.className
            .split(/\s+/)
            .filter(Boolean)
            .map((name) =>
              name === '_' || name === '_s' ? name : `${id}--${name}`,
            )
            .join(' '),
        }
      : {}),
  }
}
