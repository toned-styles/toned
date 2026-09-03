import { defineConfig } from '@toned/core'
import type { Base } from '@toned/core/stylesheet'
import reactConfig from './config.native.ts'

// biome-ignore lint/suspicious/noExplicitAny: ignore
type AnyValue = any

type Ref = AnyValue

function attachWith(result: Record<string, AnyValue>) {
  Object.defineProperty(result, 'with', {
    value: (props: Record<string, AnyValue>) => {
      const merged: Record<string, AnyValue> = {}

      for (const key in result) {
        merged[key] = result[key]
      }

      for (const key in props) {
        if (props[key] == null) continue

        if (key === 'style') {
          const tonedStyle = merged[key]
          const userStyle = props[key]

          if (typeof tonedStyle === 'function') {
            merged[key] = (state: AnyValue) => ({
              ...tonedStyle(state),
              ...userStyle,
            })
          } else {
            merged[key] = merged[key]
              ? { ...merged[key], ...userStyle }
              : userStyle
          }
        } else if (key === 'ref') {
          const tonedRef = merged[key]
          const userRef = props[key]
          merged[key] = (node: AnyValue) => {
            tonedRef(node)
            if (typeof userRef === 'function') return userRef(node)
            if (userRef) userRef.current = node
          }
        } else if (key.startsWith('on') && typeof merged[key] === 'function') {
          const tonedHandler = merged[key]
          const userHandler = props[key]
          merged[key] = (...args: AnyValue[]) => {
            tonedHandler(...args)
            userHandler(...args)
          }
        } else {
          merged[key] = props[key]
        }
      }

      attachWith(merged)
      return merged
    },
    enumerable: false,
    configurable: false,
  })
}

function getProps(this: Base, elementKey: string) {
  const ref = (current: Ref) => {
    this.refs[elementKey] = current
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
      ...this.getCurrentStyle(elementKey),
      ...this.setOn(elementKey, ':active', 'onPressIn', 'onPressOut'),
      ...this.setOn(elementKey, ':hover', 'onHoverIn', 'onHoverOut'),
      ...this.setOn(elementKey, ':focus', 'onFocus', 'onBlur'),
    }
  } else {
    result = {
      ref,

      ...this.getCurrentStyle(elementKey),
    }
  }

  surfaceBridgeProps(result)
  attachWith(result)

  return result
}

// Unlike web, there is no universal native default: toned-react has no
// react-native dependency (and must not), so it cannot name View/Text/Image
// itself. The NATIVE HOST supplies the resolver — `@lib/haelo-primitives`
// installs a `resolveElement` returning its own View/Text/Image via setConfig,
// exactly as it would override any config field. Until one is installed,
// `useBind`/`bind` on native throw here rather than render a wrong element.
function resolveElement(type?: string): never {
  throw new Error(
    `useBind/bind on native need a host resolveElement (got $$type ${JSON.stringify(
      type,
    )}). Install one via setConfig — e.g. @lib/haelo-primitives mapping ` +
      `view→View, text→Text, image→Image. toned-react ships no native default ` +
      `because it has no react-native dependency.`,
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
})
