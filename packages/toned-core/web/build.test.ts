import { expect, it } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { assertBuildArtifact } from '../build/manifest.ts'
import { createWebRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import { webRules } from './rules.ts'

it('builds explicit selector extensions before rendering, deduplicates them, and rejects missing inventory', () => {
  const ui = defineSystem({
    id: 'web-extensions',
    tokens: {
      gap: defineToken({ values: [1], resolve: (value) => ({ gap: value }) }),
    },
  })
  const rules = webRules({
    '&::before': { content: '"*"', color: 'red' },
    '& > input:checked': { opacity: 0.5 },
  })
  const sheet = ui.stylesheet((q) => ({
    Root: { gap: 1, [q.platform('web')]: { $webRules: rules } },
  }))
  const artifact = buildStyles(ui, {
    sheets: [sheet, sheet],
    layer: 'components',
  })
  expect(artifact.manifest.extensions).toHaveLength(1)
  expect(artifact.css).toContain('::before{content:"*";color:red;}')
  expect(artifact.css).toContain(' > input:checked{opacity:0.5;}')
  assertBuildArtifact(artifact)
  const props = createWebRenderer(ui, {
    manifest: artifact.manifest,
    tokens: {},
  }).resolve(sheet)
  expect(props.Root.className?.split(' ')).toContain(
    artifact.manifest.extensions![0],
  )
  const empty = buildStyles(ui, { sheets: [] })
  expect(() =>
    createWebRenderer(ui, { manifest: empty.manifest, tokens: {} }).resolve(
      sheet,
    ),
  ).toThrow('webRules absent from build inventory')
})

it('preserves opaque selector references through immutable style snapshots', () => {
  const extension = webRules({ '&::before': { content: '"*"' } })
  const declaration = immutableSnapshot({ $webRules: extension })
  expect(declaration.$webRules).toBe(extension)
})

it('inventories media extensions and rejects a stale manifest after a query changes', () => {
  const ui = defineSystem({ id: 'media-extension', tokens: {} })
  const sheet = (query: string) =>
    ui.stylesheet({
      Root: {
        '@platform web': {
          $webRules: webRules(
            {},
            {
              media: {
                [query]: webRules({ '&': { display: 'flex' } }),
              },
            },
          ),
        },
      },
    })
  const original = sheet('(min-width: 64rem)')
  const artifact = buildStyles(ui, { sheets: [original], layer: 'utilities' })
  assertBuildArtifact(artifact)
  expect(artifact.css).toContain('@media (min-width: 64rem)')
  const renderer = createWebRenderer(ui, { manifest: artifact.manifest })
  expect(renderer.resolve(original).Root.className).toContain(
    artifact.manifest.extensions?.[0],
  )
  expect(() => renderer.resolve(sheet('(min-width: 80rem)'))).toThrow(
    'webRules absent from build inventory',
  )
})

it('scopes each selector rule without prefixing multiline declaration values', () => {
  const ui = defineSystem({ id: 'scoped-extension', tokens: {} })
  const sheet = ui.stylesheet({
    Root: {
      '@platform web': {
        $webRules: webRules({
          '&': { display: 'grid', gridTemplateAreas: '"a b"\n"c d"' },
          '& > span': { opacity: 0.5 },
        }),
      },
    },
  })
  const artifact = buildStyles(ui, { sheets: [sheet], scope: '.scope' })
  const className = artifact.manifest.extensions![0]
  expect(artifact.css).toContain(
    `.scope .${className}{display:grid;grid-template-areas:"a b"\n"c d";}`,
  )
  expect(artifact.css).toContain(`.scope .${className} > span{opacity:0.5;}`)
  expect(artifact.css).not.toContain('.scope "c d"')
  assertBuildArtifact(artifact)
})
