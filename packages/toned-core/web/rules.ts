import type { Properties } from 'csstype'
import { camelToKebab } from '../utils/css.ts'
import { serializeCssValue } from '../utils/css-value.ts'

/** Exported for declaration emit of sheets carrying the opaque extension type. */
export const WEB_RULES = Symbol.for('toned:web-rules')
export type WebRuleStyle = Readonly<
  Properties<string | number> & { [P in `--${string}`]?: string | number }
>
export type WebRules = Readonly<{
  [WEB_RULES]: true
  rules: Readonly<Record<`&${string}`, WebRuleStyle>>
  media?: Readonly<Record<string, WebRules>>
}>

/** A comma is a selector-list separator only outside functions, attributes and strings. */
function isAnchoredSelector(selector: string): boolean {
  if (!selector.startsWith('&')) return false
  const stack: string[] = []
  let quote = ''
  let escaped = false
  for (const char of selector) {
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
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
    if (char === '{' || char === '}' || (char === ',' && !stack.length))
      return false
    if (char === '(') stack.push(')')
    else if (char === '[') stack.push(']')
    else if ((char === ')' || char === ']') && stack.pop() !== char)
      return false
  }
  return !quote && !escaped && !stack.length
}

/** Explicit CSS-only selectors anchored to the owning part. Selector order is cascade order. */
export function webRules<
  const Input extends Record<`&${string}`, WebRuleStyle>,
>(
  input: Input & {
    [K in keyof Input]: K extends `&${string}`
      ? Input[K] & Record<Exclude<keyof Input[K], keyof WebRuleStyle>, never>
      : never
  },
  options?: { media?: Readonly<Record<string, WebRules>> },
): WebRules {
  const rules: Record<`&${string}`, WebRuleStyle> = {}
  for (const [selector, style] of Object.entries(input)) {
    // One anchored selector per rule, including nested selector lists.
    // Top-level lists need separate entries; media groups are explicit below.
    if (!isAnchoredSelector(selector))
      throw new Error(
        `Toned: webRules selector must be one anchored selector: ${selector}`,
      )
    rules[selector as `&${string}`] = Object.freeze({ ...style })
  }
  const media: Record<string, WebRules> = Object.create(null)
  for (const [query, group] of Object.entries(options?.media ?? {})) {
    // This is a CSS-only escape hatch, not a portable query. Reject block
    // delimiters/comments; the browser owns support for the media grammar.
    if (!query.trim() || query.length > 512 || /[{};@]|\/\*|\*\//.test(query))
      throw new Error(`Toned: invalid webRules media query: ${query}`)
    if (!isWebRules(group))
      throw new Error('Toned: webRules media groups must use webRules()')
    media[query] = group
  }
  return Object.freeze({
    [WEB_RULES]: true as const,
    rules: Object.freeze(rules),
    ...(Object.keys(media).length ? { media: Object.freeze(media) } : {}),
  })
}

export function isWebRules(value: unknown): value is WebRules {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as WebRules)[WEB_RULES] === true
  )
}

/** Replace CSS nesting selectors without rewriting quoted attribute values. */
function anchorSelector(selector: string, className: string): string {
  let quote = ''
  let escaped = false
  let result = ''
  for (const character of selector) {
    if (escaped) {
      result += character
      escaped = false
      continue
    }
    if (character === '\\') {
      result += character
      escaped = true
      continue
    }
    if (quote) {
      result += character
      if (character === quote) quote = ''
      continue
    }
    if (character === '"' || character === "'") quote = character
    result += character === '&' ? `.${className}` : character
  }
  return result
}

/** CSS emission boundary. Content-derived identity deduplicates equal authored blocks. */
export function compileWebRules(
  value: WebRules,
  namespace = 'toned',
  scope?: string,
): { className: string; css: string } {
  if (!isWebRules(value))
    throw new Error('Toned: $webRules must be constructed with webRules()')
  // Preserve the identity of existing selector-only blocks.
  const content = JSON.stringify(value.media ? value : value.rules)
  // Two independent 32-bit accumulators reduce collision risk without a crypto
  // or platform dependency. Content is retained by build collectors to detect collisions.
  let a = 2166136261,
    b = 5381
  for (let i = 0; i < content.length; i++) {
    a = Math.imul(a ^ content.charCodeAt(i), 16777619)
    b = Math.imul(b, 33) ^ content.charCodeAt(i)
  }
  const prefix = namespace.replace(
    /[^a-zA-Z0-9_-]/g,
    (char) => `_${char.charCodeAt(0).toString(16)}_`,
  )
  const className = `${prefix}-web-${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`
  const emit = (group: WebRules): string =>
    [
      Object.entries(group.rules)
        .map(([selector, style]) => {
          const declarations = Object.entries(style)
            .filter(([, value]) => value != null)
            .map(
              ([key, value]) =>
                `${camelToKebab(key)}:${serializeCssValue(key, value)};`,
            )
            .join('')
          return `${scope ? `${scope} ` : ''}${anchorSelector(selector, className)}{${declarations}}`
        })
        .join('\n'),
      ...Object.entries(group.media ?? {}).map(
        ([query, nested]) => `@media ${query}{\n${emit(nested)}\n}`,
      ),
    ]
      .filter(Boolean)
      .join('\n')
  const css = emit(value)
  return { className, css }
}
