import { describe, expect, test } from 'vitest'
import type { Config } from '../types/index.ts'
import { resolveModes } from './config.ts'

/**
 * `resolveModes` is the single rule for how media and pseudo handling are
 * decided. `StyleMatcher` reads it to know whether to flatten selector blocks,
 * `Base` to know whether to subscribe to matchMedia, and `exec` to know whether
 * to emit the custom properties those flattened keys turn into. They have to
 * agree, so the rule lives in one place and is pinned here.
 */
describe('resolveModes', () => {
  test('nothing set resolves to the conservative pair', () => {
    expect(resolveModes({})).toEqual({
      mediaMode: false,
      pseudoMode: 'runtime',
    })
  })

  test('mediaMode falls back to useMedia when it is not set', () => {
    expect(resolveModes({ useMedia: true }).mediaMode).toBe('runtime')
    expect(resolveModes({ useMedia: false }).mediaMode).toBe(false)
  })

  test('an explicit mediaMode outranks useMedia', () => {
    expect(resolveModes({ useMedia: true, mediaMode: false }).mediaMode).toBe(
      false,
    )
    expect(resolveModes({ useMedia: false, mediaMode: 'css' }).mediaMode).toBe(
      'css',
    )
  })

  test('pseudoMode defaults to runtime and ignores useMedia', () => {
    // useMedia describes media queries only; interaction is unrelated to it.
    expect(resolveModes({ useMedia: true }).pseudoMode).toBe('runtime')
    expect(resolveModes({ useMedia: false }).pseudoMode).toBe('runtime')
  })

  test('an explicit false is a mode, not an absent value', () => {
    // `??` must not collapse `false` into the fallback: it means "disabled",
    // which is different from "unspecified".
    expect(resolveModes({ mediaMode: false, pseudoMode: false })).toEqual({
      mediaMode: false,
      pseudoMode: false,
    })
  })

  test('never invents css', () => {
    // 'css' asserts that the target consumes CSS custom properties, which is
    // false on React Native. It has to be asked for explicitly, so that a
    // partially-specified config can never leak var() into a native style.
    const partials: Partial<Config>[] = [
      {},
      { useMedia: true },
      { useMedia: false },
      { mediaMode: false },
      { pseudoMode: false },
      { mediaMode: 'runtime' },
      { pseudoMode: 'runtime' },
    ]

    for (const partial of partials) {
      const modes = resolveModes(partial)
      expect(modes.mediaMode).not.toBe('css')
      expect(modes.pseudoMode).not.toBe('css')
    }
  })

  test('the platform setups resolve as their configs intend', () => {
    const web: Partial<Config> = {
      useMedia: true,
      mediaMode: 'css',
      pseudoMode: 'css',
    }
    const native: Partial<Config> = {
      useMedia: false,
      mediaMode: false,
      pseudoMode: 'runtime',
    }
    // CSS media queries with interaction still driven by JS handlers.
    const mixed: Partial<Config> = { useMedia: true, mediaMode: 'css' }

    expect(resolveModes(web)).toEqual({ mediaMode: 'css', pseudoMode: 'css' })
    expect(resolveModes(native)).toEqual({
      mediaMode: false,
      pseudoMode: 'runtime',
    })
    expect(resolveModes(mixed)).toEqual({
      mediaMode: 'css',
      pseudoMode: 'runtime',
    })
  })

  test('is pure — the input is not mutated', () => {
    const config: Partial<Config> = { useMedia: true }

    resolveModes(config)

    expect(config).toEqual({ useMedia: true })
  })
})
