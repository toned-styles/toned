import { defineConfig } from '@toned/core'
import type { Base } from '@toned/core/stylesheet'
import reactConfig from './config.ts'

// biome-ignore lint/suspicious/noExplicitAny: ignore
type AnyValue = any

type Ref = AnyValue

type InteractionState = { hovered: boolean; pressed: boolean; focused: boolean }

function getProps(this: Base, elementKey: string) {
  const ref = (current: Ref) => {
    this.refs[elementKey] = current
  }

  if (this.matcher.interactions[elementKey]) {
    return {
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
  }

  return {
    ref,

    ...this.getCurrentStyle(elementKey),
  }
}

export default defineConfig({
  ...reactConfig,
  getProps,
})
