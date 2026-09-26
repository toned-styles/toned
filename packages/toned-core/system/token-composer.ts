import type {
  TokenStyle,
  TokenStyleDeclaration,
  TokenSystem,
} from '../types/index.ts'
import type { TFun } from '../types/stylesheet.ts'
import { mergeStyle } from '../utils/mergeStyle.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { SYMBOL_ACCESS, SYMBOL_REF, SYMBOL_STYLE } from '../utils/symbols.ts'
import { normalizeDeclarations } from './normalize.ts'

/** Shared composition protocol. Only the legacy caller supplies a global context. */
export function createTokenComposer<S extends TokenStyleDeclaration>(
  reference: () => TokenSystem<S>,
  context: () => Parameters<TokenSystem<S>['exec']>[0],
  resolve?: (value: TokenStyle<S>) => { style: object; className?: string },
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
    const output = () => {
      if (resolve) return resolve(value as TokenStyle<S>)
      const config = context()
      return ref.exec(
        config,
        resolvePlatformKeys(value, config.platform) as TokenStyle<S>,
      )
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
