import { describe, expect, it } from 'vitest'
import { DesignProject } from '../project.ts'
import { DesignLanguageService } from './service.ts'

const root = 'file:///performance/'
const token = (value: string) =>
  `export const color=defineToken({values:['${value}']})`
const sheet = `import * as ui from './system';const styles=ui.stylesheet({Root:{color:'accent'}})`
function setup() {
  const project = new DesignProject()
  project.update(root + 'tokens.ts', token('accent'), 1)
  project.update(root + 'barrel.ts', `export * from './tokens'`, 1)
  project.update(
    root + 'system.ts',
    `import * as tokens from './barrel';const ui=defineSystem({...tokens});export const stylesheet=ui.stylesheet`,
    1,
  )
  project.update(root + 'a.ts', sheet, 1)
  project.update(root + 'b.ts', sheet, 1)
  return project
}

describe('dependency-aware authoring work', () => {
  it('shares canonical vocabularies and preserves them across unrelated/consumer edits', () => {
    const project = setup()
    const a = project.tokensForSystem('ui', root + 'a.ts')
    expect(project.tokensForSystem('ui', root + 'b.ts')).toBe(a)
    const before = project.statistics.resolution.evaluations
    project.update(root + 'unrelated.ts', 'const value=1', 1)
    expect(project.tokensForSystem('ui', root + 'a.ts')).toBe(a)
    expect(project.statistics.resolution.evaluations).toBe(before)
    project.update(root + 'a.ts', sheet + ' ', 2)
    expect(project.tokensForSystem('ui', root + 'a.ts')).toBe(a)
    project.update(root + 'tokens.ts', token('new'), 2)
    expect(project.tokensForSystem('ui', root + 'a.ts')[0]?.values).toEqual([
      'new',
    ])
    expect(project.tokensForSystem('ui', root + 'b.ts')).not.toBe(a)
  })
  it('invalidates missing imports, deletions, reexports and changed module mappings', () => {
    const project = setup()
    project.remove(root + 'tokens.ts')
    expect(project.tokensForSystem('ui', root + 'a.ts')).toEqual([])
    project.update(root + 'tokens.ts', token('restored'), 1)
    expect(project.tokensForSystem('ui', root + 'a.ts')[0]?.values).toEqual([
      'restored',
    ])
    project.update(root + 'other.ts', token('other'), 1)
    project.update(root + 'barrel.ts', `export * from './other'`, 2)
    expect(project.tokensForSystem('ui', root + 'a.ts')[0]?.values).toEqual([
      'other',
    ])
    project.update(
      root + 'mapped.ts',
      `import * as ui from '@ui';const styles=ui.stylesheet({Root:{color:'other'}})`,
      1,
    )
    expect(project.tokensForSystem('ui', root + 'mapped.ts')).toEqual([])
    project.configureModules(root, { '@ui': ['system.ts'] })
    expect(
      project.tokensForSystem('ui', root + 'mapped.ts')[0]?.values,
    ).toEqual(['other'])
    project.configureModules(root, { '@ui': ['missing.ts'] })
    expect(project.tokensForSystem('ui', root + 'mapped.ts')).toEqual([])
  })
  it('keeps cache retention bounded and does not reuse stale diagnostic domains', () => {
    const project = setup(),
      service = new DesignLanguageService(project)
    expect(service.diagnostics(root + 'a.ts')).toEqual([])
    project.update(root + 'tokens.ts', token('changed'), 2)
    expect(service.diagnostics(root + 'a.ts')).toHaveLength(1)
    for (let i = 0; i < 600; i++) {
      const uri = root + `consumer${i}.ts`
      project.update(uri, sheet, 1)
      project.tokensForSystem('ui', uri)
    }
    expect(project.statistics.resolution.entries).toBeLessThanOrEqual(512)
    expect(project.statistics.resolution.weight).toBeLessThanOrEqual(100_000)
    service.dispose()
    expect(project.statistics.resolution.entries).toBe(0)
  })
})
