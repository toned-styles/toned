import { expect, test } from 'vitest'

test('canonical host entry imports never copy legacy global configuration', async () => {
  const { getConfig } = await import('@toned/core')
  const legacy = getConfig()
  Object.defineProperty(legacy, '__tonedHostPoison', {
    configurable: true,
    enumerable: true,
    get() {
      throw new Error('host imported legacy configuration')
    },
  })
  try {
    const { webHost } = await import('@toned/react/hosts/web')
    const { nativeHost } = await import('@toned/react/hosts/native')
    expect(webHost.platform).toBe('web')
    expect(webHost.resolveElement?.('pressable')).toBe('button')
    expect(nativeHost.platform).toBe('native')
    expect(nativeHost.getProps).toBeTypeOf('function')
    let width = 0
    const props = nativeHost.measureContainerProps?.((value) => {
      width = value
    }) as { onLayout(event: unknown): void }
    props.onLayout({ nativeEvent: { layout: { width: 320 } } })
    expect(width).toBe(320)
    expect(Object.isFrozen(webHost)).toBe(true)
    expect(Object.isFrozen(nativeHost)).toBe(true)
  } finally {
    Reflect.deleteProperty(legacy, '__tonedHostPoison')
  }
})
