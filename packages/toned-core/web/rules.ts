import type { Properties } from 'csstype'
import { camelToKebab } from '../utils/css.ts'
import { serializeCssValue } from '../utils/css-value.ts'

const WEB_RULES = Symbol.for('toned:web-rules')
export type WebRuleStyle = Readonly<
  Properties<string | number> & { [P in `--${string}`]?: string | number }
>
export type WebRules = Readonly<{
  [WEB_RULES]: true
  rules: Readonly<Record<`&${string}`, WebRuleStyle>>
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
): WebRules {
  const rules: Record<`&${string}`, WebRuleStyle> = {}
  for (const [selector, style] of Object.entries(input)) {
    // One anchored selector per rule, including nested selector lists.
    // Top-level lists need separate entries; at-rules belong in typed queries.
    if (!isAnchoredSelector(selector))
      throw new Error(
        `Toned: webRules selector must be one anchored selector: ${selector}`,
      )
    rules[selector as `&${string}`] = Object.freeze({ ...style })
  }
  return Object.freeze({
    [WEB_RULES]: true as const,
    rules: Object.freeze(rules),
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
  const content = JSON.stringify(value.rules)
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
  const css = Object.entries(value.rules)
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
    .join('\n')
  return { className, css }
}
