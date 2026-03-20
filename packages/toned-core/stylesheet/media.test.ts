import { describe, expect, test, vi } from 'vitest'
import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'
import { initMedia } from './media.ts'

// biome-ignore lint/suspicious/noExplicitAny: test helper for globalThis access
const g = globalThis as any

const createMockSystem = (breakpoints?: Record<string, number>) =>
  ({
    system: {},
    config: breakpoints
      ? { breakpoints: { __breakpoints: breakpoints } }
      : undefined,
    t: () => ({}),
    stylesheet: () => ({}),
    exec: () => ({ style: {}, className: '' }),
  }) as unknown as TokenSystem<TokenStyleDeclaration>

function createMockMediaQueryList(
  query: string,
  matches: boolean,
): MediaQueryList {
  return {
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  }
}

/**
 * Stub `window` as a global with a mock `matchMedia` implementation.
 * The source code reads `typeof window` to decide SSR vs browser,
 * so we must stub the whole `window` object, not just `matchMedia`.
 */
function stubWindowWithMatchMedia(
  matchMediaImpl: (query: string) => MediaQueryList,
) {
  vi.stubGlobal('window', { matchMedia: matchMediaImpl })
}

describe('initMedia', () => {
  describe('SSR safety', () => {
    test('does not crash when window is undefined', () => {
      const originalWindow = g.window
      // biome-ignore lint/performance/noDelete: need to simulate SSR where window is truly absent
      delete g.window

      try {
        const emitter = initMedia(createMockSystem({ sm: 640, md: 768 }))
        expect(emitter).toBeDefined()
        expect(emitter.data).toEqual({
          '@sm': undefined,
          '@md': undefined,
        })
      } finally {
        g.window = originalWindow
      }
    })

    test('returns emitter with empty data when no breakpoints configured', () => {
      const originalWindow = g.window
      // biome-ignore lint/performance/noDelete: need to simulate SSR where window is truly absent
      delete g.window

      try {
        const emitter = initMedia(createMockSystem())
        expect(emitter).toBeDefined()
        expect(emitter.data).toEqual({})
      } finally {
        g.window = originalWindow
      }
    })

    test('returns emitter with empty data when config is undefined', () => {
      const system = {
        system: {},
        config: undefined,
        t: () => ({}),
        stylesheet: () => ({}),
        exec: () => ({ style: {}, className: '' }),
      } as unknown as TokenSystem<TokenStyleDeclaration>

      const originalWindow = g.window
      // biome-ignore lint/performance/noDelete: need to simulate SSR where window is truly absent
      delete g.window

      try {
        const emitter = initMedia(system)
        expect(emitter).toBeDefined()
        expect(emitter.data).toEqual({})
      } finally {
        g.window = originalWindow
      }
    })
  })

  describe('Emitter subscribe/emit/unsubscribe', () => {
    test('sub registers a listener that receives emitted data', () => {
      const emitter = initMedia(createMockSystem())

      const listener = vi.fn()
      emitter.sub(listener)

      emitter.emit({ '@test': true })
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith({ '@test': true })
    })

    test('emit updates the emitter data', () => {
      const emitter = initMedia(createMockSystem())

      emitter.emit({ '@sm': true })
      expect(emitter.data['@sm']).toBe(true)

      emitter.emit({ '@sm': false })
      expect(emitter.data['@sm']).toBe(false)
    })

    test('emit merges partial data into existing data', () => {
      const emitter = initMedia(createMockSystem())

      emitter.emit({ '@sm': true })
      emitter.emit({ '@md': false })

      expect(emitter.data['@sm']).toBe(true)
      expect(emitter.data['@md']).toBe(false)
    })

    test('multiple listeners all receive emitted data', () => {
      const emitter = initMedia(createMockSystem())

      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()
      emitter.sub(listener1)
      emitter.sub(listener2)
      emitter.sub(listener3)

      emitter.emit({ '@sm': true })

      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(1)
    })

    test('unsubscribe removes listener from receiving future events', () => {
      const emitter = initMedia(createMockSystem())

      const listener = vi.fn()
      const unsub = emitter.sub(listener)

      emitter.emit({ '@sm': true })
      expect(listener).toHaveBeenCalledTimes(1)

      unsub()

      emitter.emit({ '@sm': false })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    test('unsubscribing one listener does not affect others', () => {
      const emitter = initMedia(createMockSystem())

      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const unsub1 = emitter.sub(listener1)
      emitter.sub(listener2)

      unsub1()

      emitter.emit({ '@sm': true })
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalledTimes(1)
    })

    test('calling unsubscribe multiple times is safe', () => {
      const emitter = initMedia(createMockSystem())

      const listener = vi.fn()
      const unsub = emitter.sub(listener)

      unsub()
      unsub()
      unsub()

      emitter.emit({ '@sm': true })
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('@ prefix addition', () => {
    test('keys without @ get @ prepended in emitter data', () => {
      stubWindowWithMatchMedia((query) =>
        createMockMediaQueryList(query, false),
      )

      try {
        const emitter = initMedia(
          createMockSystem({ sm: 640, md: 768, lg: 1024 }),
        )

        expect(emitter.data).toHaveProperty('@sm')
        expect(emitter.data).toHaveProperty('@md')
        expect(emitter.data).toHaveProperty('@lg')
        expect(emitter.data).not.toHaveProperty('sm')
        expect(emitter.data).not.toHaveProperty('md')
        expect(emitter.data).not.toHaveProperty('lg')
      } finally {
        vi.unstubAllGlobals()
      }
    })

    test('keys already starting with @ are not double-prefixed', () => {
      stubWindowWithMatchMedia((query) =>
        createMockMediaQueryList(query, false),
      )

      try {
        const system = {
          system: {},
          config: {
            breakpoints: {
              __breakpoints: { '@already': 500 },
            },
          },
          t: () => ({}),
          stylesheet: () => ({}),
          exec: () => ({ style: {}, className: '' }),
        } as unknown as TokenSystem<TokenStyleDeclaration>

        const emitter = initMedia(system)

        expect(emitter.data).toHaveProperty('@already')
        expect(emitter.data).not.toHaveProperty('@@already')
      } finally {
        vi.unstubAllGlobals()
      }
    })
  })

  describe('matchMedia integration', () => {
    test('calls matchMedia with correct min-width queries', () => {
      const mockMatchMedia = vi.fn((query: string) =>
        createMockMediaQueryList(query, false),
      )
      stubWindowWithMatchMedia(mockMatchMedia)

      try {
        initMedia(createMockSystem({ sm: 640, md: 768, lg: 1024 }))

        expect(mockMatchMedia).toHaveBeenCalledTimes(3)
        expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 640px)')
        expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 768px)')
        expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 1024px)')
      } finally {
        vi.unstubAllGlobals()
      }
    })

    test('initializes emitter data with current matchMedia matches values', () => {
      const mockMatchMedia = vi.fn((query: string) =>
        createMockMediaQueryList(query, query.includes('640')),
      )
      stubWindowWithMatchMedia(mockMatchMedia)

      try {
        const emitter = initMedia(
          createMockSystem({ sm: 640, md: 768, lg: 1024 }),
        )

        expect(emitter.data['@sm']).toBe(true)
        expect(emitter.data['@md']).toBe(false)
        expect(emitter.data['@lg']).toBe(false)
      } finally {
        vi.unstubAllGlobals()
      }
    })

    test('registers addListener on each MediaQueryList for expo compat', () => {
      const addListenerMocks: ReturnType<typeof vi.fn>[] = []

      const mockMatchMedia = vi.fn((query: string) => {
        const addListener = vi.fn()
        addListenerMocks.push(addListener)
        return {
          ...createMockMediaQueryList(query, false),
          addListener,
        }
      })
      stubWindowWithMatchMedia(mockMatchMedia)

      try {
        initMedia(createMockSystem({ sm: 640, md: 768 }))

        expect(addListenerMocks).toHaveLength(2)
        for (const mock of addListenerMocks) {
          expect(mock).toHaveBeenCalledTimes(1)
          expect(typeof mock.mock.calls[0]?.[0]).toBe('function')
        }
      } finally {
        vi.unstubAllGlobals()
      }
    })

    test('media change events update emitter data and notify listeners', () => {
      type MediaChangeCallback = (e: { matches: boolean }) => void
      const callbacks: Record<string, MediaChangeCallback> = {}

      const mockMatchMedia = vi.fn((query: string) => ({
        ...createMockMediaQueryList(query, false),
        addListener: vi.fn((cb: MediaChangeCallback) => {
          callbacks[query] = cb
        }),
      }))
      stubWindowWithMatchMedia(mockMatchMedia)

      try {
        const emitter = initMedia(createMockSystem({ sm: 640, md: 768 }))

        const listener = vi.fn()
        emitter.sub(listener)

        const smCallback = callbacks[
          '(min-width: 640px)'
        ] as MediaChangeCallback
        const mdCallback = callbacks[
          '(min-width: 768px)'
        ] as MediaChangeCallback

        // Simulate sm breakpoint becoming active
        smCallback({ matches: true })

        expect(emitter.data['@sm']).toBe(true)
        expect(listener).toHaveBeenCalledTimes(1)
        expect(listener).toHaveBeenCalledWith({ '@sm': true })

        // Simulate md breakpoint becoming active
        mdCallback({ matches: true })

        expect(emitter.data['@md']).toBe(true)
        expect(listener).toHaveBeenCalledTimes(2)
        expect(listener).toHaveBeenCalledWith({ '@md': true })

        // Simulate sm breakpoint becoming inactive
        smCallback({ matches: false })

        expect(emitter.data['@sm']).toBe(false)
        expect(listener).toHaveBeenCalledTimes(3)
        expect(listener).toHaveBeenCalledWith({ '@sm': false })
      } finally {
        vi.unstubAllGlobals()
      }
    })

    test('handles empty breakpoints with matchMedia available', () => {
      const mockMatchMedia = vi.fn()
      stubWindowWithMatchMedia(mockMatchMedia)

      try {
        const emitter = initMedia(createMockSystem({}))

        expect(mockMatchMedia).not.toHaveBeenCalled()
        expect(emitter.data).toEqual({})
      } finally {
        vi.unstubAllGlobals()
      }
    })
  })
})
