/** The web media types a named media condition may lead with. */
export type MediaType = 'all' | 'print' | 'screen'

/**
 * A raw web media condition: a parenthesised query such as
 * `(prefers-reduced-motion: reduce)`, or one led by a media type such as
 * `print` or `screen and (min-width: 48rem)`. Anything else in a media map is
 * a length threshold.
 */
export type MediaCondition =
  | `(${string})`
  | MediaType
  | `${MediaType} and ${string}`
  | `only ${MediaType}${string}`

const MEDIA_TYPE = /^(?:only\s+)?(?:all|print|screen)(?:$|\s)/

/** Whether a media-map value is a raw condition (the query itself) rather than a length. */
export const isMediaCondition = (value: unknown): value is MediaCondition =>
  typeof value === 'string' &&
  ((value.startsWith('(') && value.endsWith(')')) || MEDIA_TYPE.test(value))
