/** A deliberately finite public playground vocabulary. No code, CSS URLs or file writes. */
export const liveTokens = {
  borderRadius: ['none', 'small', 'medium', 'large', 'xlarge', 'full'],
  shadow: ['none', 'small', 'medium', 'large', 'xlarge', 'focus'],
  bgColor: [
    'default',
    'subtle',
    'muted',
    'elevated',
    'action',
    'action_secondary',
    'destructive',
  ],
  textColor: [
    'default',
    'subtle',
    'muted',
    'action',
    'on_action',
    'on_action_secondary',
    'on_destructive',
  ],
} as const
const spacing = new Set(['padding', 'paddingX', 'paddingY', 'gap'])
export type LiveRules = Record<string, Record<string, string | number>>

export function parseLiveStyles(
  text: string,
  parts: readonly string[],
): LiveRules {
  if (text.length > 8000)
    throw new Error('Keep overrides under 8,000 characters.')
  const value: unknown = JSON.parse(text)
  if (!value || Array.isArray(value) || typeof value !== 'object')
    throw new Error('Use an object of named stylesheet parts.')
  const result: LiveRules = {}
  for (const [part, declarations] of Object.entries(value)) {
    if (
      !parts.includes(part) ||
      ['__proto__', 'constructor', 'prototype'].includes(part)
    )
      throw new Error(`Unknown part “${part}”. Available: ${parts.join(', ')}.`)
    if (
      !declarations ||
      Array.isArray(declarations) ||
      typeof declarations !== 'object'
    )
      throw new Error(`${part} must contain token declarations.`)
    result[part] = {}
    for (const [token, tokenValue] of Object.entries(declarations)) {
      if (Object.keys(liveTokens).includes(token)) {
        const choices: readonly string[] =
          liveTokens[token as keyof typeof liveTokens]
        if (typeof tokenValue !== 'string' || !choices.includes(tokenValue))
          throw new Error(`${token}: choose ${choices.join(', ')}.`)
      } else if (spacing.has(token) || token === 'opacity') {
        const max = token === 'opacity' ? 1 : 24
        if (
          typeof tokenValue !== 'number' ||
          !Number.isFinite(tokenValue) ||
          tokenValue < 0 ||
          tokenValue > max
        )
          throw new Error(`${token}: use a number from 0 to ${max}.`)
      } else
        throw new Error(
          `Unsupported token “${token}”. See the editable tokens below.`,
        )
      result[part][token] = tokenValue as string | number
    }
  }
  return result
}
