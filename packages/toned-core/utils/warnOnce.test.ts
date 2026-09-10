import { afterEach, describe, expect, test, vi } from 'vitest'
import { __resetWarnings, warnOnce } from './warnOnce.ts'

describe('warnOnce', () => {
  afterEach(() => {
    __resetWarnings()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test('logs a message once, prefixed with the package name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    __resetWarnings()

    warnOnce('something is off')
    warnOnce('something is off')

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe('[toned] something is off')
    warn.mockRestore()
  })

  test('different messages are each reported', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    __resetWarnings()

    warnOnce('breakpoints sm, md')
    warnOnce('breakpoints tablet, desktop')

    // The message is the key, so two systems describing their own breakpoints
    // do not silence each other.
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  test('stays silent in a production build', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    const production = await import('./warnOnce.ts')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    production.warnOnce('should not appear')

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
