import { defineConfig } from '@toned/core'
import type { Base } from '@toned/core/stylesheet'
import reactConfig from './config.ts'

// biome-ignore lint/suspicious/noExplicitAny: ignore
type AnyValue = any

type Ref = AnyValue

function addWith(obj: Record<string, AnyValue>): Record<string, AnyValue> {
  Object.defineProperty(obj, 'with', {
    value: (props: Record<string, AnyValue> | false | null | undefined) => {
      if (!props) return obj

      const merged: Record<string, AnyValue> = {}

      for (const key in obj) {
        merged[key] = obj[key]
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

      return addWith(merged)
    },
    enumerable: false,
    configurable: false,
  })

  return obj
}

function getProps(this: Base, elementKey: string) {
  const ref = (current: Ref) => {
    if (current) {
      if (!this.refs[elementKey]) this.refs[elementKey] = []
      if (!this.refs[elementKey].includes(current))
        this.refs[elementKey].push(current)
      // React (re)applies the pseudo-free resting style on every commit, so
      // restore this element's own live hover/active/focus here — otherwise an
      // unrelated re-render would drop its interaction state (and, for
      // multi-instance stylesheets, paint every sibling with the global state).
      if (this.matcher.interactions[elementKey])
        this.reapplyInteraction(elementKey, current)
    } else {
      this.pruneDisconnected(elementKey)
    }
  }

  let result: Record<string, AnyValue>

  if (this.matcher.interactions[elementKey]) {
    if (!this._activeEls) this._activeEls = {}

    const onMouseEnter = (e: AnyValue) => {
      const el = e.currentTarget
      const stateKey = `${elementKey}:hover`
      if (!this._activeEls[stateKey]) this._activeEls[stateKey] = new Set()
      this._activeEls[stateKey].add(el)
      this.applyState(
        { [stateKey]: true },
        { triggerKey: elementKey, pseudo: ':hover' },
      )
    }

    const onMouseLeave = (e: AnyValue) => {
      const el = e.currentTarget
      const stateKey = `${elementKey}:hover`
      const set = this._activeEls[stateKey]
      if (set) set.delete(el)
      const anyActive = (set?.size ?? 0) > 0
      this.applyState(
        { [stateKey]: anyActive },
        { triggerKey: elementKey, pseudo: ':hover' },
      )
    }

    const onMouseDown = (e: AnyValue) => {
      // Only the primary (left) button drives :active. Without this guard a
      // right-click can leave the element stuck active if the context menu
      // swallows the mouseup.
      if (e.button !== 0) return
      const el = e.currentTarget
      const stateKey = `${elementKey}:active`
      if (!this._activeEls[stateKey]) this._activeEls[stateKey] = new Set()
      this._activeEls[stateKey].add(el)
      this.applyState(
        { [stateKey]: true },
        { triggerKey: elementKey, pseudo: ':active' },
      )
      const onMouseUp = () => {
        document.removeEventListener('mouseup', onMouseUp)
        const activeSet = this._activeEls[stateKey]
        if (activeSet) activeSet.delete(el)
        const stillActive = (activeSet?.size ?? 0) > 0
        if (el?.isConnected) {
          this.applyState(
            { [stateKey]: stillActive },
            { triggerKey: elementKey, pseudo: ':active' },
          )
        }
      }
      document.addEventListener('mouseup', onMouseUp)
    }

    const onFocus = (e: AnyValue) => {
      const el = e.currentTarget
      const stateKey = `${elementKey}:focus`
      if (!this._activeEls[stateKey]) this._activeEls[stateKey] = new Set()
      this._activeEls[stateKey].add(el)
      this.applyState(
        { [stateKey]: true },
        { triggerKey: elementKey, pseudo: ':focus' },
      )
    }

    const onBlur = (e: AnyValue) => {
      const el = e.currentTarget
      const stateKey = `${elementKey}:focus`
      const set = this._activeEls[stateKey]
      if (set) set.delete(el)
      const anyActive = (set?.size ?? 0) > 0
      this.applyState(
        { [stateKey]: anyActive },
        { triggerKey: elementKey, pseudo: ':focus' },
      )
    }

    result = {
      ref,
      ...this.getRestingStyle(elementKey),
      onMouseEnter,
      onMouseLeave,
      onMouseDown,
      onFocus,
      onBlur,
    }
  } else {
    result = {
      ref,

      ...this.getCurrentStyle(elementKey),
    }
  }

  return addWith(result)
}

export default defineConfig({
  ...reactConfig,
  getProps,
})
