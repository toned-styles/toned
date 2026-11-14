/**
 * CSS shorthands and the longhands a sheet can also set.
 *
 * A web part's conditional fields compile into one inline style, each as
 * `field: var(--rule, <previous value or revert-layer>)`. When a part sets a
 * shorthand and one of its longhands, and one of them is conditional, the
 * two are separate inline declarations of overlapping properties: outside its
 * condition the conditional one falls back to `revert-layer` and takes the
 * other's value with it (`transition: opacity .2s` beside a conditional
 * `transitionProperty` computes `transition-property: all`).
 *
 * `separateShorthands` therefore splits such a shorthand into its longhands
 * before lowering, so each longhand has one chain. A shorthand whose value
 * cannot be split statically (a `var()`, an `animation` naming keyframes, a
 * layered `background`) is rejected with the fix instead.
 *
 * @module core/shorthands
 */

import { isCssWideKeyword } from '../utils/css-value.ts'

const sides = ['Top', 'Right', 'Bottom', 'Left'] as const

/** Shorthand → the longhands it sets (never another shorthand). Literal, so
 * the type-level check in types/cascade.ts reads the same table. */
export const SHORTHANDS = {
  transition: [
    'transitionProperty',
    'transitionDuration',
    'transitionTimingFunction',
    'transitionDelay',
    'transitionBehavior',
  ],
  animation: [
    'animationName',
    'animationDuration',
    'animationTimingFunction',
    'animationDelay',
    'animationIterationCount',
    'animationDirection',
    'animationFillMode',
    'animationPlayState',
    'animationTimeline',
    'animationComposition',
    'animationRangeStart',
    'animationRangeEnd',
  ],
  background: [
    'backgroundColor',
    'backgroundImage',
    'backgroundPositionX',
    'backgroundPositionY',
    'backgroundSize',
    'backgroundRepeat',
    'backgroundAttachment',
    'backgroundOrigin',
    'backgroundClip',
  ],
  backgroundPosition: ['backgroundPositionX', 'backgroundPositionY'],
  outline: ['outlineWidth', 'outlineStyle', 'outlineColor'],
  overflow: ['overflowX', 'overflowY'],
  border: [
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderTopStyle',
    'borderRightStyle',
    'borderBottomStyle',
    'borderLeftStyle',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
  ],
  borderTop: ['borderTopWidth', 'borderTopStyle', 'borderTopColor'],
  borderRight: ['borderRightWidth', 'borderRightStyle', 'borderRightColor'],
  borderBottom: ['borderBottomWidth', 'borderBottomStyle', 'borderBottomColor'],
  borderLeft: ['borderLeftWidth', 'borderLeftStyle', 'borderLeftColor'],
  borderWidth: [
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
  ],
  borderStyle: [
    'borderTopStyle',
    'borderRightStyle',
    'borderBottomStyle',
    'borderLeftStyle',
  ],
  borderColor: [
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
  ],
  borderRadius: [
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomRightRadius',
    'borderBottomLeftRadius',
  ],
  padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  margin: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
  inset: ['top', 'right', 'bottom', 'left'],
  gap: ['rowGap', 'columnGap'],
  flex: ['flexGrow', 'flexShrink', 'flexBasis'],
  flexFlow: ['flexDirection', 'flexWrap'],
  placeItems: ['alignItems', 'justifyItems'],
  placeContent: ['alignContent', 'justifyContent'],
  placeSelf: ['alignSelf', 'justifySelf'],
  textDecoration: [
    'textDecorationLine',
    'textDecorationStyle',
    'textDecorationColor',
    'textDecorationThickness',
  ],
  font: [
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'lineHeight',
    'fontFamily',
  ],
  listStyle: ['listStyleType', 'listStylePosition', 'listStyleImage'],
  gridArea: ['gridRowStart', 'gridColumnStart', 'gridRowEnd', 'gridColumnEnd'],
  gridRow: ['gridRowStart', 'gridRowEnd'],
  gridColumn: ['gridColumnStart', 'gridColumnEnd'],
  columns: ['columnWidth', 'columnCount'],
} as const satisfies Readonly<Record<string, readonly string[]>>
export type Shorthand = keyof typeof SHORTHANDS
const TABLE: Readonly<Record<string, readonly string[]>> = SHORTHANDS

const OWNERS = new Map<string, string[]>()
for (const [shorthand, longhands] of Object.entries(TABLE))
  for (const longhand of longhands)
    OWNERS.set(longhand, [...(OWNERS.get(longhand) ?? []), shorthand])

/** The shorthands that set `longhand`. */
export const shorthandsOf = (longhand: string): readonly string[] =>
  OWNERS.get(longhand) ?? []

/** Whether two fields set any property in common. */
function overlaps(shorthand: string, field: string): boolean {
  if (field === shorthand) return false
  const longhands = TABLE[shorthand]!
  if (longhands.includes(field)) return true
  const other = TABLE[field]
  return !!other && other.some((longhand) => longhands.includes(longhand))
}

/** Splits at top-level `separator` (whitespace or a comma), keeping
 * functions and quoted strings whole. */
function split(value: string, separator: ',' | ' ' | '/'): string[] {
  const parts: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  const isSeparator = (char: string) =>
    separator === ' ' ? /\s/.test(char) : char === separator
  for (let index = 0; index < value.length; index++) {
    const char = value[index]!
    if (char === '\\') {
      index++
      continue
    }
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === '(') depth++
    else if (char === ')') depth--
    else if (depth === 0 && isSeparator(char)) {
      const part = value.slice(start, index).trim()
      if (part || separator !== ' ') parts.push(part)
      start = index + 1
    }
  }
  const last = value.slice(start).trim()
  if (last || separator !== ' ') parts.push(last)
  return parts
}

const LENGTH = /^[-+]?(\d*\.)?\d+([a-z]+|%)?$/i
const TIME = /^[-+]?(\d*\.)?\d+m?s$/i
const MATH = /^(calc|min|max|clamp)\(/i
const BORDER_STYLES = new Set([
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
])
const EASINGS = new Set([
  'ease',
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
])
const BACKGROUND_KEYWORDS = new Set([
  'none',
  'auto',
  'cover',
  'contain',
  'repeat',
  'no-repeat',
  'repeat-x',
  'repeat-y',
  'space',
  'round',
  'scroll',
  'fixed',
  'local',
  'top',
  'right',
  'bottom',
  'left',
  'center',
  'border-box',
  'padding-box',
  'content-box',
  'text',
])
const COLOR_FUNCTION =
  /^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i

const isLength = (token: string) => LENGTH.test(token) || MATH.test(token)
const isColor = (token: string) =>
  /^#[0-9a-f]{3,8}$/i.test(token) ||
  COLOR_FUNCTION.test(token) ||
  (/^[a-z]+$/i.test(token) &&
    !BACKGROUND_KEYWORDS.has(token.toLowerCase()) &&
    !isCssWideKeyword(token))

/** A width/style/color triple in any order (`border`, `outline`). */
function line(
  tokens: readonly string[],
  styles: ReadonlySet<string>,
): [width: string, style: string, color: string] | undefined {
  let width: string | undefined
  let style: string | undefined
  let color: string | undefined
  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (!style && styles.has(lower)) style = token
    else if (
      !width &&
      (isLength(token) || ['thin', 'medium', 'thick'].includes(lower))
    )
      width = token
    else if (!color && isColor(token)) color = token
    else return undefined
  }
  return [width ?? 'medium', style ?? 'none', color ?? 'currentcolor']
}

/** One to four box values, CSS order: top, right, bottom, left. */
function box(tokens: readonly unknown[]): unknown[] | undefined {
  if (!tokens.length || tokens.length > 4) return undefined
  return [
    tokens[0],
    tokens[1] ?? tokens[0],
    tokens[2] ?? tokens[0],
    tokens[3] ?? tokens[1] ?? tokens[0],
  ]
}

const zip = (fields: readonly string[], values: readonly unknown[]) =>
  Object.fromEntries(fields.map((field, index) => [field, values[index]]))

function transition(value: string): Record<string, unknown> | undefined {
  const items = split(value, ',').map((item) => {
    let property: string | undefined
    let easing: string | undefined
    let behavior: string | undefined
    const times: string[] = []
    for (const token of split(item, ' ')) {
      const lower = token.toLowerCase()
      if (TIME.test(token)) times.push(token)
      else if (
        !easing &&
        (EASINGS.has(lower) || /^(cubic-bezier|steps|linear)\(/i.test(token))
      )
        easing = token
      else if (!behavior && ['normal', 'allow-discrete'].includes(lower))
        behavior = token
      else if (!property && /^-?[a-z_][\w-]*$/i.test(token)) property = token
      else return undefined
    }
    if (times.length > 2) return undefined
    return [
      property ?? 'all',
      times[0] ?? '0s',
      easing ?? 'ease',
      times[1] ?? '0s',
      behavior ?? 'normal',
    ]
  })
  if (items.some((item) => !item)) return undefined
  return zip(
    SHORTHANDS['transition']!,
    [0, 1, 2, 3, 4].map((index) =>
      items.map((item) => item![index]).join(', '),
    ),
  )
}

function flex(tokens: readonly string[]): string[] | undefined {
  const keyword = tokens.length === 1 ? tokens[0]!.toLowerCase() : ''
  if (keyword === 'none') return ['0', '0', 'auto']
  if (keyword === 'auto') return ['1', '1', 'auto']
  const number = (token: string | undefined) =>
    token !== undefined && /^(\d*\.)?\d+$/.test(token)
  const [first, second, third] = tokens
  if (tokens.length === 1)
    return number(first) ? [first!, '1', '0%'] : ['1', '1', first!]
  if (tokens.length === 2)
    return number(second)
      ? number(first)
        ? [first!, second!, '0%']
        : undefined
      : number(first)
        ? [first!, '1', second!]
        : undefined
  if (tokens.length === 3 && number(first) && number(second))
    return [first!, second!, third!]
  return undefined
}

/**
 * The longhands `value` sets, or undefined when it cannot be decided without
 * the browser (custom properties, keyframe names, layered values).
 */
export function expandShorthand(
  field: string,
  value: unknown,
): Record<string, unknown> | undefined {
  const longhands = TABLE[field]
  if (!longhands) return undefined
  if (typeof value === 'number') {
    if (['padding', 'margin', 'inset', 'gap', 'borderWidth'].includes(field))
      return zip(
        longhands,
        longhands.map(() => value),
      )
    if (field === 'borderRadius')
      return zip(
        longhands,
        longhands.map(() => value),
      )
    if (field === 'flex') value = String(value)
    else return undefined
  }
  if (typeof value !== 'string') return undefined
  if (/\b(var|env|attr)\(/i.test(value) || isCssWideKeyword(value))
    return undefined
  const tokens = split(value, ' ')
  switch (field) {
    case 'transition':
      return transition(value)
    case 'outline': {
      const parts = line(tokens, new Set([...BORDER_STYLES, 'auto']))
      return parts && zip(longhands, parts)
    }
    case 'border':
    case 'borderTop':
    case 'borderRight':
    case 'borderBottom':
    case 'borderLeft': {
      const parts = line(tokens, BORDER_STYLES)
      if (!parts) return undefined
      return field === 'border'
        ? zip(
            longhands,
            [0, 1, 2].flatMap((index) => sides.map(() => parts[index])),
          )
        : zip(longhands, parts)
    }
    case 'padding':
    case 'margin':
    case 'inset':
    case 'borderWidth':
    case 'borderStyle':
    case 'borderColor': {
      const values = box(tokens)
      return values && zip(longhands, values)
    }
    case 'borderRadius': {
      const [horizontal, vertical, extra] = split(value, '/')
      if (extra !== undefined) return undefined
      const x = box(split(horizontal!, ' '))
      const y = vertical === undefined ? x : box(split(vertical, ' '))
      if (!x || !y) return undefined
      return zip(
        longhands,
        x.map((across, index) =>
          vertical === undefined ? across : `${across} ${y[index]}`,
        ),
      )
    }
    case 'overflow':
    case 'gap':
    case 'placeItems':
    case 'placeContent':
    case 'placeSelf': {
      if (tokens.length < 1 || tokens.length > 2) return undefined
      if (
        tokens.some((token) =>
          ['first', 'last', 'safe', 'unsafe', 'legacy'].includes(
            token.toLowerCase(),
          ),
        )
      )
        return undefined
      return zip(longhands, [tokens[0], tokens[1] ?? tokens[0]])
    }
    case 'flex': {
      const parts = flex(tokens)
      return parts && zip(longhands, parts)
    }
    case 'flexFlow': {
      let direction: string | undefined
      let wrap: string | undefined
      for (const token of tokens) {
        const lower = token.toLowerCase()
        if (
          !direction &&
          ['row', 'row-reverse', 'column', 'column-reverse'].includes(lower)
        )
          direction = token
        else if (!wrap && ['nowrap', 'wrap', 'wrap-reverse'].includes(lower))
          wrap = token
        else return undefined
      }
      return zip(longhands, [direction ?? 'row', wrap ?? 'nowrap'])
    }
    case 'background': {
      if (tokens.length !== 1 || !isColor(tokens[0]!)) return undefined
      return zip(longhands, [
        tokens[0],
        'none',
        '0%',
        '0%',
        'auto',
        'repeat',
        'scroll',
        'padding-box',
        'border-box',
      ])
    }
    default:
      return undefined
  }
}

type FieldOperation = {
  readonly field: string
  readonly value: unknown
}

/**
 * Splits every shorthand that shares a property with another field of the
 * same part into its longhands, so a conditional field can never revert
 * another's value. A shorthand that cannot be split is kept when every
 * overlapping field is unconditional (static order decides, as authored) and
 * rejected otherwise.
 */
export function separateShorthands<T extends FieldOperation>(
  operations: readonly T[],
  part: string,
  unconditional: (operation: T) => boolean,
): readonly T[] {
  let shorthands: Set<string> | undefined
  for (const operation of operations)
    if (TABLE[operation.field] && operation.value != null)
      (shorthands ??= new Set()).add(operation.field)
  if (!shorthands) return operations
  const fields = new Set(
    operations
      .filter((operation) => operation.value != null)
      .map((operation) => operation.field),
  )
  const split = new Set<string>()
  for (const shorthand of shorthands) {
    const others = [...fields].filter((field) => overlaps(shorthand, field))
    if (!others.length) continue
    split.add(shorthand)
    for (const other of others) if (TABLE[other]) split.add(other)
  }
  if (!split.size) return operations
  const output: T[] = []
  for (const operation of operations) {
    if (!split.has(operation.field) || operation.value == null) {
      output.push(operation)
      continue
    }
    const longhands = expandShorthand(operation.field, operation.value)
    if (longhands) {
      for (const [field, value] of Object.entries(longhands))
        output.push({ ...operation, field, value })
      continue
    }
    const involved = operations.filter(
      (other) =>
        other.value != null &&
        (other === operation || overlaps(operation.field, other.field)),
    )
    if (involved.every(unconditional)) {
      output.push(operation)
      continue
    }
    const other = involved.find((item) => item !== operation)!
    throw new Error(
      `Toned: part '${part}' sets '${operation.field}' and '${other.field}', and one of them only under a condition. Outside that condition the conditional one reverts the other, and '${operation.field}: ${String(operation.value)}' cannot be split into longhands statically. Write the longhands (${TABLE[operation.field]!.join(', ')}) instead of '${operation.field}', or set '${operation.field}' in full in each condition.`,
    )
  }
  return output
}
