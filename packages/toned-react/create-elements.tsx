import type { SYMBOL_INIT } from '@toned/core'
import {
  type Base,
  stylesheetParts,
  stylesheetVariantAxes,
} from '@toned/core/stylesheet'
import {
  createContext,
  createElement,
  forwardRef,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react'
import { useStyles } from './index.ts'
import { type HostProps, PartHost } from './part-host.tsx'
import { assertStandalonePart } from './shared-scope.ts'
import { controllerOf } from './style-view.ts'

// The typed public export in index.ts preserves each stylesheet's axes and parts.
// biome-ignore lint/suspicious/noExplicitAny: stylesheet adapter boundary
type StylesheetLike = { [SYMBOL_INIT]: (...args: any[]) => any }

const serverValidationRevision = () => 0

/** A custom host may move its forwarded ref using only its own internal state.
 * Observe committed invalidations separately so that validating that topology
 * neither rerenders the provider/parts nor throws outside React's boundaries. */
function ValidationObserver({ instance }: { instance: Base }) {
  const subscribe = useCallback(
    (notify: () => void) => instance.subscribeHostValidation(notify),
    [instance],
  )
  const snapshot = useCallback(
    () => instance.hostValidationRevision,
    [instance],
  )
  const revision = useSyncExternalStore(
    subscribe,
    snapshot,
    serverValidationRevision,
  )
  useEffect(() => {
    if (revision > 0) instance.validatePendingHosts()
  }, [instance, revision])
  return null
}

function useController(sheet: StylesheetLike, variants?: object): Base {
  return controllerOf(
    (useStyles as (sheet: StylesheetLike, options: object) => object)(sheet, {
      variants: variants ?? {},
    }),
  ) as Base
}

/** Define a component family once. Only mounted providers/standalone parts own
 * controllers; render snapshots travel as context values, never mutable statics. */
export function createElements(sheet: StylesheetLike) {
  for (const axis of stylesheetVariantAxes(sheet))
    if (['children', 'key', 'ref'].includes(axis))
      throw new Error(
        `Toned createElements: variant axis "${axis}" conflicts with React props; rename this axis or use useStyles`,
      )
  const Context = createContext<Base | null>(null)
  Context.displayName = 'TonedElements'

  function Elements({
    children,
    ...variants
  }: HostProps & { children?: ReactNode }) {
    const instance = useController(sheet, variants)
    return createElement(
      Context.Provider,
      { value: instance },
      children,
      createElement(ValidationObserver, { instance }),
    )
  }
  Elements.displayName = 'TonedElements'

  for (const part of stylesheetParts(sheet)) {
    // Function/React metadata cannot also be a component property. Diagnose at
    // authoring time rather than producing a family React will misinterpret.
    if (
      part in Elements ||
      ['$$typeof', 'render', 'defaultProps', 'propTypes'].includes(part)
    )
      throw new Error(
        `Toned createElements: part "${part}" conflicts with component metadata; rename this part or use useStyles`,
      )

    function Standalone({ props }: { props: HostProps }) {
      const instance = useController(sheet)
      assertStandalonePart(instance, part)
      return createElement(PartHost, { instance, part, props })
    }

    const Component = forwardRef<unknown, HostProps>(
      function Element(props, ref) {
        const instance = useContext(Context)
        const hostProps = ref ? { ...props, ref } : props
        return instance
          ? createElement(PartHost, { instance, part, props: hostProps })
          : createElement(Standalone, { props: hostProps })
      },
    )
    Component.displayName = `TonedElements.${part}`
    Object.defineProperty(Elements, part, {
      value: Component,
      enumerable: true,
    })
  }
  return Elements
}
