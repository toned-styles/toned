/** One topology/state observer per document, shared by opted-in relation controllers. */
const observers = new WeakMap<
  Document,
  {
    listeners: Map<() => void, readonly string[]>
    observe: () => void
    stop: () => void
  }
>()
const stateAttributes = [
  'class',
  'id',
  'checked',
  'disabled',
  'selected',
  'open',
  'multiple',
  'required',
  'readonly',
  'type',
  'href',
  'tabindex',
  'hidden',
  'dir',
  'lang',
  'contenteditable',
  'placeholder',
  'value',
  'pattern',
  'min',
  'max',
  'step',
  'minlength',
  'maxlength',
]
const stateEvents = ['change', 'input', 'focusin', 'focusout']
export function subscribeWebRelations(
  document: Document,
  notify: () => void,
  attributes: readonly string[] = [],
): () => void {
  let entry = observers.get(document)
  if (!entry) {
    const Observer = document.defaultView?.MutationObserver
    if (!Observer)
      throw new Error(
        'Toned: web relations require MutationObserver topology tracking',
      )
    const listeners = new Map<() => void, readonly string[]>()
    const update = () => {
      for (const listener of listeners.keys()) listener()
    }
    const observer = new Observer(update)
    const observe = () => {
      const pending = observer.takeRecords()
      observer.disconnect()
      observer.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        // Style writes are outputs of the controller, not semantic state inputs.
        // Alias selector attributes are supplied by each system and unioned here.
        attributeFilter: [
          ...new Set([...stateAttributes, ...[...listeners.values()].flat()]),
        ].filter((attribute) => attribute !== 'style'),
      })
      // Changing the shared interest set must not discard an already queued
      // topology/state change belonging to a surviving subscriber.
      if (pending.length) update()
    }
    for (const event of stateEvents)
      document.addEventListener(event, update, true)
    entry = {
      listeners,
      observe,
      stop: () => {
        observer.disconnect()
        for (const event of stateEvents)
          document.removeEventListener(event, update, true)
      },
    }
    observers.set(document, entry)
  }
  entry.listeners.set(notify, attributes)
  entry.observe()
  let subscribed = true
  return () => {
    if (!subscribed) return
    subscribed = false
    entry.listeners.delete(notify)
    if (!entry.listeners.size) {
      entry.stop()
      observers.delete(document)
    } else entry.observe()
  }
}
