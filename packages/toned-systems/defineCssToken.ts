import { defineToken as defineTokenCore } from '@toned/core'
import type { TokenConfig, Tokens } from '@toned/core/types.ts'
import type { CSSProperties } from 'react'

export const defineToken = defineTokenCore as <
  // biome-ignore lint/suspicious/noExplicitAny: ignore
  const Values extends readonly any[],
>(
  config: TokenConfig<Values, CSSProperties>,
) => typeof config

// TODO: consider moving to the core
// biome-ignore lint/suspicious/noExplicitAny: generic token values
export const defineCssToken = <const Values extends Readonly<any[]>>(
  propName: keyof CSSProperties | Array<keyof CSSProperties>,
  values: Values,
  getValue?: (
    value: Values[number],
    tokens: Tokens,
  ) => string | number | undefined,
) => {
  return defineTokenCore({
    values,
    resolve: (value, tokens) => {
      const v = getValue ? getValue(value, tokens) : value

      if (!Array.isArray(propName)) {
        return {
          [propName]: v,
        }
      }

      return Object.fromEntries(propName.map((name) => [name, v]))
    },
  })
}
