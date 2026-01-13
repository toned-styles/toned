// Note: Media handling could be made configurable for SSR/custom implementations
// Currently uses window.matchMedia directly which works for web and expo-media

import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'

export const initMedia = <S extends TokenStyleDeclaration>({
  config,
}: TokenSystem<S>) => {
  const w = typeof window === 'undefined' ? null : window

  const medias = Object.fromEntries(
    Object.entries(config?.breakpoints?.__breakpoints ?? {}).map(
      ([key, value]) => [key, w?.matchMedia(`(min-width: ${value}px)`)],
    ),
  )

  const mediaEmitter = new Emitter<Partial<Record<string, boolean>>>(
    Object.fromEntries(
      Object.entries(medias).map(([key, value]) => [key, value?.matches]),
    ),
  )

  // NOTE: have to use `addListener` for expo-media compat

  Object.entries(medias).forEach(([key, value]) => {
    // has to use deprecated `addListener` for expo compat
    value?.addListener((e) => {
      mediaEmitter.emit({ [key]: e.matches })
    })
  })

  return mediaEmitter
}

// biome-ignore lint/suspicious/noExplicitAny: generic emitter requires flexible value types
class Emitter<T extends Record<string, any>> {
  private listeners = new Set<(data: Partial<T>) => void>()

  constructor(public data: T) {}

  emit(data: Partial<T>) {
    Object.assign(this.data, data)

    this.listeners.forEach((cb) => {
      cb(data)
    })
  }

  sub(listener: (data: Partial<T>) => void) {
    this.listeners.add(listener)

    return () => this.listeners.delete(listener)
  }
}
