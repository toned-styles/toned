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
      let set = this.refs[elementKey]
      if (!(set instanceof Set)) set = this.refs[elementKey] = new Set()
      set.add(current)
      // React (re)applies the pseudo-free resting style on every commit, so
      // restore this element's own live hover/active/focus here — otherwise an
      // unrelated re-render would drop its interaction state (and, for
      // multi-instance stylesheets, paint every sibling with the global state).
      if (this.matcher.interactions[elementKey])
        this.reapplyInteraction(elementKey, current)
    }
    // On detach React calls this with null. We don't scan here: disconnected
    // nodes are pruned lazily (O(1)) during the next applyElementStyles, which
    // keeps ref handling O(n) per render instead of O(n^2).
  }

  let result: Record<string, AnyValue>

  if (this.matcher.interactions[elementKey]) {
    // Track the element's pseudo-state in the Base (the single source of truth)
    // and push the shared "any element active?" flag into modsState.
    const setPseudo = (pseudo: string, el: AnyValue, on: boolean) => {
      this.setElementActive(elementKey, pseudo, el, on)
      this.applyState(
        {
          [`${elementKey}${pseudo}`]: this.anyElementActive(elementKey, pseudo),
        },
        { triggerKey: elementKey, pseudo },
      )
    }

    const onMouseEnter = (e: AnyValue) =>
      setPseudo(':hover', e.currentTarget, true)
    const onMouseLeave = (e: AnyValue) =>
      setPseudo(':hover', e.currentTarget, false)
    const onFocus = (e: AnyValue) => setPseudo(':focus', e.currentTarget, true)
    const onBlur = (e: AnyValue) => setPseudo(':focus', e.currentTarget, false)

    const onMouseDown = (e: AnyValue) => {
      // Only the primary (left) button drives :active. Without this guard a
      // right-click can leave the element stuck active if the context menu
      // swallows the release.
      if (e.button !== 0) return
      const el = e.currentTarget
      setPseudo(':active', el, true)

      // A press can end anywhere — including outside the window, where no
      // `mouseup` is delivered. Reconcile `:active` on a document release, a
      // pointer cancel, or a window blur, and remove all three the moment one
      // fires. This replaces the previous per-press `mouseup` listener, which
      // leaked (and left the element stuck `:active`) on an off-window release.
      if (typeof document === 'undefined') return
      const endPress = () => {
        document.removeEventListener('mouseup', endPress)
        document.removeEventListener('pointercancel', endPress)
        window.removeEventListener('blur', endPress)
        setPseudo(':active', el, false)
      }
      document.addEventListener('mouseup', endPress)
      document.addEventListener('pointercancel', endPress)
      window.addEventListener('blur', endPress)
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

// The default web element for each `$$type`. A host (e.g. haelo-primitives)
// overrides `resolveElement` to render its own View/Text/Image instead.
const WEB_ELEMENT_BY_TYPE: Record<string, 'div' | 'span' | 'img'> = {
  view: 'div',
  text: 'span',
  image: 'img',
}

export default defineConfig({
  ...reactConfig,
  platform: 'web',
  getProps,
  resolveElement: (type?: string) => WEB_ELEMENT_BY_TYPE[type ?? 'view'] ?? 'div',
})
