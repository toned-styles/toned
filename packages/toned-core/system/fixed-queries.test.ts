import { expect, it, vi } from 'vitest'
import { createTailwindBackend } from '../backends/tailwind.ts'
import { buildStyles } from '../build/index.ts'
import { collectManifestConditions } from '../build/manifest.ts'
import { buildTailwind } from '../build/tailwind.ts'
import { defineSystem, dp, percent } from '../index.ts'
import { createNativeRenderer, createWebRenderer } from '../server/index.ts'
import { connectNativeMedia } from '../stylesheet/media.native.ts'
import { Base } from '../stylesheet/StyleSheet.ts'
import { evalExpr, parseConditionKey } from '../utils/conditions.ts'

it('explicit fixed query lengths preserve exact keys, build inventory, and backend guards', () => {
  const ui = defineSystem({
    id: 'fixed-queries',
    tokens: {},
    conditions: { containers: { card: {} }, base: 99 },
  })
  const sheet = ui.stylesheet((q) => ({
    Root: {
      $style: { opacity: 1 },
      [q.media(dp(600))]: { $style: { opacity: 0 } },
      [q.container('card', dp(300))]: { $style: { opacity: 0.5 } },
    },
  }))
  const artifact = buildStyles(ui, { sheets: [sheet] })
  expect(artifact.manifest.conditions).toEqual(['>=600px', 'card/>=300px'])
  expect(artifact.css).toContain('(min-width: 600px)')
  expect(artifact.css).toContain('@container card (min-width: 300px)')
  expect(artifact.css).not.toMatch(/min-width:\s*var\(/)
  const web = createWebRenderer(ui, {
    tokens: {},
    manifest: artifact.manifest,
  }).resolve(sheet)
  expect(JSON.stringify(web)).toContain('fixed-media-gte600px')
  const native = createNativeRenderer(ui, { tokens: {} })
  expect(
    native.resolve(sheet, { facts: { '@>=600px': true } }).Root.style[
      'opacity'
    ],
  ).toBe(0)
  expect(
    native.resolve(sheet, {
      facts: { '@>=600px': true, '@card/>=300px': true },
    }).Root.style['opacity'],
  ).toBe(0.5)
  const base = new Base({
    ref: ui,
    rules: { Root: { '@card/>=300px': { style: { opacity: 0 } } } },
    config: {
      getTokens: () => ({}),
      platform: 'native',
      mediaMode: 'runtime',
      pseudoMode: 'runtime',
      useClassName: false,
    } as never,
  })
  for (const [width, expected] of [
    [299.9, false],
    [300, true],
    [300.1, true],
  ] as const)
    expect(base.conditionState({ card: width })?.['@card/>=300px']).toBe(
      expected,
    )
})

it('native viewport facts use the same fixed boundary independent of theme scales', () => {
  let width = 599.9
  let onChange = () => {}
  const notify = vi.fn()
  const stop = vi.fn()
  const connected = connectNativeMedia(
    {},
    ['@>=600px', '@!>=600px'],
    {
      id: 'fixed-query-test',
      renderer: 'custom',
      version: '1',
      accepts: () => true,
      patch: () => {},
      resetStyle: () => null,
      resetProp: () => null,
      getViewportWidth: () => width,
      subscribeViewport: (cb) => {
        onChange = cb
        return stop
      },
    },
    notify,
  )
  expect(connected.state).toMatchObject({
    '@>=600px': false,
    '@!>=600px': true,
  })
  width = 600
  onChange()
  expect(notify.mock.lastCall?.[0]).toMatchObject({
    '@>=600px': true,
    '@!>=600px': false,
  })
  width = 600.1
  onChange()
  expect(notify).toHaveBeenCalledOnce()
  connected.stop()
  expect(stop).toHaveBeenCalledOnce()
})

it('Boolean AST collection retains fixed thresholds and rejects runtime-relative lengths', () => {
  const ui = defineSystem({
    id: 'fixed-query-boolean',
    tokens: {},
    conditions: { containers: { card: {} } },
  })
  const sheet = ui.stylesheet({ Root: {} }).extend({
    [ui.q.all(ui.q.media(dp(600)), ui.q.container('card', dp(300)))]: {
      Root: { $style: { opacity: 0 } },
    },
  })
  const artifact = buildStyles(ui, { sheets: [sheet] })
  expect(artifact.manifest.conditions).toEqual(['>=600px', 'card/>=300px'])
  expect(() => (ui.q.media as (x: unknown) => unknown)(percent(20))).toThrow(
    /dp lengths/,
  )
  expect(() =>
    ui.stylesheet({
      Root: { '@card/>=30rem': { $style: { opacity: 0 } } },
    } as never),
  ).toThrow(/explicit dp/)
  expect(parseConditionKey('>=30rem')).toBeNull()
  const out = new Set<string>()
  collectManifestConditions({ '@!>=600px&card/>=300px': {} }, out)
  expect([...out]).toEqual(['>=600px', 'card/>=300px'])
  expect(
    evalExpr(parseConditionKey('>=600px&card/>=300px')!, {
      media: () => true,
      containerPx: () => 300,
      stepWidth: () => undefined,
      basePx: 100,
    }),
  ).toBe(true)
})

it('build rejects named container steps colliding with local threshold toggle names', async () => {
  const ui = defineSystem({
    id: 'fixed-query-collision',
    tokens: {},
    conditions: { containers: { card: { gte300px: 500 } } },
  })
  const sheet = ui.stylesheet((q) => ({
    Root: { [q.container('card', dp(300))]: { $style: { opacity: 0 } } },
  }))
  expect(() => buildStyles(ui, { sheets: [sheet] })).toThrow(
    /condition toggle collision between card\/gte300px and card\/>=300px/,
  )
  const compile = vi.fn(async () => ({ build: () => '' }))
  const profile = createTailwindBackend({ id: 'collision-check', mappings: [] })
  await expect(
    buildTailwind(ui, profile, {
      sheets: [sheet],
      tokens: {},
      source: '',
      compile,
    }),
  ).rejects.toThrow(/condition toggle collision/)
  expect(compile).not.toHaveBeenCalled()
  const distinct = defineSystem({
    id: 'fixed-media-distinct',
    tokens: {},
    conditions: { media: { gte600px: 800 } },
  })
  const other = distinct.stylesheet((q) => ({
    Root: { [q.media(dp(600))]: { $style: { opacity: 0 } } },
  }))
  expect(() => buildStyles(distinct, { sheets: [other] })).not.toThrow()
})

it.each(['768.0px', '768PX', '1e3px', '.5px'])(
  'fixed viewport %s shares one build/runtime CSS identity',
  (spelling) => {
    const ui = defineSystem({ id: 'fixed-spelling', tokens: {} })
    const sheet = ui.stylesheet({
      Root: {
        $style: { opacity: 1 },
        [`@>=${spelling}`]: { $style: { opacity: 0.5 } },
      },
    } as never)
    const artifact = buildStyles(ui, { sheets: [sheet] })
    const props = createWebRenderer(ui, {
      tokens: {},
      manifest: artifact.manifest,
    }).resolve(sheet) as Record<string, { style: object }>
    const variables = JSON.stringify(props['Root']!.style).match(
      /--fixed-spelling-fixed-media-gte[a-zA-Z0-9]+/g,
    )!
    expect(variables.length).toBeGreaterThan(0)
    for (const variable of variables)
      expect(artifact.css).toContain(`${variable}:`)
    const native = createNativeRenderer(ui, { tokens: {} }).resolve(sheet, {
      facts: { [`@>=${spelling}`]: true },
    }) as Record<string, { style: Record<string, unknown> }>
    expect(native['Root']!.style['opacity']).toBe(0.5)
  },
)

it('equivalent fixed viewport spellings can share a generated toggle', () => {
  const ui = defineSystem({ id: 'fixed-equivalent', tokens: {} })
  const sheet = ui.stylesheet({
    Root: {
      '@>=768px': { $style: { opacity: 0.5 } },
      '@>=768.0PX': { $style: { opacity: 1 } },
    },
  } as never)
  expect(() => buildStyles(ui, { sheets: [sheet] })).not.toThrow()
})
