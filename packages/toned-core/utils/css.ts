/**
 * CSS utility functions.
 *
 * @module utils/css
 */

const camelToKebabRe = /([a-z0-9]|(?=[A-Z]))([A-Z])/g

/**
 * Convert camelCase to kebab-case.
 *
 * @example
 * ```ts
 * camelToKebab('backgroundColor') // 'background-color'
 * camelToKebab('WebkitTransform') // 'webkit-transform'
 * ```
 */
export function camelToKebab(str: string): string {
  return str.replace(camelToKebabRe, '$1-$2').toLowerCase()
}
