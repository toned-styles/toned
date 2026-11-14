import {
  colorMotionProperties,
  type MotionProperty,
  numericMotionProperties,
  transformMotionProperties,
} from './channels.ts'

/** Lengths and opacity, colours (Oklab), and transform channels. */
export const motionProperties = [
  ...numericMotionProperties,
  ...colorMotionProperties,
  ...transformMotionProperties,
] as const satisfies readonly MotionProperty[]

export const supportsMotionProperty = (
  property: string,
): property is MotionProperty =>
  (motionProperties as readonly string[]).includes(property)
