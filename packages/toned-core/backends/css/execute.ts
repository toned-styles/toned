import { compileRules, foldOperations, resolvePlan } from '../../core/plan.ts'
import {
  CONDITIONAL_RULES,
  type ConditionalRule,
  TOKEN_OPERATIONS,
  type TokenOperation,
} from '../../stylesheet/rule-protocol.ts'
import type { SystemOptions } from '../../system/definition.ts'
import { normalizeDeclarations } from '../../system/normalize.ts'
import type {
  TokenStyle,
  TokenStyleDeclaration,
  TokenSystem,
} from '../../types/index.ts'
import { resolvePlatformKeys } from '../../utils/platform.ts'
import { nativeBackend } from '../native.ts'
import { resolveCssPlan } from './plan.ts'

/** Decode the historical flattened spelling only at the direct-exec boundary.
 * The result goes through the same declaration compiler as stylesheets;
 * there is no separate matcher, resolver, or field cascade in this adapter. */
function expand(key: string, value: unknown): Record<string, unknown> {
  if ((key[0] === ':' || key[0] === '@') && key.includes('_')) {
    const separator = key.indexOf('_')
    return {
      [key.slice(0, separator)]: expand(key.slice(separator + 1), value),
    }
  }
  return { [key]: value }
}

function declaration(input: Record<string, unknown>): Record<string, unknown> {
  const normalized = normalizeDeclarations(input)
  const source: readonly TokenOperation[] =
    (normalized as any)[TOKEN_OPERATIONS] ??
    Object.entries(normalized).map(([key, value]) => ({ key, value, layer: 0 }))
  const operations: TokenOperation[] = source.flatMap((operation) => {
    if (operation.conditional)
      return [
        {
          ...operation,
          conditional: {
            ...operation.conditional,
            style: declaration(operation.conditional.style),
          },
        },
      ]
    return Object.entries(expand(operation.key, operation.value)).map(
      ([key, value]) => ({ ...operation, key, value }),
    )
  })
  if (!(normalized as any)[TOKEN_OPERATIONS]) {
    const conditional: readonly ConditionalRule[] =
      (normalized as any)[CONDITIONAL_RULES] ?? []
    for (const rule of conditional)
      operations.push({
        key: '',
        value: undefined,
        layer: 0,
        conditional: { ...rule, style: declaration(rule.style) },
      })
  }
  const part: Record<string | symbol, unknown> = {}
  Object.defineProperty(part, TOKEN_OPERATIONS, {
    value: operations,
    enumerable: true,
  })
  return part as Record<string, unknown>
}

export function createCssExecutor<
  S extends TokenStyleDeclaration,
  C extends SystemOptions,
>(system: S, config?: C, id?: string) {
  // Direct exec accepts mutable inputs, including nested caller styles.
  // Recompile each call to observe current values. t() instead supplies a
  // declaration snapshot; its getters re-resolve the current configuration.
  const reference = {
    id,
    system: { ...system, ...config },
  } as unknown as TokenSystem<S & C>
  return function execute(
    execConfig: Parameters<TokenSystem<S & C>['exec']>[0],
    tokenStyle: TokenStyle<S & C>,
    unnamespaced = false,
  ) {
    const platform = execConfig.platform ?? 'web'
    const prepared = resolvePlatformKeys(
      { Root: normalizeDeclarations(tokenStyle) },
      platform,
    )
    const rules = {
      Root: declaration(prepared.Root as Record<string, unknown>),
    }
    const plan = compileRules(reference, rules, platform)
    if (platform === 'native') {
      const selected = resolvePlan(plan, reference, execConfig.tokens)
      return {
        className: '_',
        ...nativeBackend.resolve(foldOperations(selected['Root'] ?? [])),
      }
    }
    return resolveCssPlan(
      plan,
      reference,
      execConfig.tokens,
      {},
      {
        useClassName: execConfig.useClassName,
        namespace: !unnamespaced,
      },
    )['Root']!
  }
}
