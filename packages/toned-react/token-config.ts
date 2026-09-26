import { type Config, defineConfig, type Tokens } from '@toned/core'
import { type Context, createContext, useContext, useMemo } from 'react'

export const TOKEN_CONTEXT = Symbol.for('@toned/react/token-context')
const NoTokensContext = createContext<unknown>({})
type ReactConfig = Config & {
  [TOKEN_CONTEXT]?: {
    context: Context<unknown>
    fallback: () => Tokens
    select?: (value: unknown) => Tokens
  }
}

/** Attach a token context to a fully explicit config without reading globals. */
export function bindTokenContext<T>(
  config: Config,
  context: Context<T>,
  select?: (value: T) => Tokens,
): Config {
  return Object.assign({}, config, {
    [TOKEN_CONTEXT]: { context, fallback: config.getTokens, select },
  })
}

/** Legacy config factory; explicit renderer providers use bindTokenContext. */
export function createReactConfig(
  context: Context<Tokens>,
  fallback: Tokens = {},
  host: Partial<Config> = {},
): Config {
  return bindTokenContext(
    defineConfig({ ...host, getTokens: () => fallback }),
    context,
  )
}

export function useTokenConfig(config: Config): Config {
  const binding = (config as ReactConfig)[TOKEN_CONTEXT]
  const context =
    binding?.fallback === config.getTokens ? binding.context : undefined
  const value = useContext(context ?? NoTokensContext)
  const tokens =
    context && binding?.select ? binding.select(value) : (value as Tokens)
  return useMemo(
    () => (context ? { ...config, getTokens: () => tokens! } : config),
    [config, context, tokens],
  )
}
