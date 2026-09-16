import { type Config, getConfig, type Tokens } from '@toned/core'
import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
} from 'react'

import { createReactConfig } from './token-config.ts'

const RendererTokensContext = createContext<Tokens>({})
const RuntimeConfigContext = createContext<Config | null>(null)
/** An immutable renderer configuration scoped to this React tree. */
export function ConfigProvider({
  config,
  children,
}: {
  config: Config
  children?: ReactNode
}) {
  const installedScopeHook = useRef(config.useStyleOverrideScope)
  if (installedScopeHook.current !== config.useStyleOverrideScope)
    throw new Error(
      'Toned ConfigProvider: useStyleOverrideScope must remain the same hook while mounted; give the provider a new key to install a different host scope hook',
    )
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

/** The mounted host is independent of the chosen style output backend. */
export type ReactHost = Pick<
  Config,
  | 'platform'
  | 'getProps'
  | 'resolveElement'
  | 'initRef'
  | 'initInteraction'
  | 'nativeHost'
  | 'bridgeProps'
  | 'measureContainerProps'
  | 'getDirection'
  | 'useStyleOverrideScope'
  | 'matchStyleOverrideScope'
>
export type ReactRenderer = Readonly<{
  backend: import('@toned/core/backends').OutputBackend
  tokens: import('@toned/core').Tokens
  validate(sheet: object): void
}>

export const VALIDATE_SHEET = Symbol.for('@toned/react/validate-sheet')

/** Preferred configuration: one validated backend choice plus a compatible host.
 * Legacy ConfigProvider remains available for incremental migrations. */
export function TonedProvider({
  renderer,
  host,
  theme,
  children,
}: {
  renderer: ReactRenderer
  host: ReactHost
  theme?: import('@toned/core').Tokens
  children?: ReactNode
}) {
  const {
    platform,
    getProps,
    resolveElement,
    initRef,
    initInteraction,
    nativeHost,
    bridgeProps,
    measureContainerProps,
    getDirection,
    useStyleOverrideScope,
    matchStyleOverrideScope,
  } = host
  const config = useMemo(() => {
    const host = {
      platform,
      getProps,
      resolveElement,
      initRef,
      initInteraction,
      nativeHost,
      bridgeProps,
      measureContainerProps,
      getDirection,
      useStyleOverrideScope,
      matchStyleOverrideScope,
    }
    if (host.platform !== renderer.backend.platform)
      throw new Error(
        `TonedProvider: ${renderer.backend.id} output requires a ${renderer.backend.platform} host`,
      )
    if (host.platform === 'native' && !host.nativeHost)
      throw new Error(
        'TonedProvider: native output requires an explicit nativeHost adapter',
      )
    return Object.freeze({
      ...createReactConfig(RendererTokensContext, renderer.tokens, host),
      backend: renderer.backend,
      useClassName: renderer.backend.id === 'css-vars',
      useMedia: !renderer.backend.browserConditions,
      mediaMode: renderer.backend.browserConditions
        ? ('css' as const)
        : ('runtime' as const),
      pseudoMode: renderer.backend.browserConditions
        ? ('css' as const)
        : ('runtime' as const),
      debug: false,
      [VALIDATE_SHEET]: renderer.validate,
    })
  }, [
    renderer,
    platform,
    getProps,
    resolveElement,
    initRef,
    initInteraction,
    nativeHost,
    bridgeProps,
    measureContainerProps,
    getDirection,
    useStyleOverrideScope,
    matchStyleOverrideScope,
  ])
  return createElement(
    RendererTokensContext.Provider,
    { value: theme ?? renderer.tokens },
    createElement(ConfigProvider, { config }, children),
  )
}
