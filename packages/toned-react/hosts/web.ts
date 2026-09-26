import type { HostConditions } from '@toned/core'
import type { Base } from '@toned/core/stylesheet'
import { attachPart } from '../attach-part.ts'
import { addWith, supportsRefCleanup } from '../host-props.ts'
import type { ReactHost } from '../runtime-config.ts'

// biome-ignore lint/suspicious/noExplicitAny: ignore
type AnyValue = any

type Ref = AnyValue

function getProps(this: Base, elementKey: string, conditions?: HostConditions) {
  let detach: (() => void) | undefined
  const ref = (current: Ref, caller?: AnyValue) => {
    detach?.()
    detach = undefined
    if (!current) return
    detach = attachPart(this, elementKey, current, result, caller, conditions)
    return supportsRefCleanup ? detach : undefined
  }

  let result: Record<string, AnyValue>

  if (this.matcher.interactions[elementKey]) {
    // Track the element's pseudo-state in the Base (the single source of truth)
    // and push the shared "any element active?" flag into modsState.
    const setPseudo = (pseudo: string, el: AnyValue, on: boolean) => {
      const owner = this.eventOwner(el)
      owner.setElementActive(elementKey, pseudo, el, on)
      owner.applyState(
        {
          [`${elementKey}${pseudo}`]: owner.anyElementActive(
            elementKey,
            pseudo,
          ),
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
      let stopTracking: (() => void) | undefined
      const endPress = () => {
        stopTracking?.()
        document.removeEventListener('mouseup', endPress)
        document.removeEventListener('pointercancel', endPress)
        window.removeEventListener('blur', endPress)
        setPseudo(':active', el, false)
      }
      stopTracking = this.onHostDetach(el, endPress)
      document.addEventListener('mouseup', endPress)
      document.addEventListener('pointercancel', endPress)
      window.addEventListener('blur', endPress)
    }

    result = {
      ref,
      ...this.getRestingStyle(elementKey, conditions?.readSizes()),
      onMouseEnter,
      onMouseLeave,
      onMouseDown,
      onFocus,
      onBlur,
    }
  } else {
    result = {
      ref,

      ...this.getCurrentStyle(elementKey, conditions?.readSizes()),
    }
  }

  return addWith(result)
}

// The default web element for each `$$type`. A host (e.g. haelo-primitives)
// overrides `resolveElement` to render its own View/Text/Image/Pressable
// instead.
const WEB_ELEMENT_BY_TYPE: Record<string, 'div' | 'span' | 'img' | 'button'> = {
  view: 'div',
  text: 'span',
  image: 'img',
  pressable: 'button',
}

export const webHost: ReactHost = Object.freeze({
  initRef: () => {},
  initInteraction: () => {},
  platform: 'web',
  getProps,
  resolveElement: (type?: string) =>
    WEB_ELEMENT_BY_TYPE[type ?? 'view'] ?? 'div',
})
