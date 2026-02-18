import { defineConfig } from '@toned/core'
import type { Base } from '@toned/core/stylesheet'
import reactConfig from './config.ts'

// biome-ignore lint/suspicious/noExplicitAny: ignore
type AnyValue = any

type Ref = AnyValue

function getProps(this: Base, elementKey: string) {
  const ref = (current: Ref) => {
    this.refs[elementKey] = current
  }

  let result: Record<string, AnyValue>

  if (this.matcher.interactions[elementKey]) {
    result = {
      ref,

      ...this.getCurrentStyle(elementKey),

      ...this.setOn(elementKey, ':hover', 'onMouseOver', 'onMouseOut'),
      ...this.setOn(elementKey, ':active', 'onMouseDown', 'onMouseUp'),
      ...this.setOn(elementKey, ':focus', 'onBlur', 'onFocus'),
    }
  } else {
    result = {
      ref,

      ...this.getCurrentStyle(elementKey),
    }
  }

  Object.defineProperty(result, 'with', {
    value: (props: Record<string, AnyValue>) => {
      const merged: Record<string, AnyValue> = {}

      for (const key in result) {
        merged[key] = result[key]
      }

      for (const key in props) {
        if (props[key] == null) continue

        if (key === 'className') {
          merged[key] = merged[key]
            ? `${merged[key]} ${props[key]}`
            : props[key]
        } else if (key === 'style') {
          merged[key] = merged[key]
            ? { ...merged[key], ...props[key] }
            : props[key]
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

      return merged
    },
    enumerable: false,
    configurable: false,
  })

  return result
}

export default defineConfig({
  ...reactConfig,
  getProps,
})
