import { type Config, getConfig } from '@toned/core'
import { createContext, createElement, type ReactNode, useContext } from 'react'

const RuntimeConfigContext = createContext<Config | null>(null)

/** An immutable renderer configuration scoped to this React tree. */
export function ConfigProvider({
  config,
  children,
}: {
  config: Config
  children?: ReactNode
}) {
  return createElement(
    RuntimeConfigContext.Provider,
    { value: config },
    children,
  )
}

/** Existing applications retain their installed global config as a fallback. */
export function useRuntimeConfig(): Config {
  return useContext(RuntimeConfigContext) ?? getConfig()
}
