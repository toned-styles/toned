import type { HostConditions } from '@toned/core'
import { type Base, registerNativeHost } from '@toned/core/stylesheet'
import { attachPart } from '../attach-part.ts'
import { addWith, supportsRefCleanup } from '../host-props.ts'
import type { ReactHost } from '../runtime-config.ts'

// biome-ignore lint/suspicious/noExplicitAny: ignore
type AnyValue = any

type Ref = AnyValue

function getProps(this: Base, elementKey: string, conditions?: HostConditions) {
  let host: Ref
  let detach: (() => void) | undefined
  const ref = (current: Ref, caller?: AnyValue) => {
    detach?.()
    detach = undefined
    host = current
    if (!current) return
    const adapter = this.config.nativeHost
    if (!adapter)
      throw new Error(
        '[toned/native] Configure nativeHost with a declared renderer adapter; setNativeProps alone does not establish support.',
      )
    const unregister = registerNativeHost(current, adapter)
    try {
      const release = attachPart(
        this,
        elementKey,
        current,
        result,
        caller,
        conditions,
      )
      detach = () => {
        release()
        // Base completes ownership release in its queued detach reconciliation.
        queueMicrotask(unregister)
      }
    } catch (error) {
      unregister()
      throw error
    }
    return supportsRefCleanup ? detach : undefined
  }

  let result: Record<string, AnyValue>

  // Bridge parameters surface as PROPS here — native has no pseudo-elements,
  // so `--toned-b-placeholder-color` becomes placeholderTextColor et al.
  const surfaceBridgeProps = (props: Record<string, AnyValue>) => {
    const mapping = this.config.bridgeProps
    const style = props['style']
    if (!mapping || !style) return props
    for (const varName in mapping) {
      if (varName in style) {
        const propName = mapping[varName]
        if (propName !== undefined) props[propName] = style[varName]
        delete style[varName]
      }
    }
    return props
  }

  if (this.matcher.interactions[elementKey]) {
    result = {
      ref,
      ...this.getRestingStyle(elementKey, conditions?.readSizes()),
      ...Object.fromEntries(
        [
          ['onPressIn', ':active', true],
          ['onPressOut', ':active', false],
          ['onHoverIn', ':hover', true],
          ['onHoverOut', ':hover', false],
          ['onFocus', ':focus', true],
          ['onBlur', ':focus', false],
        ].map(([event, pseudo, on]) => [
          event,
          () => {
            if (!host) return
            const owner = this.eventOwner(host)
            owner.setElementActive(
              elementKey,
              pseudo as string,
              host,
              on as boolean,
            )
            owner.applyState(
              {
                [`${elementKey}${pseudo}`]: owner.anyElementActive(
                  elementKey,
                  pseudo as string,
                ),
              },
              { triggerKey: elementKey, pseudo: pseudo as string },
            )
          },
        ]),
      ),
    }
  } else {
    result = {
      ref,

      ...this.getCurrentStyle(elementKey, conditions?.readSizes()),
    }
  }

  surfaceBridgeProps(result)

  // A `container` token's WEB paint (`container-type`/`container-name`) has
  // no native analogue — the binding measures the element instead (see
  // measureContainerProps below). RN warns on unknown style props, so both
  // are stripped rather than passed through.
  const style = result['style']
  if (style && typeof style === 'object') {
    delete (style as Record<string, unknown>)['containerType']
    delete (style as Record<string, unknown>)['containerName']
  }

  addWith(result)

  return result
}

// The native integration owns concrete View/Text/Image components. The core
// package has no React Native dependency and cannot choose a renderer for an app.
// Resolution remains lazy; install this resolver and nativeHost together in the
// host passed to TonedProvider.
function resolveElement(type?: string): never {
  throw new Error(
    `Native element families need a host resolveElement (got $$type ${JSON.stringify(
      type,
    )}). Pass resolveElement and nativeHost through the TonedProvider host before the first bound component renders — ` +
      'map view→View, text→Text, image→Image and pressable→Pressable from the selected renderer. ' +
      'toned-react ships no native default because it has no react-native dependency.',
  )
}

export const nativeHost: ReactHost = Object.freeze({
  initRef: () => {},
  initInteraction: () => {},
  platform: 'native',
  // Conventional bridge names (see BridgeConfig): a host renaming its bridges
  // overrides this map via setConfig.
  bridgeProps: {
    '--toned-b-placeholder-color': 'placeholderTextColor',
    '--toned-b-selection-color': 'selectionColor',
  },
  getProps,
  resolveElement,
  // The runtime container-query measurement seam: RN reports an element's
  // laid-out size through onLayout, which fires again only when the size
  // actually changes — the bounded native mirror of a ResizeObserver.
  measureContainerProps: (onSize: (width: number) => void) => ({
    onLayout: (e: { nativeEvent?: { layout?: { width?: number } } }) => {
      const w = e?.nativeEvent?.layout?.width
      if (typeof w === 'number') onSize(w)
    },
  }),
})
