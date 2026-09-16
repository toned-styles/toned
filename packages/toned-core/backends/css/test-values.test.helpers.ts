/** Unit-test substitution of generated guards. Real browser conformance covers
 * CSS parsing/cascade; these assertions inspect outcomes rather than slot names. */
export function cssTestValue(
  input: object,
  field: string,
  toggles: Record<string, boolean | string> = {},
): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new TypeError('CSS test values require a style object')
  const style = input as Record<string, unknown>
  if (typeof style[field] !== 'string') return style[field]
  const replace = (
    text: string,
    seen = new Set<string>(),
  ): string | undefined => {
    let result = '',
      offset = 0
    while (true) {
      const start = text.indexOf('var(', offset)
      if (start < 0) return result + text.slice(offset)
      result += text.slice(offset, start)
      let depth = 1,
        cursor = start + 4,
        comma = -1
      for (; cursor < text.length && depth; cursor++) {
        if (text[cursor] === '(') depth++
        if (text[cursor] === ')') depth--
        if (text[cursor] === ',' && depth === 1 && comma === -1) comma = cursor
      }
      const name = text
        .slice(start + 4, comma === -1 ? cursor - 1 : comma)
        .trim()
      let value: string | undefined
      const toggle = toggles[name]
      if (toggle !== undefined)
        value =
          typeof toggle === 'boolean' ? (toggle ? ' ' : undefined) : toggle
      else if (Object.hasOwn(style, name)) {
        const source = style[name]
        if (!seen.has(name) && source !== 'initial')
          value = replace(String(source), new Set([...seen, name]))
      } else if (
        !/^--(?:[^ ]*-)?(?:media-|cq-|toned_|toned-predicate-)/.test(name)
      )
        value = text.slice(start, cursor)
      if (value === undefined && comma !== -1)
        value = replace(text.slice(comma + 1, cursor - 1), seen)
      if (value === undefined) return undefined
      result += value
      offset = cursor
    }
  }
  return replace(style[field] as string)?.trim()
}
