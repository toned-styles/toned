import {
  TOKEN_OPERATIONS,
  type TokenOperation,
} from '../stylesheet/rule-protocol.ts'
import type {
  TokenStyleDeclaration,
  TokenSystem,
  Tokens,
} from '../types/index.ts'
import type { ResolveContext } from '../types/tokens.ts'
import { alphaWrappable, applyAlpha, splitAlphaValue } from '../utils/alpha.ts'
import {
  type LayoutContext,
  logicalFields,
  resolvePortableFields,
} from './values.ts'

/** Token-to-field evaluation has no CSS lowering, host references, or globals. */
export function resolveToken(
  system: TokenSystem<TokenStyleDeclaration>,
  key: string,
  value: unknown,
  tokens: Tokens,
  platform: 'web' | 'native',
): Record<string, unknown> {
  if (value == null || key === '$kind' || key === '$$type') return {}
  if (key === 'style' || key === '$style')
    return resolvePortableFields(value as Record<string, unknown>, tokens, {
      ...system.system.layoutContext,
      platform,
      canonicalFields: !!system.id,
    })
  if (key === 'className') return { className: value }
  // Layout and arbitrary selector declarations belong to explicit web extensions.
  if (key === '$grid' || key === '$area' || key === '$webRules') {
    if (platform === 'native')
      throw new Error(
        `Toned native: ${key} needs a declared layout/selector adapter`,
      )
    throw new Error(`Toned: ${key} requires the CSS backend`)
  }
  const config = system.system[key] as
    | {
        resolve?: (
          value: unknown,
          tokens: Tokens,
          context: { platform: 'web' | 'native' },
        ) => Record<string, unknown>
        values?: readonly unknown[]
        alphaChannel?: readonly string[]
      }
    | undefined
  if (!config?.resolve) return {}
  return resolveConfiguredToken(config, value, tokens, {
    ...system.system.layoutContext,
    platform,
    canonicalFields: !!system.id,
  })
}

export function resolveTokenStyle(
  system: TokenSystem<TokenStyleDeclaration>,
  style: Record<string, unknown>,
  tokens: Tokens,
  platform: 'web' | 'native',
) {
  const operations: readonly TokenOperation[] =
    (style as any)[TOKEN_OPERATIONS] ??
    Object.entries(style).map(([key, value]) => ({ key, value, layer: 0 }))
  const fields: Record<string, unknown> = {}
  let className: string | undefined
  for (const operation of operations) {
    if (operation.conditional)
      throw new Error(
        'Toned: unresolved browser predicate requires a build-backed output adapter',
      )
    const resolved = resolveToken(
      system,
      operation.key,
      operation.value,
      tokens,
      platform,
    )
    if (resolved['className']) {
      className = [className, resolved['className']].filter(Boolean).join(' ')
      delete resolved['className']
    }
    Object.assign(fields, resolved)
  }
  return { style: fields, ...(className ? { className } : {}) }
}

/** Alpha channels name authored fields; resolve them through the same physical
 * footprint as the token output and apply each physical channel once. */
export function resolveAlphaChannels(
  channels: readonly string[],
  context: LayoutContext & {
    canonicalFields?: boolean
    platform?: 'web' | 'native'
  } = {},
): readonly string[] {
  return [
    ...new Set(
      channels.flatMap((field) =>
        logicalFields(field, { platform: 'web', ...context }),
      ),
    ),
  ]
}

export function resolveConfiguredToken(
  config:
    | {
        resolve?: (
          value: any,
          tokens: Tokens,
          context: { platform: 'web' | 'native' },
        ) => object
        values?: readonly unknown[]
        alphaChannel?: readonly string[]
      }
    | undefined,
  value: unknown,
  tokens: Tokens,
  context: ResolveContext = { platform: 'web' },
): Record<string, unknown> {
  if (!config?.resolve || value == null) return {}
  const alpha = config.alphaChannel && splitAlphaValue(value)
  const useAlpha = alpha && config.values?.includes(alpha.base)
  const fields = resolvePortableFields(
    (config.resolve(useAlpha ? alpha.base : value, tokens, context) ??
      {}) as Record<string, unknown>,
    tokens,
    context,
  )
  if (useAlpha)
    for (const field of resolveAlphaChannels(config.alphaChannel!, context)) {
      if (!alphaWrappable(fields[field])) continue
      if (context.platform === 'native' && alpha.alpha === 0) {
        fields[field] = 'rgba(0, 0, 0, 0)'
        continue
      }
      if (context.platform === 'native' && alpha.alpha === 100) continue
      if (
        context.platform === 'native' &&
        !/^(?:#[0-9a-f]+|rgba?\()/i.test(fields[field])
      )
        throw new Error(
          `Toned native: alpha channel ${field} requires a resolved hex or rgb color; CSS relative colors are unsupported`,
        )
      fields[field] = applyAlpha(fields[field], alpha.alpha / 100)
    }
  return fields
}
