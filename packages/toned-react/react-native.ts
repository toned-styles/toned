import { defineConfig } from '@toned/core'
import type { Base } from '@toned/core/stylesheet'
import reactConfig from './config.native.ts'
import { addWith } from './host-props.ts'

// biome-ignore lint/suspicious/noExplicitAny: ignore
type AnyValue = any

type Ref = AnyValue

function getProps(this: Base, elementKey: string) {
  let host: Ref
  let detach: (() => void) | undefined
  const ref = (current: Ref, caller?: AnyValue) => {
    detach?.()
    detach = undefined
    host = current
    if (!current) return
    if (typeof current.setNativeProps !== 'function') {
      throw new Error(
        '[toned/native] Mounted targets must expose setNativeProps with merge patches and null resets; forward the native host ref or install a supported host adapter.',
      )
    }
    detach = this.attach(elementKey, current, result, caller)
    return detach
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
      ...this.getRestingStyle(elementKey),
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

      ...this.getCurrentStyle(elementKey),
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

// Unlike web, there is no universal native default: toned-react has no
// react-native dependency (and must not), so it cannot name View/Text/Image
// itself. The NATIVE HOST supplies the resolver — `@lib/haelo-primitives`
// installs a `resolveElement` returning its own View/Text/Image via setConfig,
// exactly as it would override any config field. `buildBoundMap` calls this
// LAZILY on first render (not at bind time), so this throws when a bound
// component actually renders with no host installed — not while a module is
// merely imported — and any `setConfig` before that first render is in time.
function resolveElement(type?: string): never {
  throw new Error(
    `useBind/bind on native need a host resolveElement (got $$type ${JSON.stringify(
      type,
    )}). Install one via setConfig before the first bound component renders — ` +
      'e.g. @lib/haelo-primitives mapping view→View, text→Text, image→Image, pressable→Pressable. ' +
      'toned-react ships no native default because it has no react-native dependency.',
  )
}

export default defineConfig({
  ...reactConfig,
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
