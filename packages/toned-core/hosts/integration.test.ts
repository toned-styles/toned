// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { defineSystem, getConfig } from '../index.ts'
import { createHostIntegration } from './index.ts'

const system = defineSystem({})

describe('opaque host lifecycle capabilities', () => {
  it('native topology and semantic facts never inspect a DOM shape', () => {
    const parent = {}
    const target = Object.defineProperties(
      {},
      Object.fromEntries(
        ['parentElement', 'ownerDocument', 'matches'].map((key) => [
          key,
          {
            get() {
              throw new Error(`DOM access: ${key}`)
            },
          },
        ]),
      ),
    )
    let notify: (() => void) | undefined
    const stop = vi.fn()
    const integration = createHostIntegration(
      {
        ...getConfig(),
        platform: 'native',
        nativeHost: {
          id: 'opaque-test',
          renderer: 'custom',
          version: '1',
          accepts: () => true,
          patch: () => {},
          resetStyle: () => null,
          resetProp: () => null,
          parentOf: (value) => (value === target ? parent : undefined),
          readState: (value, state) => value === target && state === 'selected',
          subscribeTopology: (callback) => {
            notify = callback
            return stop
          },
        },
      },
      system,
    )
    integration.validateRelations(['hover', 'selected'])
    expect(integration.parentOf(target)).toBe(parent)
    expect(integration.readState(target, 'selected')).toBe(true)
    const changed = vi.fn()
    const unsubscribe = integration.subscribeRelations([target], changed)
    notify!()
    expect(changed).toHaveBeenCalledOnce()
    unsubscribe()
    expect(stop).toHaveBeenCalledOnce()
    expect(integration.attach(target, {})).toBeUndefined()
    integration.validate(target)
  })

  it('reports missing native capabilities before attaching relations', () => {
    const integration = createHostIntegration(
      { ...getConfig(), platform: 'native' },
      system,
    )
    expect(() => integration.validateRelations([])).not.toThrow()
    expect(() => integration.validateRelations(['hover'])).toThrow(
      /parentOf and subscribeTopology/,
    )
  })

  it('DOM topology observations stop when the committed subscription is released', async () => {
    const root = document.createElement('div')
    const target = document.createElement('input')
    root.append(target)
    document.body.append(root)
    const integration = createHostIntegration(
      { ...getConfig(), platform: 'web' },
      system,
    )
    expect(integration.parentOf(target)).toBe(root)
    expect(integration.connected(target)).toBe(true)
    target.checked = true
    expect(integration.readState(target, 'checked')).toBe(true)
    const notify = vi.fn()
    const stop = integration.subscribeRelations([root, target], notify)
    target.dispatchEvent(new Event('change', { bubbles: true }))
    expect(notify).toHaveBeenCalledOnce()
    stop()
    stop()
    target.dispatchEvent(new Event('change', { bubbles: true }))
    expect(notify).toHaveBeenCalledOnce()
    root.remove()
    expect(integration.connected(target)).toBe(false)
  })
  it('DOM fixed viewport facts use literal pixel matchMedia queries', () => {
    const prior = window.matchMedia
    const queries: string[] = []
    const listeners = new Map<string, (event: { matches: boolean }) => void>()
    window.matchMedia = ((query: string) => {
      queries.push(query)
      return {
        matches: false,
        addListener: (listener: (event: { matches: boolean }) => void) =>
          listeners.set(query, listener),
        removeListener: () => listeners.delete(query),
      }
    }) as unknown as typeof window.matchMedia
    try {
      const ui = defineSystem({})
      const integration = createHostIntegration(
        { ...getConfig(), platform: 'web' },
        ui,
      )
      expect(queries).toEqual([])
      const notify = vi.fn()
      const connection = integration.connectMedia(
        ['@>=600px', '@!>=600px'],
        notify,
      )
      expect(queries).toEqual(['(min-width: 600px)'])
      expect(connection.state['@>=600px']).toBe(false)
      listeners.get('(min-width: 600px)')!({ matches: true })
      expect(notify.mock.lastCall?.[0]['@>=600px']).toBe(true)
      connection.stop()
      expect(listeners.size).toBe(0)
    } finally {
      window.matchMedia = prior
    }
  })
})
