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
import { resolvePlatformKeys } from '../utils/platform.ts'
import { SYMBOL_ACCESS, SYMBOL_REF, SYMBOL_STYLE } from '../utils/symbols.ts'
import { normalizeDeclarations } from './normalize.ts'

/** Shared composition protocol. Only the legacy caller supplies a global context. */
export function createTokenComposer<S extends TokenStyleDeclaration>(
  reference: () => TokenSystem<S>,
  context: () => Parameters<TokenSystem<S>['exec']>[0],
  resolve?: (value: TokenStyle<S>) => { style: object; className?: string },
  immutableContext = false,
): TFun<S> {
  return ((...values: Record<string | symbol, unknown>[]) => {
    const ref = reference()
    const value: Record<string, unknown> & { style?: unknown } = {}
    for (const entry of values) {
      const source = normalizeDeclarations(
        SYMBOL_STYLE in entry ? entry[SYMBOL_STYLE] : entry,
      ) as Record<string, unknown>
      const previous = value.style
      Object.assign(value, source)
      const merged = mergeStyle(previous, source['style'])
      if (merged !== undefined) value.style = merged
    }
    if (SYMBOL_REF in value) return value
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
