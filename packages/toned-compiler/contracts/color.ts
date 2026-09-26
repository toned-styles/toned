/** Opaque sRGB only: unsupported CSS, alpha and wide-gamut colors need measured
 * composited sRGB supplied by the host; they must not be guessed. */
export function contrastRatio(
  foreground: unknown,
  background: unknown,
): number | undefined {
  const parse = (value: unknown): number[] | undefined => {
    if (typeof value !== 'string') return
    const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value.trim())?.[1]
    if (!hex) return
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  }
  const fg = parse(foreground),
    bg = parse(background)
  if (!fg || !bg) return
  const luminance = (rgb: number[]) =>
    rgb
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0)
  const a = luminance(fg),
    b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
