/** One topology/state observer per document, shared by opted-in relation controllers. */
const observers = new WeakMap<
  Document,
  { listeners: Set<() => void>; stop: () => void }
>()
export function subscribeWebRelations(
  document: Document,
  notify: () => void,
): () => void {
  let entry = observers.get(document)
  if (!entry) {
    const Observer = document.defaultView?.MutationObserver
    if (!Observer)
      throw new Error(
        'Toned: web relations require MutationObserver topology tracking',
      )
    const listeners = new Set<() => void>()
    const update = () => {
      for (const listener of listeners) listener()
    }
    const observer = new Observer(update)
    observer.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
    })
    document.addEventListener('change', update, true)
    document.addEventListener('input', update, true)
    entry = {
      listeners,
      stop: () => {
        observer.disconnect()
        document.removeEventListener('change', update, true)
        document.removeEventListener('input', update, true)
      },
    }
    observers.set(document, entry)
  }
  entry.listeners.add(notify)
  let subscribed = true
  return () => {
    if (!subscribed) return
    subscribed = false
    entry.listeners.delete(notify)
    if (!entry.listeners.size) {
      entry.stop()
      observers.delete(document)
    }
  }
}
