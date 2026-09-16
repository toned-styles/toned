import type { OutputBackend, ResolvedProps } from './index.ts'

// The shipped native profile is deliberately finite. A host can provide a
// wider adapter once its property/reset behavior has conformance coverage.
const nativeFields = new Set(
  'alignContent alignItems alignSelf aspectRatio bottom columnGap display flex flexBasis flexDirection flexGrow flexShrink flexWrap gap height justifyContent left margin marginBottom marginLeft marginRight marginTop maxHeight maxWidth minHeight minWidth overflow padding paddingBottom paddingLeft paddingRight paddingTop position right rowGap top width zIndex backgroundColor borderBottomColor borderBottomLeftRadius borderBottomRightRadius borderBottomWidth borderColor borderLeftColor borderLeftWidth borderRadius borderRightColor borderRightWidth borderStyle borderTopColor borderTopLeftRadius borderTopRightRadius borderTopWidth borderWidth opacity color fontFamily fontSize fontStyle fontWeight letterSpacing lineHeight textAlign textDecorationLine textTransform paddingHorizontal paddingVertical marginHorizontal marginVertical elevation shadowColor shadowOffset shadowOpacity shadowRadius transform includeFontPadding textAlignVertical resizeMode tintColor direction start end marginStart marginEnd paddingStart paddingEnd borderStartColor borderEndColor borderStartWidth borderEndWidth'.split(
    ' ',
  ),
)

export const nativeBackend: OutputBackend = Object.freeze({
  id: 'native',
  platform: 'native',
  browserConditions: false,
  resolve(input: ResolvedProps) {
    if (input.className)
      throw new Error('Toned native backend: CSS classes require a web host')
    for (const [field, value] of Object.entries(input.style)) {
      validateValue(field, value)
      if (!nativeFields.has(field))
        throw new Error(
          `Toned native backend: unsupported style field ${field}`,
        )
      if (
        (field === 'position' &&
          !['relative', 'absolute', 'static'].includes(String(value))) ||
        (field === 'display' && !['flex', 'none'].includes(String(value)))
      )
        throw new Error(
          `Toned native backend: unsupported ${field} value ${String(value)}`,
        )
    }
    return Object.freeze({ style: Object.freeze({ ...input.style }) })
  },
})

const dimensions = new Set(
  'bottom columnGap flexBasis gap height left margin marginBottom marginLeft marginRight marginTop maxHeight maxWidth minHeight minWidth padding paddingBottom paddingLeft paddingRight paddingTop right rowGap top width paddingHorizontal paddingVertical marginHorizontal marginVertical start end marginStart marginEnd paddingStart paddingEnd'.split(
    ' ',
  ),
)
const percentages = /^-?(?:\d+\.?\d*|\.\d+)%$/
const angles = /^-?(?:\d+\.?\d*|\.\d+)(deg|rad)$/
const cssExpression =
  /(?:\b(?:var|calc|env|clamp|min|max|color-mix|color|light-dark|lab|lch|oklab|oklch)\(|\b(?:rgba?|hsla?|hwb)\(\s*from\b)/i
const numericTransforms = new Set([
  'perspective',
  'scale',
  'scaleX',
  'scaleY',
  'translateX',
  'translateY',
])
const angleTransforms = new Set([
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'skewX',
  'skewY',
])
function validateValue(field: string, value: unknown): void {
  if (value == null) return
  if (typeof value === 'number' && !Number.isFinite(value))
    throw new Error(`Toned native backend: ${field} must be finite`)
  if (typeof value === 'string' && cssExpression.test(value))
    throw new Error(`Toned native backend: ${field} contains a CSS-only value`)
  if (
    dimensions.has(field) &&
    typeof value !== 'number' &&
    !(
      typeof value === 'string' &&
      (percentages.test(value) ||
        (value === 'auto' && /^(margin|width$|height$|flexBasis$)/.test(field)))
    )
  )
    throw new Error(
      `Toned native backend: ${field} requires logical numbers or supported percentage/auto values`,
    )
  if (field === 'transform') {
    if (!Array.isArray(value))
      throw new Error('Toned native backend: transform requires an array')
    for (const item of value) {
      if (!item || typeof item !== 'object' || Object.keys(item).length !== 1)
        throw new Error(
          'Toned native backend: each transform requires one operation',
        )
      const [key, operand] = Object.entries(item)[0]!
      const valid = numericTransforms.has(key)
        ? typeof operand === 'number' && Number.isFinite(operand)
        : angleTransforms.has(key)
          ? typeof operand === 'string' && angles.test(operand)
          : key === 'matrix' &&
            Array.isArray(operand) &&
            operand.length === 16 &&
            operand.every((n) => typeof n === 'number' && Number.isFinite(n))
      if (!valid)
        throw new Error(`Toned native backend: unsupported transform ${key}`)
    }
  } else if (Array.isArray(value)) {
    for (const member of value) validateValue(field, member)
  } else if (typeof value === 'object') {
    for (const [key, member] of Object.entries(value))
      validateValue(`${field}.${key}`, member)
  }
}
