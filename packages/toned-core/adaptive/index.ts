import type { VariantSelector } from '../stylesheet/variantSelector.ts'

/** Finite portable layout alternatives selected from layout-independent inputs. */
export type AdaptiveFlow = 'stack' | 'row' | 'wrap'
export type AdaptiveFrame = Readonly<{ width: number; height: number }>
export type AdaptiveInsets = Readonly<{
  top?: number
  right?: number
  bottom?: number
  left?: number
}>
export type AdaptiveMeasurements<Area extends string = string> = Readonly<{
  viewport?: AdaptiveFrame
  container?: AdaptiveFrame
  /** Intrinsic, unwrapped content extents at the current text scale. */
  content?: Readonly<Partial<Record<Area, AdaptiveFrame>>>
  textScale?: number
  keyboardHeight?: number
  safeArea?: AdaptiveInsets
}>
export type AdaptiveCondition = Readonly<{
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  minTextScale?: number
  maxTextScale?: number
  keyboard?: 'shown' | 'hidden'
  content?: 'fits'
}>
export type AdaptiveArea = Readonly<{
  grow?: number
  shrink?: number
  basis?: number
}>
export type AdaptiveCandidate<Area extends string = string> = Readonly<{
  flow: AdaptiveFlow
  gap?: number
  when?: AdaptiveCondition
  areas?: Readonly<Partial<Record<Area, AdaptiveArea>>>
}>
export type AdaptiveHysteresis = Readonly<{ size?: number; textScale?: number }>
type PortableRootStyle = Readonly<{
  display: 'flex'
  flexDirection: 'column' | 'row'
  flexWrap: 'nowrap' | 'wrap'
  gap: number
}>
type PortableAreaStyle = Readonly<{
  flexGrow: number
  flexShrink: number
  flexBasis: number | 'auto'
}>
export type AdaptiveRule<Root extends string, Area extends string> = {
  readonly [P in Root]: { readonly $style: PortableRootStyle }
} & { readonly [P in Area]: { readonly $style: PortableAreaStyle } }
export interface AdaptiveLayout<
  Axis extends string = string,
  Name extends string = string,
  Root extends string = string,
  Area extends string = string,
> {
  readonly axis: Axis
  readonly root: Root
  /** Source/reading order. Alternatives never emit order or reverse directions. */
  readonly areas: readonly Area[]
  readonly names: readonly Name[]
  readonly fallback: Name
  readonly space: 'container' | 'viewport'
  readonly layouts: Readonly<Record<Name, AdaptiveCandidate<Area>>>
  select(measurements: AdaptiveMeasurements<Area>, current?: Name): Name
  variants(name: Name): Readonly<Record<Axis, Name>>
  rules(
    selector: VariantSelector<Record<Axis, Name>>,
  ): Readonly<Record<`[${Axis}=${Name}]`, AdaptiveRule<Root, Area>>>
}
export type AdaptiveLayoutName<T> = T extends AdaptiveLayout<
  any,
  infer Name,
  any,
  any
>
  ? Name
  : never
export type AdaptiveLayoutAreas<T> = T extends AdaptiveLayout<
  any,
  any,
  any,
  infer Area
>
  ? Area
  : never
type CheckedCandidates<Layouts, Area extends string> = {
  [Name in keyof Layouts]: Record<
    Exclude<keyof Layouts[Name], keyof AdaptiveCandidate>,
    never
  > &
    (Layouts[Name] extends { when: infer When }
      ? {
          when: When &
            Record<Exclude<keyof When, keyof AdaptiveCondition>, never>
        }
      : unknown) &
    (Layouts[Name] extends { areas: infer Parts }
      ? {
          areas: Parts &
            Record<Exclude<keyof Parts, Area>, never> & {
              [P in keyof Parts]: Parts[P] &
                Record<Exclude<keyof Parts[P], keyof AdaptiveArea>, never>
            }
        }
      : unknown)
}

const MAX_LAYOUTS = 32
const MAX_AREAS = 128
const own = (value: object, key: PropertyKey) => Object.hasOwn(value, key)
const namePattern = /^[A-Za-z][A-Za-z0-9_-]*$/
function name(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== 'string' ||
    !namePattern.test(value) ||
    ['prototype', 'constructor', '__proto__'].includes(value)
  )
    throw new Error(`Toned adaptive: invalid ${label} name ${String(value)}`)
}
function number(
  value: unknown,
  label: string,
  positive = false,
): asserts value is number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    (positive && value === 0)
  )
    throw new Error(
      `Toned adaptive: ${label} must be a finite ${positive ? 'positive' : 'nonnegative'} number`,
    )
}
function frame(value: AdaptiveFrame, label: string): AdaptiveFrame {
  if (!value || typeof value !== 'object')
    throw new Error(`Toned adaptive: invalid ${label} frame`)
  number(value.width, `${label}.width`)
  number(value.height, `${label}.height`)
  return Object.freeze({ width: value.width, height: value.height })
}
/** Canonical immutable snapshots, bounded by the definition's finite areas. */
function snapshot<Area extends string>(
  areas: readonly Area[],
  input: AdaptiveMeasurements<Area>,
): AdaptiveMeasurements<Area> {
  if (!input || typeof input !== 'object')
    throw new Error('Toned adaptive: measurements must be an object')
  for (const key of Object.keys(input))
    if (
      ![
        'viewport',
        'container',
        'content',
        'textScale',
        'keyboardHeight',
        'safeArea',
      ].includes(key)
    )
      throw new Error(`Toned adaptive: unknown measurement ${key}`)
  const output: {
    viewport?: AdaptiveFrame
    container?: AdaptiveFrame
    content?: Partial<Record<Area, AdaptiveFrame>>
    textScale?: number
    keyboardHeight?: number
    safeArea?: AdaptiveInsets
  } = {}
  for (const key of ['viewport', 'container'] as const)
    if (input[key] !== undefined) output[key] = frame(input[key], key)
  if (input.textScale !== undefined) {
    number(input.textScale, 'textScale', true)
    output.textScale = input.textScale
  }
  if (input.keyboardHeight !== undefined) {
    number(input.keyboardHeight, 'keyboardHeight')
    output.keyboardHeight = input.keyboardHeight
  }
  if (input.safeArea !== undefined) {
    if (!input.safeArea || typeof input.safeArea !== 'object')
      throw new Error('Toned adaptive: invalid safe area')
    const insets: Record<string, number> = {}
    for (const key of Object.keys(input.safeArea))
      if (!['top', 'right', 'bottom', 'left'].includes(key))
        throw new Error(`Toned adaptive: unknown safe-area edge ${key}`)
    for (const key of ['top', 'right', 'bottom', 'left'] as const) {
      const value = input.safeArea[key] ?? 0
      number(value, `safeArea.${key}`)
      insets[key] = value
    }
    output.safeArea = Object.freeze(insets)
  }
  if (input.content !== undefined) {
    if (!input.content || typeof input.content !== 'object')
      throw new Error('Toned adaptive: invalid intrinsic content measurements')
    for (const key of Object.keys(input.content))
      if (!areas.includes(key as Area))
        throw new Error(`Toned adaptive: unknown content area ${key}`)
    const content: Partial<Record<Area, AdaptiveFrame>> = {}
    for (const area of areas)
      if (input.content[area] !== undefined)
        content[area] = frame(input.content[area], `content.${area}`)
    output.content = Object.freeze(content)
  }
  return Object.freeze(output)
}

export function defineAdaptiveLayout<
  const Axis extends string,
  const Root extends string,
  const Areas extends readonly string[],
  const Layouts extends Record<string, AdaptiveCandidate<Areas[number]>>,
>(definition: {
  axis: Axis
  root: Root
  areas: Areas
  fallback: NoInfer<keyof Layouts & string>
  /** Required available-space source; absent measurements select the fallback. */
  space?: 'container' | 'viewport'
  hysteresis?: AdaptiveHysteresis
  layouts: Layouts & CheckedCandidates<Layouts, Areas[number]>
}): AdaptiveLayout<Axis, keyof Layouts & string, Root, Areas[number]> {
  type Name = keyof Layouts & string
  if (!definition || typeof definition !== 'object')
    throw new Error('Toned adaptive: definition must be an object')
  for (const field of Object.keys(definition))
    if (
      ![
        'axis',
        'root',
        'areas',
        'fallback',
        'space',
        'hysteresis',
        'layouts',
      ].includes(field)
    )
      throw new Error(`Toned adaptive: unknown definition property ${field}`)
  const { axis, root, fallback } = definition
  type Area = Areas[number]
  name(axis, 'axis')
  name(root, 'root')
  if (!Array.isArray(definition.areas) || definition.areas.length > MAX_AREAS)
    throw new Error(`Toned adaptive: declare at most ${MAX_AREAS} areas`)
  const areas = Object.freeze([...definition.areas]) as readonly Area[]
  for (const area of areas) name(area, 'area')
  if (new Set(areas).size !== areas.length || areas.includes(root))
    throw new Error('Toned adaptive: root and area names must be distinct')
  if (
    !definition.layouts ||
    typeof definition.layouts !== 'object' ||
    Array.isArray(definition.layouts)
  )
    throw new Error('Toned adaptive: layouts must be a finite map')
  const names = Object.freeze(
    Object.keys(definition.layouts),
  ) as readonly Name[]
  if (!names.length || names.length > MAX_LAYOUTS)
    throw new Error(
      `Toned adaptive: declare between 1 and ${MAX_LAYOUTS} layouts`,
    )
  for (const value of names) name(value, 'layout')
  if (!own(definition.layouts, fallback))
    throw new Error('Toned adaptive: fallback must name a declared layout')
  const space = definition.space ?? 'container'
  if (space !== 'container' && space !== 'viewport')
    throw new Error('Toned adaptive: space must be container or viewport')
  if (definition.hysteresis !== undefined) {
    if (!definition.hysteresis || typeof definition.hysteresis !== 'object')
      throw new Error('Toned adaptive: invalid hysteresis')
    for (const field of Object.keys(definition.hysteresis))
      if (!['size', 'textScale'].includes(field))
        throw new Error(`Toned adaptive: unknown hysteresis property ${field}`)
  }
  const hysteresis = {
    size: definition.hysteresis?.size ?? 0,
    textScale: definition.hysteresis?.textScale ?? 0,
  }
  number(hysteresis.size, 'hysteresis.size')
  number(hysteresis.textScale, 'hysteresis.textScale')
  const layouts = Object.create(null) as Record<Name, AdaptiveCandidate<Area>>
  const rules = Object.create(null) as Record<Name, AdaptiveRule<Root, Area>>
  for (const key of names) {
    const input = definition.layouts[key]!
    if (!input || !['stack', 'row', 'wrap'].includes(input.flow))
      throw new Error(`Toned adaptive: invalid flow in ${key}`)
    for (const field of Object.keys(input))
      if (!['flow', 'gap', 'when', 'areas'].includes(field))
        throw new Error(`Toned adaptive: unknown layout property ${field}`)
    number(input.gap ?? 0, `${key}.gap`)
    if (
      input.when !== undefined &&
      (!input.when ||
        typeof input.when !== 'object' ||
        Array.isArray(input.when))
    )
      throw new Error('Toned adaptive: conditions must be an object')
    if (
      input.areas !== undefined &&
      (!input.areas ||
        typeof input.areas !== 'object' ||
        Array.isArray(input.areas))
    )
      throw new Error('Toned adaptive: areas must be a map')
    const when = { ...input.when }
    for (const field of Object.keys(when)) {
      if (
        ![
          'minWidth',
          'maxWidth',
          'minHeight',
          'maxHeight',
          'minTextScale',
          'maxTextScale',
          'keyboard',
          'content',
        ].includes(field)
      )
        throw new Error(`Toned adaptive: unknown condition ${field}`)
      if (field !== 'keyboard' && field !== 'content')
        number(
          when[field as keyof AdaptiveCondition],
          `${key}.${field}`,
          field.includes('TextScale'),
        )
    }
    for (const suffix of ['Width', 'Height', 'TextScale'] as const) {
      const min = when[`min${suffix}`],
        max = when[`max${suffix}`]
      if (min !== undefined && max !== undefined && min > max)
        throw new Error(`Toned adaptive: reversed ${suffix} bounds in ${key}`)
    }
    if (
      when.keyboard !== undefined &&
      !['shown', 'hidden'].includes(when.keyboard)
    )
      throw new Error('Toned adaptive: keyboard must be shown or hidden')
    if (when.content !== undefined && when.content !== 'fits')
      throw new Error('Toned adaptive: content condition must be fits')
    if (key === fallback && Object.keys(when).length)
      throw new Error('Toned adaptive: fallback must be unconditional')
    for (const area of Object.keys(input.areas ?? {}))
      if (!areas.includes(area))
        throw new Error(`Toned adaptive: unknown layout area ${area}`)
    const areaRules: Partial<Record<Area, AdaptiveArea>> = {}
    const style: Record<string, unknown> = {
      [root]: Object.freeze({
        $style: Object.freeze({
          display: 'flex',
          flexDirection: input.flow === 'stack' ? 'column' : 'row',
          flexWrap: input.flow === 'wrap' ? 'wrap' : 'nowrap',
          gap: input.gap ?? 0,
        }),
      }),
    }
    for (const area of areas) {
      const authored = input.areas?.[area] ?? {}
      if (typeof authored !== 'object' || Array.isArray(authored))
        throw new Error(`Toned adaptive: invalid area ${area}`)
      for (const field of Object.keys(authored))
        if (!['grow', 'shrink', 'basis'].includes(field))
          throw new Error(`Toned adaptive: unknown area property ${field}`)
      for (const field of ['grow', 'shrink', 'basis'] as const)
        if (authored[field] !== undefined)
          number(authored[field], `${key}.${area}.${field}`)
      areaRules[area] = Object.freeze({ ...authored })
      style[area] = Object.freeze({
        $style: Object.freeze({
          flexGrow: authored.grow ?? 0,
          flexShrink: authored.shrink ?? 1,
          flexBasis: authored.basis ?? 'auto',
        }),
      })
    }
    layouts[key] = Object.freeze({
      flow: input.flow,
      gap: input.gap ?? 0,
      when: Object.freeze(when),
      areas: Object.freeze(areaRules),
    })
    rules[key] = Object.freeze(style) as AdaptiveRule<Root, Area>
  }
  Object.freeze(layouts)
  const candidates = names.filter((value) => value !== fallback)
  const variants = new Map(
    names.map((value) => [
      value,
      Object.freeze({ [axis]: value }) as Readonly<Record<Axis, Name>>,
    ]),
  )
  const select = (raw: AdaptiveMeasurements<Area>, current?: Name): Name => {
    if (current !== undefined && !own(layouts, current))
      throw new Error(`Toned adaptive: unknown current layout ${current}`)
    const input = snapshot(areas, raw)
    const available = input[space]
    if (!available) return fallback
    const width = Math.max(
      0,
      available.width -
        (input.safeArea?.left ?? 0) -
        (input.safeArea?.right ?? 0),
    )
    const height = Math.max(
      0,
      available.height -
        (input.safeArea?.top ?? 0) -
        (input.safeArea?.bottom ?? 0) -
        (input.keyboardHeight ?? 0),
    )
    const matches = (key: Name, direction: -1 | 0 | 1): boolean => {
      const candidate = layouts[key],
        condition = candidate.when!
      const size = direction * hysteresis.size,
        scale = direction * hysteresis.textScale
      if (condition.minWidth !== undefined && width < condition.minWidth + size)
        return false
      if (condition.maxWidth !== undefined && width > condition.maxWidth - size)
        return false
      if (
        condition.minHeight !== undefined &&
        height < condition.minHeight + size
      )
        return false
      if (
        condition.maxHeight !== undefined &&
        height > condition.maxHeight - size
      )
        return false
      if (
        condition.minTextScale !== undefined &&
        (input.textScale === undefined ||
          input.textScale < condition.minTextScale + scale)
      )
        return false
      if (
        condition.maxTextScale !== undefined &&
        (input.textScale === undefined ||
          input.textScale > condition.maxTextScale - scale)
      )
        return false
      if (
        condition.keyboard !== undefined &&
        (input.keyboardHeight === undefined ||
          input.keyboardHeight > 0 !== (condition.keyboard === 'shown'))
      )
        return false
      if (condition.content === 'fits') {
        const measured = areas.map((area) => input.content?.[area])
        if (measured.some((value) => value === undefined)) return false
        // Conservative intrinsic fitting never relies on flex shrink. A larger
        // explicit basis must also fit along the candidate's main axis.
        const frames = (measured as AdaptiveFrame[]).map((value, index) => {
          const basis = candidate.areas?.[areas[index]!]?.basis ?? 0
          return candidate.flow === 'stack'
            ? { width: value.width, height: Math.max(value.height, basis) }
            : { width: Math.max(value.width, basis), height: value.height }
        })
        const gap = candidate.gap ?? 0
        let inline = 0,
          block = 0
        if (candidate.flow === 'stack') {
          inline = Math.max(0, ...frames.map((value) => value.width))
          block =
            frames.reduce((sum, value) => sum + value.height, 0) +
            gap * Math.max(0, frames.length - 1)
        } else if (candidate.flow === 'row') {
          inline =
            frames.reduce((sum, value) => sum + value.width, 0) +
            gap * Math.max(0, frames.length - 1)
          block = Math.max(0, ...frames.map((value) => value.height))
        } else {
          let rowWidth = 0,
            rowHeight = 0,
            rows = 0,
            rowCount = 0
          for (const value of frames) {
            if (value.width + size > width) return false
            if (rowCount && rowWidth + gap + value.width + size > width) {
              block += rowHeight
              rows++
              rowWidth = 0
              rowHeight = 0
              rowCount = 0
            }
            rowWidth += (rowCount ? gap : 0) + value.width
            rowCount++
            rowHeight = Math.max(rowHeight, value.height)
            inline = Math.max(inline, rowWidth)
          }
          block += rowHeight + gap * rows
        }
        if (inline + size > width || block + size > height) return false
      }
      return true
    }
    const selected = candidates.find((value) =>
      matches(value, current === undefined ? 0 : 1),
    )
    if (current !== undefined && current !== fallback && matches(current, -1)) {
      if (
        selected === undefined ||
        candidates.indexOf(selected) >= candidates.indexOf(current)
      )
        return current
    }
    return selected ?? fallback
  }
  return Object.freeze({
    axis: axis,
    root: root,
    areas,
    names,
    fallback: fallback,
    space,
    layouts,
    select,
    variants(value: Name) {
      const result = variants.get(value)
      if (!result) throw new Error(`Toned adaptive: unknown layout ${value}`)
      return result
    },
    rules(selector: VariantSelector<Record<Axis, Name>>) {
      const selectAxis = (
        selector as unknown as Record<Axis, (value: Name) => string>
      )[axis]
      if (typeof selectAxis !== 'function')
        throw new Error(`Toned adaptive: selector needs axis ${axis}`)
      const output: Record<string, AdaptiveRule<Root, Area>> = {}
      for (const value of names)
        output[String(selectAxis(value))] = rules[value]
      return Object.freeze(output) as Readonly<
        Record<`[${Axis}=${Name}]`, AdaptiveRule<Root, Area>>
      >
    },
  })
}

export interface AdaptiveStore<
  Axis extends string = string,
  Name extends string = string,
  Area extends string = string,
> {
  readonly layout: AdaptiveLayout<Axis, Name, any, Area>
  /** Partial transaction. content/safeArea objects replace their complete field. */
  update(measurements: Partial<AdaptiveMeasurements<Area>>): void
  getMeasurements(): AdaptiveMeasurements<Area>
  getSnapshot(): Readonly<Record<Axis, Name>>
  getServerSnapshot(): Readonly<Record<Axis, Name>>
  subscribe(listener: () => void): () => void
}
export function createAdaptiveStore<
  Axis extends string,
  Name extends string,
  Root extends string,
  Area extends string,
>(
  layout: AdaptiveLayout<Axis, Name, Root, Area>,
  initial: AdaptiveMeasurements<Area> = {},
): AdaptiveStore<Axis, Name, Area> {
  let measurements = snapshot(layout.areas, initial)
  let signature = JSON.stringify(measurements)
  let selected = layout.select(measurements)
  let current = layout.variants(selected)
  const server = layout.variants(layout.fallback)
  const listeners = new Set<() => void>()
  return Object.freeze({
    layout,
    update(patch: Partial<AdaptiveMeasurements<Area>>) {
      const next = snapshot(layout.areas, { ...measurements, ...patch })
      const nextSignature = JSON.stringify(next)
      if (nextSignature === signature) return
      const name = layout.select(next, selected)
      measurements = next
      signature = nextSignature
      if (name === selected) return
      selected = name
      current = layout.variants(name)
      for (const listener of [...listeners]) listener()
    },
    getMeasurements: () => measurements,
    getSnapshot: () => current,
    getServerSnapshot: () => server,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  })
}
