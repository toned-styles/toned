import { defineConfig } from '@toned/core'
import type { Base } from '@toned/core/stylesheet'
import reactConfig from './config.ts'

// biome-ignore lint/suspicious/noExplicitAny: ignore
type AnyValue = any

type Ref = AnyValue

type InteractionState = { hovered: boolean; pressed: boolean; focused: boolean }

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

  if (this.matcher.interactions[elementKey]) {
    result = {
      ref,
      style: (state: InteractionState) => {
        const interactiveState = {
          ':hover': state.hovered,
          ':active': state.pressed,
          ':focus': state.focused,
        }

        if (!this.interactiveState[elementKey]) {
          this.interactiveState[elementKey] = interactiveState
          return this.getCurrentStyle(elementKey)
        }

        this.interactiveState[elementKey] = interactiveState

        Object.assign(this.modsState, {
          [`${elementKey}:hover`]: state.hovered,
          [`${elementKey}:focus`]: state.focused,
          [`${elementKey}:active`]: state.pressed,
        })

        this.matchStyles()

        this.applyElementStyles()
      },
    }
  } else {
    result = {
      ref,

      ...this.getCurrentStyle(elementKey),
    }
  }

  attachWith(result)

  return result
}

export default defineConfig({
  ...reactConfig,
  getProps,
})
