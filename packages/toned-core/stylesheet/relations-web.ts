type Interest = {
  attributes: readonly string[]
  targets?: () => readonly Node[]
}
const radio = (node: Node | EventTarget | null): boolean =>
  !!node &&
  (node as Element).nodeName === 'INPUT' &&
  (node as HTMLInputElement).type === 'radio'
const related = (first: Node, second: Node) =>
  first === second || first.contains(second) || second.contains(first)
function affected(
  interest: Interest,
  records: readonly MutationRecord[],
): boolean {
  if (!interest.targets) return true
  const targets = interest.targets()
  // Checked/default/indeterminate facts can depend on radios outside this
  // family's subtree. Keep their mutation channel deliberately conservative.
  if (targets.some((target) => radio(target) || target.nodeName === 'OPTION'))
    return true
  return records.some((record) => {
    if (record.type === 'attributes') {
      if (
        !stateAttributes.includes(record.attributeName!) &&
        !interest.attributes.includes(record.attributeName!)
      )
        return false
      return targets.some((target) => related(target, record.target))
    }
    // Include former ancestry through removedNodes, plus sibling insertion/order
    // changes (e.g. :first-child). Unrelated branches do not invalidate a family.
    return targets.some(
      (target) =>
        target === record.target ||
        target.contains(record.target) ||
        target.parentNode === record.target ||
        [...record.addedNodes, ...record.removedNodes].some((node) =>
          related(target, node),
        ),
    )
  })
}

/** One topology/state observer per document, shared by opted-in relation controllers. */
const observers = new WeakMap<
  Document,
  {
    listeners: Map<() => void, Interest>
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
  targets?: () => readonly Node[],
): () => void {
  let entry = observers.get(document)
  if (!entry) {
    const Observer = document.defaultView?.MutationObserver
    if (!Observer)
      throw new Error(
        'Toned: web relations require MutationObserver topology tracking',
      )
    const listeners = new Map<() => void, Interest>()
    const update = (records: readonly MutationRecord[]) => {
      for (const [listener, interest] of listeners)
        if (affected(interest, records)) listener()
    }
    const eventUpdate = (event: Event) => {
      for (const [listener, interest] of listeners)
        if (
          !interest.targets ||
          radio(event.target) ||
          (event.target &&
            interest
              .targets()
              .some((target) => related(target, event.target as Node)))
        )
          listener()
    }
    const observer = new Observer(update)
    let observedAttributes = ''
    const observe = () => {
      const attributes = [
        ...new Set([
          ...stateAttributes,
          ...[...listeners.values()].flatMap((interest) => interest.attributes),
        ]),
      ]
        .filter((attribute) => attribute !== 'style')
        .sort()
      const key = attributes.join('\0')
      if (key === observedAttributes) return
      observedAttributes = key
      const pending = observer.takeRecords()
      observer.disconnect()
      observer.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        // Style writes are outputs of the controller, not semantic state inputs.
        // Alias selector attributes are supplied by each system and unioned here.
        attributeFilter: attributes,
      })
      // Changing the shared interest set must not discard an already queued
      // topology/state change belonging to a surviving subscriber.
      if (pending.length) update(pending)
    }
    for (const event of stateEvents)
      document.addEventListener(event, eventUpdate, true)
    entry = {
      listeners,
      observe,
      stop: () => {
        observer.disconnect()
        for (const event of stateEvents)
          document.removeEventListener(event, eventUpdate, true)
      },
    }
    observers.set(document, entry)
  }
  entry.listeners.set(notify, { attributes, targets })
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
