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

  if (this.matcher.interactions[elementKey]) {
    return {
      ref,

      ...this.getCurrentStyle(elementKey),

      ...this.setOn(elementKey, ':hover', 'onMouseOver', 'onMouseOut'),
      ...this.setOn(elementKey, ':active', 'onMouseDown', 'onMouseUp'),
      ...this.setOn(elementKey, ':focus', 'onBlur', 'onFocus'),
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
