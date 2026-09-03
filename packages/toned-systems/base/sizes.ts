import { defineCssToken } from '../defineCssToken.ts'
import { SpaceUnit } from './unit.ts'

/*
 * Dimensions are base-relative like every numeric sizing value in the system:
 * `maxWidth: 8` is twice `maxWidth: 4`, whatever --base is. The common steps
 * are enumerated as literals so static generation emits an atomic class for
 * each (an off-scale number, a percentage or calc() string still resolves
 * dynamically); 'auto' and '100%' are enumerated too — they are the two
 * non-numeric values components reach for constantly.
 */
const sizeValues = [
  new Number(),
  new String(),
  'auto',
  '100%',
  0,
  0.5,
  1,
  1.5,
  2,
  2.5,
  3,
  3.5,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  14,
  16,
  20,
  24,
  28,
  32,
  36,
  40,
  44,
  48,
  56,
  64,
  72,
  80,
  96,
] as const

const SizeUnit = (value: Number | String, tokens: Parameters<typeof SpaceUnit>[1]) =>
  value === 'auto' || value === '100%' ? String(value) : SpaceUnit(value, tokens)

export const minWidth = defineCssToken('minWidth', sizeValues, SizeUnit)
export const maxWidth = defineCssToken('maxWidth', sizeValues, SizeUnit)
export const width = defineCssToken('width', sizeValues, SizeUnit)
export const height = defineCssToken('height', sizeValues, SizeUnit)
export const minHeight = defineCssToken('minHeight', sizeValues, SizeUnit)
export const maxHeight = defineCssToken('maxHeight', sizeValues, SizeUnit)
