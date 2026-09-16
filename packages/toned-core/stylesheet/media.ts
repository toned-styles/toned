// Note: Media handling could be made configurable for SSR/custom implementations
// Currently uses window.matchMedia directly which works for web and expo-media

import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'

export const initMedia = <S extends TokenStyleDeclaration>({
  config,
}: TokenSystem<S>) => {
  const w = typeof window === 'undefined' ? null : window

  const medias = Object.fromEntries(
    Object.entries(
      (config?.breakpoints?.__breakpoints ?? {}) as Record<
        string,
        number | string
      >,
    ).map(
      // A number is px; a string length passes through as-is (appending px to
      // '30rem' produced the invalid '30rempx' — every rem breakpoint was
      // silently dead in runtime mode); a parenthesised string is a raw
      // condition and IS the query.
      ([key, value]) => [
        key,
        w?.matchMedia(
          typeof value === 'number'
            ? `(min-width: ${value}px)`
            : value.startsWith('(')
              ? value
              : `(min-width: ${value})`,
        ),
      ],
    ),
  )

  const mediaEmitter = new Emitter<Partial<Record<string, boolean>>>(
    Object.fromEntries(
      Object.entries(medias).map(([key, value]) => [
        // Add @ prefix for runtime matching against @-prefixed selectors in StyleMatcher
        key.startsWith('@') ? key : `@${key}`,
        value?.matches,
      ]),
    ),
  )

  // MediaQueryLists are shared per system; listeners belong to committed
  // controllers and disappear when the last controller unmounts.
  mediaEmitter.connect = () => {
    const cleanups: Array<() => void> = []
    for (const [key, value] of Object.entries(medias)) {
      const emitterKey = key.startsWith('@') ? key : `@${key}`
      if (!value) continue
      mediaEmitter.data[emitterKey] = value.matches
      const listener = (event: { matches: boolean }) =>
        mediaEmitter.emit({ [emitterKey]: event.matches })
      value.addListener(listener)
      cleanups.push(() => value.removeListener(listener))
    }
    return () => {
      for (const cleanup of cleanups) cleanup()
    }
  }

  return mediaEmitter
}

// biome-ignore lint/suspicious/noExplicitAny: generic emitter requires flexible value types
class Emitter<T extends Record<string, any>> {
  private listeners = new Set<(data: Partial<T>) => void>()

  data: T
  connect?: () => () => void
  private disconnect?: () => void
  constructor(data: T) {
    this.data = data
  }

  emit(data: Partial<T>) {
    Object.assign(this.data, data)

    this.listeners.forEach((cb) => {
      cb(data)
    })
  }

  sub(listener: (data: Partial<T>) => void) {
    if (this.listeners.size === 0) this.disconnect = this.connect?.()
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) {
        this.disconnect?.()
        this.disconnect = undefined
      }
    }
  }
}
