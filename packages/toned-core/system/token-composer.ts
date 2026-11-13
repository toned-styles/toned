import type {
  TokenStyle,
  TokenStyleDeclaration,
  TokenSystem,
} from '../types/index.ts'
import type { TFun } from '../types/stylesheet.ts'
import {
  immutableSnapshot,
  isImmutableSnapshot,
  isImmutableValue,
} from '../utils/immutable.ts'
import { mergeStyle } from '../utils/mergeStyle.ts'
import { BoundedMemo, plainKey } from '../utils/plain-key.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { SYMBOL_ACCESS, SYMBOL_REF, SYMBOL_STYLE } from '../utils/symbols.ts'
import { normalizeDeclarations } from './normalize.ts'

function condition(key: string) {
  return key.startsWith('@') || key.startsWith(':')
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function unwrap(
  input: Record<string | symbol, unknown>,
): Record<string, unknown> {
  if (SYMBOL_STYLE in input)
    return input[SYMBOL_STYLE] as Record<string, unknown>
  const output = { ...input }
  for (const [key, value] of Object.entries(input))
    if (condition(key) && record(value)) output[key] = unwrap(value)
  return output
}
function mergeDeclarations(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
) {
  for (const symbol of Object.getOwnPropertySymbols(source))
    Reflect.set(target, symbol, Reflect.get(source, symbol))
  for (const [key, value] of Object.entries(source)) {
    if (key === 'style' || key.endsWith('_style')) {
      target[key] = mergeStyle(target[key], value)
    } else if (condition(key) && record(value) && record(target[key])) {
      const nested = { ...target[key] }
      mergeDeclarations(nested, value)
      target[key] = nested
    } else target[key] = value
  }
}

/** Shared composition protocol. Only the legacy caller supplies a global context. */
export function createTokenComposer<S extends TokenStyleDeclaration>(
  reference: () => TokenSystem<S>,
  context: () => Parameters<TokenSystem<S>['exec']>[0],
  resolve?: (value: TokenStyle<S>) => { style: object; className?: string },
  immutableContext = false,
): TFun<S> {
  // Explicit composers resolve plain declarations against a fixed immutable
  // context, so equal inputs share one normalized value and one output.
  const memo = immutableContext
    ? new BoundedMemo<Composition>(MAX_COMPOSITIONS)
    : undefined
  const compose = (values: Record<string | symbol, unknown>[]) => {
    const ref = reference()
    const value: Record<string, unknown> & { style?: unknown } = {}
    for (const entry of values) {
      if (!entry) continue
      const source = normalizeDeclarations(unwrap(entry))
      mergeDeclarations(value, source)
    }
    if (SYMBOL_REF in value) return { passthrough: value }
    // Explicit composers own immutable context and declarations. Legacy system.t
    // deliberately re-reads the installed context on every getter access.
    if (immutableContext) {
      for (const key of Reflect.ownKeys(value))
        Reflect.set(value, key, immutableSnapshot(Reflect.get(value, key)))
      Object.freeze(value)
    }
    // Opaque values intentionally retain their identity and can remain mutable.
    // They are valid token inputs, but cannot participate in this optimization.
    const reusable =
      immutableContext &&
      isImmutableSnapshot(context().tokens) &&
      Reflect.ownKeys(value).every((key) =>
        isImmutableValue(Reflect.get(value, key)),
      )
    const resolveOutput = () => {
      if (resolve) return resolve(value as TokenStyle<S>)
      const config = context()
      return ref.exec(
        config,
        resolvePlatformKeys(value, config.platform) as TokenStyle<S>,
      )
    }
    let cached: ReturnType<typeof resolveOutput> | undefined
    const output = () => {
      if (!reusable) return resolveOutput()
      cached ??= immutableSnapshot(resolveOutput())
      return cached
    }
    return { ref, value, output, reusable }
  }
  type Composition = Exclude<
    ReturnType<typeof compose>,
    { passthrough: object }
  >
  return ((...values: Record<string | symbol, unknown>[]) => {
    const key = memo && plainKey(values)
    let composed = key === undefined ? undefined : memo!.get(key)
    if (!composed) {
      const result = compose(values)
      if ('passthrough' in result) return result.passthrough
      composed = result
      if (key !== undefined && composed.reusable) memo!.set(key, composed)
    }
    const { ref, value, output } = composed
    // A fresh wrapper per call: callers never share an object they can extend.
    return {
      [SYMBOL_REF]: ref,
      [SYMBOL_STYLE]: value,
      [SYMBOL_ACCESS]: { ref, value },
      get style() {
        return output().style
      },
      get className() {
        return output().className
      },
    }
  }) as unknown as TFun<S>
}
const MAX_COMPOSITIONS = 1024
