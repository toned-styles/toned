import { type Config, getConfig, type Tokens } from '@toned/core'
import { getStylesheetPlan } from '@toned/core/stylesheet'
import { immutableSnapshot } from '@toned/core/utils'
import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
} from 'react'
import { bindTokenContext } from './token-config.ts'

const RendererTokensContext = createContext<ReadonlyMap<object, Tokens>>(
  new Map(),
)
const RuntimeConfigContext = createContext<Config | null>(null)
const RendererRegistryContext = createContext<ReadonlyMap<
  object,
  Config
> | null>(null)
function useStableScopeHook(hook: Config['useStyleOverrideScope']) {
  const installed = useRef(hook)
  if (installed.current !== hook)
    throw new Error(
      'Toned runtime: useStyleOverrideScope must remain the same hook while mounted; give the provider a new key, or remount legacy consumers after setConfig, to install a different host scope hook',
    )
}

/** Legacy explicit configuration for applications migrating from global installation. */
export function ConfigProvider({
  config,
  children,
}: {
  config: Config
  children?: ReactNode
}) {
  useStableScopeHook(config.useStyleOverrideScope)
  return createElement(
    RuntimeConfigContext.Provider,
    { value: config },
    children,
  )
}

/** A provider is an explicit boundary: unregistered systems never consult globals. */
export function useRuntimeConfig(sheet: object): Config {
  const registry = useContext(RendererRegistryContext)
  const legacy = useContext(RuntimeConfigContext)
  const config = registry
    ? registry.get(getStylesheetPlan(sheet).ref)
    : (legacy ?? getConfig())
  useStableScopeHook(config?.useStyleOverrideScope)
  if (!config)
    throw new Error(
      'TonedProvider: no renderer registered for this stylesheet system',
    )
  return config
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
  system: object
  backend: import('@toned/core/backends').OutputBackend
  tokens: Tokens
  validate(sheet: object): void
}>
export const VALIDATE_SHEET = Symbol.for('@toned/react/validate-sheet')
type RendererProps =
  | { renderer: ReactRenderer; theme?: Tokens }
  | { renderer: readonly ReactRenderer[]; theme?: never }

/** Register exact system identities once per tree; nested providers replace matching
 * registrations and inherit the remaining parent systems. No validation probing. */
export function TonedProvider({
  renderer,
  host,
  theme,
  children,
}: RendererProps & { host: ReactHost; children?: ReactNode }) {
  const parent = useContext(RendererRegistryContext)
  const parentTokens = useContext(RendererTokensContext)
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
  useStableScopeHook(useStyleOverrideScope)
  // biome-ignore lint/correctness/useExhaustiveDependencies: any changed host capability invalidates its cached renderer configurations
  const cache = useMemo(
    () => new WeakMap<object, Config>(),
    [
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
    ],
  )
  const themeSnapshot = useMemo(
    () => (theme === undefined ? undefined : immutableSnapshot(theme)),
    [theme],
  )
  if (Array.isArray(renderer) && theme !== undefined)
    throw new Error(
      'TonedProvider: theme is only valid for a single renderer; supply each renderer with its own tokens',
    )
  const registry = useMemo(() => {
    const renderers: readonly ReactRenderer[] = Array.isArray(renderer)
      ? renderer
      : [renderer as ReactRenderer]
    if (!renderers.length || renderers.length > 128)
      throw new Error('TonedProvider: register between 1 and 128 renderers')
    const next = new Map(parent ?? [])
    const local = new Set<object>()
    for (const current of renderers) {
      if (local.has(current.system))
        throw new Error(
          'TonedProvider: duplicate renderer registration for the same system',
        )
      local.add(current.system)
      if (platform !== current.backend.platform)
        throw new Error(
          `TonedProvider: ${current.backend.id} output requires a ${current.backend.platform} host`,
        )
      if (platform === 'native' && !nativeHost)
        throw new Error(
          'TonedProvider: native output requires an explicit nativeHost adapter',
        )
      let config = cache.get(current)
      if (!config) {
        config = Object.freeze(
          bindTokenContext(
            {
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
              getTokens: () => current.tokens,
              backend: current.backend,
              useClassName: current.backend.id === 'css-vars',
              useMedia: !current.backend.browserConditions,
              mediaMode: current.backend.browserConditions
                ? ('css' as const)
                : ('runtime' as const),
              pseudoMode: current.backend.browserConditions
                ? ('css' as const)
                : ('runtime' as const),
              debug: false,
            },
            RendererTokensContext,
            (values) => values.get(current.system) ?? current.tokens,
          ),
        )
        config = Object.freeze({
          ...config,
          [VALIDATE_SHEET]: current.validate,
        })
        cache.set(current, config)
      }
      next.set(current.system, config)
    }
    if (next.size > 128)
      throw new Error(
        'TonedProvider: inherited renderer registry exceeds 128 systems',
      )
    return next
  }, [
    parent,
    renderer,
    cache,
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
  const tokens = useMemo(() => {
    const values = new Map(parentTokens)
    const renderers = Array.isArray(renderer)
      ? renderer
      : [renderer as ReactRenderer]
    for (const current of renderers)
      values.set(current.system, themeSnapshot ?? current.tokens)
    return values
  }, [parentTokens, renderer, themeSnapshot])
  return createElement(
    RendererTokensContext.Provider,
    { value: tokens },
    createElement(
      RendererRegistryContext.Provider,
      { value: registry },
      children,
    ),
  )
}
