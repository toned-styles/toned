import type { Tokens } from '@toned/core'
import { createContext } from 'react'

export const defineContext = (tokens: Tokens) =>
  new Proxy(tokens, {
    get(_target, prop: string) {
      const value = _target[prop]

      if (typeof value !== 'string') {
        return value
      }

      if (value.startsWith('var')) {
        return _target[value.slice(6, -1)]
      }

      if (value.includes('px')) {
        return Number.parseInt(value, 10)
      }

      return value
    },
  })

export const TokensContext = createContext<Tokens>(defineContext({}))
