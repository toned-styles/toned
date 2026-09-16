/** Serializable authoring values, lowered before any backend serializes fields. */
export type LayoutContext = Readonly<{
  direction?: 'ltr' | 'rtl'
  writingMode?: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr'
}>
export type LogicalLength = Readonly<{
  $tonedValue: 'length'
  unit: 'dp' | '%'
  value: number
}>
export type PortableColor = Readonly<{
  $tonedValue: 'color'
  red: number
  green: number
  blue: number
  alpha: number
}>
export type ThemeReference<
  Value = unknown,
  Key extends string = string,
> = Readonly<{
  $tonedValue: 'theme'
  key: Key
  readonly __value__?: Value
}>
const finite = (value: number) => {
  if (!Number.isFinite(value))
    throw new Error('Toned: portable values must be finite')
  return value
}
/** Logical layout units: CSS pixels on web, density-independent units on native. */
export const dp = <const N extends number>(
  value: N,
): LogicalLength & { unit: 'dp'; value: N } => {
  if (value < 0) throw new Error('Toned: invalid negative dp length')
  return Object.freeze({
    $tonedValue: 'length',
    unit: 'dp',
    value: finite(value) as N,
  })
}
export const percent = (value: number): LogicalLength =>
  Object.freeze({ $tonedValue: 'length', unit: '%', value: finite(value) })
/** sRGB channels are 0..255; alpha is a 0..1 fraction. */
export function rgba(
  red: number,
  green: number,
  blue: number,
  alpha = 1,
): PortableColor {
  for (const channel of [red, green, blue])
    if (finite(channel) < 0 || channel > 255)
      throw new Error('Toned: RGB channels must be in [0, 255]')
  if (finite(alpha) < 0 || alpha > 1)
    throw new Error('Toned: color alpha must be in [0, 1]')
  return Object.freeze({ $tonedValue: 'color', red, green, blue, alpha })
}
/** Bind references to the same theme schema used by a token authoring factory. */
export function themeRef<Theme extends object>() {
  return <const Key extends keyof Theme & string>(
    key: Key,
  ): ThemeReference<Theme[Key], Key> =>
    Object.freeze({ $tonedValue: 'theme', key })
}
export function isLogicalLength(value: unknown): value is LogicalLength {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as LogicalLength).$tonedValue === 'length'
  )
}
function materialize(
  value: unknown,
  tokens: Readonly<Record<string, unknown>>,
  visiting: Set<string>,
): unknown {
  if (!value || typeof value !== 'object') return value
  const tagged = value as LogicalLength | PortableColor | ThemeReference
  if (tagged.$tonedValue === 'length') {
    finite(tagged.value)
    if (tagged.unit !== 'dp' && tagged.unit !== '%')
      throw new Error('Toned: unsupported portable length unit')
    return tagged.unit === 'dp' ? tagged.value : `${tagged.value}%`
  }
  if (tagged.$tonedValue === 'color') {
    rgba(tagged.red, tagged.green, tagged.blue, tagged.alpha)
    return `rgba(${tagged.red}, ${tagged.green}, ${tagged.blue}, ${tagged.alpha})`
  }
  if (tagged.$tonedValue === 'theme') {
    if (!Object.hasOwn(tokens, tagged.key) || tokens[tagged.key] === undefined)
      throw new Error(`Toned: missing theme value ${tagged.key}`)
    if (visiting.has(tagged.key))
      throw new Error(`Toned: cyclic theme reference ${tagged.key}`)
    visiting.add(tagged.key)
    const resolved = materialize(tokens[tagged.key], tokens, visiting)
    visiting.delete(tagged.key)
    return resolved
  }
  if (Array.isArray(value))
    return value.map((member) => materialize(member, tokens, visiting))
  if (Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(
      Object.entries(value).map(([key, member]) => [
        key,
        materialize(member, tokens, visiting),
      ]),
    )
  return value
}

/** Logical fields expand in declaration order, so physical/logical overlaps have one winner. */
export function logicalFields(
  field: string,
  layout: LayoutContext & {
    canonicalFields?: boolean
    platform?: 'web' | 'native'
  } = {},
): readonly string[] {
  // Legacy web sheets inherit direction/writing-mode from their DOM ancestry.
  // Preserve CSS logical fields unless the author supplies a fixed layout.
  if (
    layout.platform === 'web' &&
    !layout.canonicalFields &&
    layout.direction === undefined &&
    layout.writingMode === undefined
  )
    return [field]
  if (layout.canonicalFields) {
    const sides = ['Top', 'Right', 'Bottom', 'Left']
    if (field === 'padding' || field === 'margin')
      return sides.map((side) => `${field}${side}`)
    if (field === 'inset') return sides.map((side) => side.toLowerCase())
    if (field === 'borderColor' || field === 'borderWidth')
      return sides.map((side) => `border${side}${field.slice('border'.length)}`)
  }
  const vertical = (layout.writingMode ?? 'horizontal-tb') !== 'horizontal-tb'
  const inline = vertical ? ['Top', 'Bottom'] : ['Left', 'Right']
  if (layout.direction === 'rtl') inline.reverse()
  const block = vertical
    ? layout.writingMode === 'vertical-rl'
      ? ['Right', 'Left']
      : ['Left', 'Right']
    : ['Top', 'Bottom']
  const edge = /^(padding|margin|inset)(Inline|Block)(Start|End)?$/.exec(field)
  if (edge) {
    const axis = edge[2] === 'Inline' ? inline : block
    const sides = edge[3] ? [axis[edge[3] === 'Start' ? 0 : 1]!] : axis
    return sides.map((side) =>
      edge[1] === 'inset' ? side.toLowerCase() : `${edge[1]}${side}`,
    )
  }
  const border = /^border(Inline|Block)(Start|End)?(Width|Color|Style)$/.exec(
    field,
  )
  if (border) {
    const axis = border[1] === 'Inline' ? inline : block
    const sides = border[2] ? [axis[border[2] === 'Start' ? 0 : 1]!] : axis
    return sides.map((side) => `border${side}${border[3]}`)
  }
  const size = /^(min|max)?(Inline|Block)Size$/.exec(field)
  if (size)
    return [
      `${size[1] ?? ''}${size[1] ? ((size[2] === 'Inline') !== vertical ? 'Width' : 'Height') : (size[2] === 'Inline') !== vertical ? 'width' : 'height'}`,
    ]
  // CSS uses lower-case initial inlineSize/blockSize.
  if (field === 'inlineSize') return [vertical ? 'height' : 'width']
  if (field === 'blockSize') return [vertical ? 'width' : 'height']
  return [field]
}
/** Separate CSS shorthand components while retaining spaces in color/math/var
 * functions and quoted literals. Runtime native values normally use one number. */
function shorthandValues(value: unknown, count: number): readonly unknown[] {
  const components: unknown[] = []
  if (typeof value === 'string') {
    let depth = 0,
      quote = '',
      start = 0
    for (let i = 0; i < value.length; i++) {
      const char = value[i]!
      if (char === '\\') {
        i++
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
      if (char === '(') depth++
      else if (char === ')') depth--
      else if (/\s/.test(char) && depth === 0) {
        if (i > start) components.push(value.slice(start, i))
        start = i + 1
      }
    }
    if (start < value.length) components.push(value.slice(start))
  } else components.push(value)
  if (!components.length || components.length > count)
    throw new Error(`Toned: expected one to ${count} shorthand components`)
  if (count === 2) return [components[0], components[1] ?? components[0]]
  return [
    components[0],
    components[1] ?? components[0],
    components[2] ?? components[0],
    components[3] ?? components[1] ?? components[0],
  ]
}

export function resolvePortableFields(
  fields: Readonly<Record<string, unknown>>,
  tokens: Readonly<Record<string, unknown>>,
  context: LayoutContext & {
    platform: 'web' | 'native'
    canonicalFields?: boolean
  },
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [field, value] of Object.entries(fields)) {
    const targets = logicalFields(field, context)
    if (
      context.platform === 'native' &&
      context.writingMode &&
      context.writingMode !== 'horizontal-tb'
    ) {
      const logicalTargets = logicalFields(field, {
        ...context,
        canonicalFields: false,
      })
      if (logicalTargets.length !== 1 || logicalTargets[0] !== field)
        throw new Error(
          'Toned native: vertical logical layout requires a host with writing-mode support',
        )
    }
    const resolved = materialize(value, tokens, new Set())
    const values =
      context.canonicalFields && targets.length > 1
        ? shorthandValues(resolved, targets.length)
        : targets.map(() => resolved)
    for (let index = 0; index < targets.length; index++)
      result[targets[index]!] = values[index]
  }
  return result
}
