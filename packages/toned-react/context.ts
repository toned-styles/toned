import type { Tokens } from '@toned/core'
import { createContext } from 'react'

export const defineContext = (tokens: Tokens) =>
  new Proxy(tokens, {
    get(_target, prop: string) {
      return `var(--${prop})`
    },
  })

export const TokensContext = createContext<Tokens>(defineContext({}))
