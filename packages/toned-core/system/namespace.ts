/** A namespace is a build identity, not a selector scope or a runtime theme. */
export function validateSystemId(id: string): string {
  if (!/^[a-z][a-z0-9-]*$/.test(id))
    throw new Error('Toned: system id must be a lowercase kebab-case CSS identifier')
  return id
}
const outsideStrings = (value: string, transform: (text: string) => string) =>
  value
    .split(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|url\([^)]*\))/g)
    .map((piece, i) => (i % 2 ? piece : transform(piece)))
    .join('')
const parameters = (value: string, id: string) =>
  outsideStrings(value, part =>
    part.replace(/--[a-zA-Z_][\w-]*/g, name => `--${id}-${name.slice(2)}`),
  )
const animations = (value: string, id: string) =>
  value.replace(/(?<![\w-])toned_([\w-]+)/g, `${id}-toned_$1`)
export function namespaceCss(css: string, id: string, options?: { scope?: string }): string {
  validateSystemId(id)
  return outsideStrings(parameters(css, id), part => animations(part, id)).replace(
    /([^{}]+)\{/g,
    (block, selector: string) => {
      if (selector.trimStart().startsWith('@')) return block
      const prefix =
        options?.scope && selector.startsWith(`${options.scope} `) ? `${options.scope} ` : ''
      const owned = selector.slice(prefix.length)
      return `${prefix}${outsideStrings(owned, part =>
        part.replace(/\.((?:\\.|[-_a-zA-Z])(?:\\.|[-_a-zA-Z0-9])*)/g, (_match, name: string) =>
          name === '_' || name === '_s' ? `.${name}` : `.${id}--${name}`,
        ),
      )}{`
    },
  )
}
export function namespaceOutput<T extends { style: object; className?: string }>(
  output: T,
  id: string,
): T {
  validateSystemId(id)
  const style: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(output.style)) {
    style[key.startsWith('--') ? parameters(key, id) : key] =
      typeof value === 'string'
        ? outsideStrings(parameters(value, id), part => animations(part, id))
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
            .map(name => (name === '_' || name === '_s' ? name : `${id}--${name}`))
            .join(' '),
        }
      : {}),
  }
}
