import { camelToKebab } from './css.ts'

/**
 * The custom property an element sets inline for one property of one of its
 * declared pseudo-elements. Pseudo-elements inherit custom properties from
 * their element, so the system's single generic rule for that pseudo-element
 * and property reads it there.
 */
export const pseudoElementParameter = (name: string, property: string) =>
  `--toned_pe-${name}-${camelToKebab(property)}`
