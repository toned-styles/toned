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

  test('accepts a thunk and keys the dedupe on what it returns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    __resetWarnings()

    warnOnce(() => 'built lazily')
    warnOnce('built lazily')

    // Same text from a thunk and a literal is the same warning.
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe('[toned] built lazily')
    warn.mockRestore()
  })

  test('calls the thunk on every dev call, since the text is the key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    __resetWarnings()
    const build = vi.fn(() => 'same message')

    warnOnce(build)
    warnOnce(build)

    expect(build).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  test('never calls the thunk in a production build', async () => {
    // The point of the thunk: callers sit on the render path and warn about
    // the default config, so the message must not be assembled in a build
    // that would never print it.
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    const production = await import('./warnOnce.ts')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const build = vi.fn(() => 'should not be built')

    production.warnOnce(build)

    expect(build).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
