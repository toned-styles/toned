/**
 * Motion properties and their channels. Every property animates as a short
 * list of numbers: one for a length or opacity, four premultiplied Oklab
 * channels for a colour, one for each transform component. Reading a
 * committed value into channels and writing channels back as style are the
 * only places that know about the platforms.
 */
import { camelToKebab } from '../utils/css.ts'
import {
  channelsColor,
  colorChannels,
  formatColor,
  parseColor,
} from './color.ts'

export const numericMotionProperties = [
  'opacity',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'top',
  'right',
  'bottom',
  'left',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderRadius',
  'gap',
  'rowGap',
  'columnGap',
] as const
export const colorMotionProperties = [
  'color',
  'backgroundColor',
  'borderColor',
] as const
/** Translations in pixels (dp on native), rotation in degrees. */
export const transformMotionProperties = [
  'translateX',
  'translateY',
  'rotate',
  'scale',
  'scaleX',
  'scaleY',
] as const

export type NumericMotionProperty = (typeof numericMotionProperties)[number]
export type ColorMotionProperty = (typeof colorMotionProperties)[number]
export type TransformMotionProperty = (typeof transformMotionProperties)[number]
export type MotionProperty =
  | NumericMotionProperty
  | ColorMotionProperty
  | TransformMotionProperty

export type Channels = Partial<Record<MotionProperty, number[]>>

const colors = new Set<string>(colorMotionProperties)
const transforms = new Set<string>(transformMotionProperties)
export const isColor = (p: string): p is ColorMotionProperty => colors.has(p)
export const isTransform = (p: string): p is TransformMotionProperty =>
  transforms.has(p)

const fail = (message: string): never => {
  throw new Error(`[toned/motion] ${message}`)
}
export const finite = (value: unknown, name: string): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : fail(`${name} must be finite`)

/** A web CSS property shares one value for two channels, so both animate. */
export function expandProperties(
  properties: readonly MotionProperty[],
): MotionProperty[] {
  const set = new Set(properties)
  if (set.has('translateX') || set.has('translateY'))
    set.add('translateX').add('translateY')
  if (set.has('scaleX') || set.has('scaleY')) set.add('scaleX').add('scaleY')
  return [...set]
}

const identity = (property: TransformMotionProperty) =>
  property.startsWith('scale') ? 1 : 0

function numeric(value: unknown, property: string): number | undefined {
  if (typeof value === 'number') return finite(value, property)
  if (
    typeof value === 'string' &&
    /^-?(?:\d+\.?\d*|\.\d+)(?:px)?$/.test(value.trim())
  )
    return finite(Number.parseFloat(value), property)
  // Valid computed CSS can be intrinsic, percentage-based or a shorthand tuple.
  // Preserve that declaration without attempting numeric interpolation.
  return undefined
}

const ANGLE = /^(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|rad|turn|grad)$/
function degrees(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined
  const match = ANGLE.exec(value.trim())
  if (!match) return undefined
  const amount = Number(match[1])
  const unit = match[2]
  return unit === 'deg'
    ? amount
    : unit === 'rad'
      ? (amount * 180) / Math.PI
      : unit === 'turn'
        ? amount * 360
        : amount * 0.9
}

type NativeTransform = Record<string, unknown>
const nativeEntries = (style: Record<string, unknown> | undefined) =>
  Array.isArray(style?.['transform'])
    ? (style['transform'] as NativeTransform[])
    : []
const entryKey = (entry: NativeTransform) => Object.keys(entry)[0]

/** Committed native style fields to channels. Absent transforms are identity. */
export function readNative(
  style: Record<string, unknown> | undefined,
  properties: readonly MotionProperty[],
): Channels {
  const channels: Channels = {}
  const entries = nativeEntries(style)
  for (const property of properties) {
    if (isTransform(property)) {
      const entry = entries.find((item) => entryKey(item) === property)
      const value = entry?.[property]
      channels[property] = [
        value == null
          ? identity(property)
          : property === 'rotate'
            ? (degrees(value) ??
              fail(`rotate on native must be '<n>deg' or '<n>rad'`))
            : finite(value, `${property} on native`),
      ]
      continue
    }
    const value = style?.[property]
    if (value == null) continue
    if (isColor(property)) {
      const color =
        parseColor(value) ??
        fail(
          `${property} on native must be a colour literal (hex, rgb(), hsl(), oklab() or oklch()); got ${JSON.stringify(value)}`,
        )
      channels[property] = colorChannels(color)
    } else channels[property] = [finite(value, `${property} on native`)]
  }
  return channels
}

function webTranslate(value: string): [number, number] | undefined {
  if (!value || value === 'none') return [0, 0]
  const parts = value.trim().split(/\s+/)
  if (parts.length > 3) return undefined
  const [x, y = '0px', z = '0px'] = parts
  const nx = numeric(x, 'translate')
  const ny = numeric(y, 'translate')
  if (nx === undefined || ny === undefined || numeric(z, 'translate') !== 0)
    return undefined
  return [nx, ny]
}
function webScale(value: string): [number, number] | undefined {
  if (!value || value === 'none') return [1, 1]
  const parts = value.trim().split(/\s+/).map(Number)
  if (parts.length > 3 || parts.some((part) => !Number.isFinite(part)))
    return undefined
  return [parts[0]!, parts[1] ?? parts[0]!]
}

/** Computed web style to channels; a value with no numeric reading is absent. */
export function readWeb(
  computed: Pick<CSSStyleDeclaration, 'getPropertyValue'> | undefined,
  style: Record<string, unknown> | undefined,
  properties: readonly MotionProperty[],
): Channels {
  const channels: Channels = {}
  const read = (css: string, key: string) =>
    computed?.getPropertyValue(css) || String(style?.[key] ?? '')
  const translate = webTranslate(read('translate', 'translate'))
  const scale = webScale(read('scale', 'scale'))
  const separateScale = properties.includes('scaleX')
  for (const property of properties) {
    if (isTransform(property)) {
      let value: number | undefined
      if (property === 'translateX') value = translate?.[0]
      else if (property === 'translateY') value = translate?.[1]
      else if (property === 'rotate') {
        const text = read('rotate', 'rotate')
        value = !text || text === 'none' ? 0 : degrees(text)
      } else if (separateScale)
        value =
          property === 'scale'
            ? 1
            : property === 'scaleX'
              ? scale?.[0]
              : scale?.[1]
      else value = scale && scale[0] === scale[1] ? scale[0] : undefined
      if (value !== undefined) channels[property] = [value]
      continue
    }
    const value = read(camelToKebab(property), property)
    if (value === '') continue
    if (isColor(property)) {
      const color = parseColor(value)
      if (color) channels[property] = colorChannels(color)
    } else {
      const number = numeric(value, property)
      if (number !== undefined) channels[property] = [number]
    }
  }
  return channels
}

const round = (value: number) => Math.round(value * 1000) / 1000
const value = (channels: Channels, property: MotionProperty) =>
  channels[property]?.[0]

/** Channels as style fields, merged over the committed style. */
export function writeStyle(
  base: Record<string, unknown> | undefined,
  channels: Channels,
  native: boolean,
): Record<string, unknown> {
  const style: Record<string, unknown> = { ...base }
  const motionTransforms: NativeTransform[] = []
  for (const [property, list] of Object.entries(channels) as [
    MotionProperty,
    number[],
  ][]) {
    if (isColor(property)) style[property] = formatColor(channelsColor(list))
    else if (!isTransform(property)) style[property] = list[0]
  }
  if (native) {
    for (const property of transformMotionProperties) {
      const amount = value(channels, property)
      if (amount === undefined) continue
      motionTransforms.push({
        [property]: property === 'rotate' ? `${round(amount)}deg` : amount,
      })
    }
    if (motionTransforms.length) {
      // Motion's translate, rotate and scale apply before the committed list,
      // as CSS individual transform properties do; perspective stays first.
      const committed = nativeEntries(base).filter(
        (entry) => !(entryKey(entry)! in channels),
      )
      const perspective = committed.filter(
        (entry) => entryKey(entry) === 'perspective',
      )
      const rest = committed.filter(
        (entry) => entryKey(entry) !== 'perspective',
      )
      style['transform'] = [...perspective, ...motionTransforms, ...rest]
    }
    return style
  }
  const x = value(channels, 'translateX')
  const y = value(channels, 'translateY')
  if (x !== undefined || y !== undefined)
    style['translate'] = `${round(x ?? 0)}px ${round(y ?? 0)}px`
  const rotate = value(channels, 'rotate')
  if (rotate !== undefined) style['rotate'] = `${round(rotate)}deg`
  const scale = value(channels, 'scale')
  const sx = value(channels, 'scaleX')
  const sy = value(channels, 'scaleY')
  if (sx !== undefined || sy !== undefined)
    style['scale'] =
      `${round((scale ?? 1) * (sx ?? 1))} ${round((scale ?? 1) * (sy ?? 1))}`
  else if (scale !== undefined) style['scale'] = `${round(scale)}`
  return style
}

/** The style keys a channel writes on web, for sampling a written value. */
export const webStyleKey = (property: MotionProperty) =>
  property.startsWith('translate')
    ? 'translate'
    : property.startsWith('scale')
      ? 'scale'
      : property
