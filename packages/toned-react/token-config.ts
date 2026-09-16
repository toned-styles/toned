import { type Config, defineConfig, type Tokens } from '@toned/core'
import { type Context, createContext, useContext, useMemo } from 'react'

export const TOKEN_CONTEXT = Symbol.for('@toned/react/token-context')
const NoTokensContext = createContext<Tokens>({})
type ReactConfig = Config & {
  [TOKEN_CONTEXT]?: { context: Context<Tokens>; fallback: () => Tokens }
}

/** Context reads belong to hooks, never lazy token getters or constructors. */
export function createReactConfig(
  context: Context<Tokens>,
  fallback: Tokens = {},
  host: Partial<Config> = {},
): Config {
  const getTokens = () => fallback
  return Object.assign(defineConfig({ ...host, getTokens }), {
    [TOKEN_CONTEXT]: { context, fallback: getTokens },
  })
}

export function useTokenConfig(config: Config): Config {
  const binding = (config as ReactConfig)[TOKEN_CONTEXT]
  const context =
    binding?.fallback === config.getTokens ? binding.context : undefined
  const tokens = useContext(context ?? NoTokensContext)
  return useMemo(
    () => (context ? { ...config, getTokens: () => tokens! } : config),
    [config, context, tokens],
  )
}
