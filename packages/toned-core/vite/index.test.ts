import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { expect, test } from 'vitest'
import { assertBuildArtifact, buildStyles } from '../build/index.ts'
import { defineSystem } from '../system/definers.ts'
import toned from './index.ts'

test('explicit virtual import emits CSS and recollects changed declarations', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'toned-vite-')))
  try {
    await writeFile(
      join(root, 'index.html'),
      '<script type="module" src="/entry.js"></script>',
    )
    await writeFile(join(root, 'entry.js'), 'import "virtual:toned.css"')
    let minimum = 400
    const system = defineSystem({
      id: 'vite',
      tokens: {},
      conditions: { containers: { card: {} } },
    })
    const plugin = toned({
      system,
      inputs: ['entry.js'],
      // Legacy ad-hoc numeric atoms use the spacing scale; explicit px is fixed.
      conditions: () => [`card/>=${minimum}px`],
    })
    const compile = async () => {
      const result = await build({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [plugin],
        build: { write: false, minify: false, cssMinify: false },
      })
      if (Array.isArray(result) || !('output' in result))
        throw new Error('Expected one build')
      const css = result.output.find(
        (asset) => asset.type === 'asset' && asset.fileName.endsWith('.css'),
      )
      const html = result.output.find(
        (asset) => asset.type === 'asset' && asset.fileName.endsWith('.html'),
      )
      if (css?.type !== 'asset' || html?.type !== 'asset')
        throw new Error('Missing generated assets')
      expect(String(html.source)).toContain('stylesheet')
      expect(String(html.source)).not.toContain('<style')
      return String(css.source)
    }
    expect(await compile()).toContain('400px')
    minimum = 800
    const updated = await compile()
    expect(updated).toContain('800px')
    expect(updated).not.toContain('400px')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('Vite and programmatic builds share collection, validation and the asset manifest', async () => {
  const ui = defineSystem({}, { containers: { card: {} } })
  const sheet = ui.stylesheet({
    Root: { '@card/>=400px': { $style: { opacity: 0 } } },
  })
  let collections = 0
  const plugin = toned({
    system: ui,
    sheets: () => {
      collections++
      return [sheet]
    },
    layer: 'components',
  })
  // Exercise both virtual modules in one build: the collector runs once so the
  // CSS and manifest cannot observe different versions of a lazy declaration.
  const load = plugin.load as (id: string) => Promise<string | undefined>
  const css = await load('\0virtual:toned.css')
  const js = await load('\0virtual:toned.manifest')
  const manifest = JSON.parse(js!.slice('export default '.length))
  const expected = buildStyles(ui, { sheets: [sheet], layer: 'components' })
  expect(css).toBe(expected.css)
  expect(manifest).toEqual(expected.manifest)
  expect(collections).toBe(1)
  expect(() => assertBuildArtifact({ css: css!, manifest })).not.toThrow()
  expect(manifest.conditions).toEqual(['card/>=400px'])
  for (const options of [
    { system: ui, id: 'wrong' },
    { system: ui, layer: 'components; } .injected {' },
    { system: ui.system, layer: 'components; } .injected {' },
  ]) {
    const invalid = toned(options).load as typeof load
    await expect(invalid('\0virtual:toned.css')).rejects.toThrow()
  }
})
