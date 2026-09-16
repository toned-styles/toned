type AnyValue = any

function flattenHostStyle(value: AnyValue): Record<string, AnyValue> {
  if (value == null || value === false) return {}
  if (Array.isArray(value))
    return Object.assign({}, ...value.map(flattenHostStyle))
  if (typeof value !== 'object') {
    throw new Error(
      '[toned] withProps.style requires a resolved style object or array of objects. Resolve registered native style IDs with StyleSheet.flatten, and express interaction styles in the stylesheet.',
    )
  }
  return value
}

export function addWith(
  obj: Record<string, AnyValue>,
): Record<string, AnyValue> {
  const withProps = (
    props: Record<string, AnyValue> | false | null | undefined,
  ) => {
    if (!props) return obj

    const merged: Record<string, AnyValue> = {}

    for (const key in obj) {
      merged[key] = obj[key]
    }

    for (const key in props) {
      if (props[key] == null) continue

      if (key === 'className') {
        merged[key] = merged[key] ? `${merged[key]} ${props[key]}` : props[key]
      } else if (key === 'style') {
        merged[key] = merged[key]
          ? {
              ...flattenHostStyle(merged[key]),
              ...flattenHostStyle(props[key]),
            }
          : flattenHostStyle(props[key])
      } else if (key === 'ref') {
        // Composed once below, including React 19 callback cleanup.
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

    const tonedRef = obj['ref']
    const userRef = props['ref']
    let detach: (() => void) | undefined
    merged['ref'] = (node: AnyValue, caller: AnyValue = {}) => {
      detach?.()
      detach = undefined
      if (!node) return
      const tonedCleanup = tonedRef?.(node, {
        ...props,
        ...caller,
        className: [props['className'], caller.className]
          .filter(Boolean)
          .join(' '),
        style: {
          ...flattenHostStyle(props['style']),
          ...flattenHostStyle(caller.style),
        },
      })
      const userCleanup =
        typeof userRef === 'function' ? userRef(node) : undefined
      if (userRef && typeof userRef !== 'function') userRef.current = node
      let attached = true
      detach = () => {
        if (!attached) return
        attached = false
        if (typeof tonedCleanup === 'function') tonedCleanup()
        else tonedRef?.(null)
        if (typeof userCleanup === 'function') userCleanup()
        else if (typeof userRef === 'function') userRef(null)
        else if (userRef) userRef.current = null
      }
      return detach
    }
    return addWith(merged)
  }
  for (const name of ['with', 'withProps'])
    Object.defineProperty(obj, name, {
      value: withProps,
      enumerable: false,
      configurable: false,
    })

  return obj
}
