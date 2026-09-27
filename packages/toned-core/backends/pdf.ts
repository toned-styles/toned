import type { OutputBackend, ResolvedProps } from './index.ts'
import { assertStaticPlan } from './static-plan.ts'

// Deliberate shared subset of React PDF and Forme. Numbers are PDF points; neither
// web CSS pixels nor a device-density conversion is introduced by this adapter.
const dimensions = new Set(
  'width height minWidth minHeight maxWidth maxHeight flexBasis top right bottom left margin marginTop marginRight marginBottom marginLeft marginHorizontal marginVertical padding paddingTop paddingRight paddingBottom paddingLeft paddingHorizontal paddingVertical'.split(
    ' ',
  ),
)
const numeric = new Set(
  'flex flexGrow flexShrink gap rowGap columnGap fontSize lineHeight letterSpacing opacity borderWidth borderTopWidth borderRightWidth borderBottomWidth borderLeftWidth borderRadius borderTopLeftRadius borderTopRightRadius borderBottomLeftRadius borderBottomRightRadius'.split(
    ' ',
  ),
)
const strings = new Set(
  'fontFamily color backgroundColor borderColor borderTopColor borderRightColor borderBottomColor borderLeftColor'.split(
    ' ',
  ),
)
const enums: Readonly<Record<string, readonly string[]>> = {
  display: ['flex'],
  position: ['absolute', 'relative'],
  flexDirection: ['row', 'column', 'row-reverse', 'column-reverse'],
  flexWrap: ['nowrap', 'wrap', 'wrap-reverse'],
  justifyContent: [
    'flex-start',
    'flex-end',
    'center',
    'space-between',
    'space-around',
    'space-evenly',
  ],
  alignItems: ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
  alignSelf: ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
  alignContent: [
    'flex-start',
    'flex-end',
    'center',
    'space-between',
    'space-around',
    'stretch',
  ],
  fontStyle: ['normal', 'italic', 'oblique'],
  textAlign: ['left', 'right', 'center', 'justify'],
  textDecoration: ['none', 'underline', 'line-through'],
  textTransform: ['none', 'uppercase', 'lowercase', 'capitalize'],
  overflow: ['visible', 'hidden'],
  borderStyle: ['solid', 'dashed', 'dotted'],
}
const expression = /\b(?:var|calc|env|clamp|min|max|color-mix|light-dark)\s*\(/i

function validate(field: string, value: unknown): void {
  if (
    !dimensions.has(field) &&
    !numeric.has(field) &&
    !strings.has(field) &&
    !enums[field] &&
    field !== 'fontWeight'
  )
    throw new Error(`Toned PDF backend: unsupported style field ${field}`)
  if (value == null) return
  const number = typeof value === 'number' && Number.isFinite(value)
  let valid = false
  if (dimensions.has(field))
    valid =
      number ||
      (typeof value === 'string' &&
        (/^-?(?:\d+\.?\d*|\.\d+)%$/.test(value) ||
          (value === 'auto' &&
            /^(margin|width$|height$|flexBasis$)/.test(field))))
  else if (numeric.has(field)) valid = number
  else if (strings.has(field))
    valid = typeof value === 'string' && !expression.test(value)
  else if (field === 'fontWeight')
    valid = number || value === 'normal' || value === 'bold'
  else
    valid =
      typeof value === 'string' && (enums[field]?.includes(value) ?? false)
  if (!valid)
    throw new Error(
      `Toned PDF backend: unsupported ${field} value ${String(value)}`,
    )
}

/** Static point-based layout shared by the React PDF and Forme document hosts. */
export const pdfBackend: OutputBackend = Object.freeze({
  id: 'pdf',
  platform: 'native',
  browserConditions: false,
  validatePlan: (plan) => assertStaticPlan(plan, 'PDF'),
  resolve(input: ResolvedProps) {
    if (input.className)
      throw new Error('Toned PDF backend: CSS classes are unsupported')
    for (const [field, value] of Object.entries(input.style))
      validate(field, value)
    return Object.freeze({ style: Object.freeze({ ...input.style }) })
  },
})
