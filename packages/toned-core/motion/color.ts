/**
 * Colour parsing and Oklab interpolation for motion. Colours animate as four
 * premultiplied Oklab channels (L·α, a·α, b·α, α), so a fade to transparent
 * keeps its hue and each channel can run on a timing curve or a spring.
 */

/** Oklab lightness, a, b, and alpha in [0, 1]. */
export type Oklab = readonly [number, number, number, number]

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const linearToSrgb = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

/** sRGB channels in [0, 1] to Oklab (Björn Ottosson's matrices). */
function fromSrgb(r: number, g: number, b: number, alpha: number): Oklab {
  const [lr, lg, lb] = [r, g, b].map(srgbToLinear) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    clamp(alpha),
  ]
}

function toSrgb([L, a, b]: Oklab): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => clamp(linearToSrgb(c))) as [number, number, number]
}

const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`
const functional = new RegExp(
  String.raw`^(rgba?|hsla?|oklab|oklch)\(\s*(${NUMBER}(?:%|deg)?)[\s,]+(${NUMBER}%?)[\s,]+(${NUMBER}(?:%|deg)?)(?:\s*[,/]\s*(${NUMBER}%?))?\s*\)$`,
  'i',
)
const amount = (text: string, scale: number) =>
  text.endsWith('%') ? (Number.parseFloat(text) / 100) * scale : Number(text)

function hsl(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return [f(0), f(8), f(4)]
}

/**
 * Parses hex, `rgb()`, `hsl()`, `oklab()`, `oklch()` and `transparent`.
 * Anything else (a CSS variable, a named colour, `currentColor`) returns
 * `undefined`: on web it is resolved through computed style first.
 */
export function parseColor(value: unknown): Oklab | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim().toLowerCase()
  if (text === 'transparent') return [0, 0, 0, 0]
  const hex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.exec(text)?.[1]
  if (hex) {
    const digits =
      hex.length <= 4
        ? [...hex].map((digit) => digit + digit)
        : hex.match(/../g)!
    const [r, g, b, a = 255] = digits.map((pair) => Number.parseInt(pair, 16))
    return fromSrgb(r! / 255, g! / 255, b! / 255, a / 255)
  }
  const match = functional.exec(text)
  if (!match) return undefined
  const [, kind, first, second, third, alphaText] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string | undefined,
  ]
  const alpha = alphaText === undefined ? 1 : amount(alphaText, 1)
  const name = kind.replace(/a$/, '')
  if (name === 'rgb')
    return fromSrgb(
      amount(first, 255) / 255,
      amount(second, 255) / 255,
      amount(third, 255) / 255,
      alpha,
    )
  if (name === 'hsl') {
    const [r, g, b] = hsl(
      ((Number.parseFloat(first) % 360) + 360) % 360,
      clamp(amount(second, 1) / (second.endsWith('%') ? 1 : 100)),
      clamp(amount(third, 1) / (third.endsWith('%') ? 1 : 100)),
    )
    return fromSrgb(r, g, b, alpha)
  }
  const L = amount(first, 1)
  if (kind === 'oklab')
    return [L, amount(second, 0.4), amount(third, 0.4), clamp(alpha)]
  const chroma = amount(second, 0.4)
  const hue = (Number.parseFloat(third) * Math.PI) / 180
  return [L, chroma * Math.cos(hue), chroma * Math.sin(hue), clamp(alpha)]
}

/** Premultiplied channels, the form motion interpolates. */
export const colorChannels = ([L, a, b, alpha]: Oklab): number[] => [
  L * alpha,
  a * alpha,
  b * alpha,
  alpha,
]

export function channelsColor(channels: readonly number[]): Oklab {
  const alpha = clamp(channels[3] ?? 1)
  if (alpha === 0) return [0, 0, 0, 0]
  return [
    channels[0]! / alpha,
    channels[1]! / alpha,
    channels[2]! / alpha,
    alpha,
  ]
}

/** Mixes two colours in premultiplied Oklab; `amount` 0 is `from`. */
export function mixColor(from: Oklab, to: Oklab, amount: number): Oklab {
  const a = colorChannels(from)
  const b = colorChannels(to)
  return channelsColor(
    a.map((value, i) => value * (1 - amount) + b[i]! * amount),
  )
}

/** `rgba(r, g, b, a)`, which web and React Native both read. */
export function formatColor(color: Oklab): string {
  const [r, g, b] = toSrgb(color)
  const alpha = Math.round(clamp(color[3]) * 1000) / 1000
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`
}
