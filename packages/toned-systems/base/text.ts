import { defineCssToken } from '../defineCssToken.ts'

export const fontFamily = defineCssToken('fontFamily', [new String()] as const)
export const fontSize = defineCssToken('fontSize', [new Number(), new String()] as const)
export const fontWeight = defineCssToken('fontWeight', [new Number()] as const)
export const lineHeight = defineCssToken('lineHeight', [new Number(), new String()] as const)
export const letterSpacing = defineCssToken('letterSpacing', [new String()] as const)
export const textDecoration = defineCssToken('textDecoration', [
  'none',
  'underline',
  'line-through',
])
export const textTransform = defineCssToken('textTransform', [
  'none',
  'uppercase',
  'lowercase',
  'capitalize',
])
