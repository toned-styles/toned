import type { AdaptiveStore } from './index.ts'

/** Observe the available parent/container, never the adaptive layout's output.
 * Intrinsic content, text scale and insets remain explicit store measurements. */
export function observeAdaptiveContainer<
  Axis extends string,
  Name extends string,
  Area extends string,
>(
  store: AdaptiveStore<Axis, Name, Area>,
  availableContainer: Element,
  Observer: typeof ResizeObserver = globalThis.ResizeObserver,
): () => void {
  if (typeof Observer !== 'function')
    throw new Error(
      'Toned adaptive: ResizeObserver is unavailable; provide container measurements explicitly',
    )
  let active = true
  const observer = new Observer((entries) => {
    if (!active) return
    for (const entry of entries)
      if (entry.target === availableContainer) {
        store.update({
          container: {
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          },
        })
        break
      }
  })
  try {
    observer.observe(availableContainer)
  } catch (error) {
    active = false
    observer.disconnect()
    throw error
  }
  return () => {
    if (active) {
      active = false
      observer.disconnect()
    }
  }
}

/** Viewport dimensions only: browser zoom is not assumed to be user text scale. */
export function observeAdaptiveViewport<
  Axis extends string,
  Name extends string,
  Area extends string,
>(
  store: AdaptiveStore<Axis, Name, Area>,
  viewport: Pick<
    Window,
    'innerWidth' | 'innerHeight' | 'addEventListener' | 'removeEventListener'
  > = globalThis.window,
): () => void {
  if (!viewport)
    throw new Error(
      'Toned adaptive: viewport observation needs a browser window',
    )
  let active = true
  const update = () => {
    if (active)
      store.update({
        viewport: { width: viewport.innerWidth, height: viewport.innerHeight },
      })
  }
  update()
  viewport.addEventListener('resize', update)
  return () => {
    if (active) {
      active = false
      viewport.removeEventListener('resize', update)
    }
  }
}
