import { describe, expect, it } from 'vitest'
import { DesignLanguageService } from './lsp/service.ts'
import { DesignProject } from './project.ts'

const root = 'file:///workspace/'
const uri = (path: string) => root + path
function fixture() {
  const project = new DesignProject()
  project.configureModules(root, {
    '@lib/*': ['lib/*'],
    '@tokens/base': ['packages/base/index.ts'],
  })
  project.update(
    uri('packages/base/layout.ts'),
    `export const gap=defineCssToken('gap',[0,2,4]); export const color=defineToken({values:['old']}); export const hidden=defineToken({values:['hidden']}); const privateToken=defineToken({values:['private']})`,
    1,
  )
  project.update(
    uri('packages/base/index.ts'),
    `import * as layout from './layout'; export const {system,stylesheet}=defineSystem({...layout},{})`,
    1,
  )
  project.update(
    uri('lib/ui/daylight.ts'),
    `export const color=defineToken({values:['card','accent']}); const privateColor=defineToken({values:['private']}); export {color as foreground}`,
    1,
  )
  project.update(
    uri('lib/ui/system.ts'),
    `import {system as base} from '@tokens/base'; import * as daylight from './daylight'; const {hidden,...layout}=base; const tokens={...layout,...daylight}; const design=defineSystem(tokens,{}); export const stylesheet=design.stylesheet;`,
    1,
  )
  project.update(
    uri('lib/ui/index.ts'),
    `export {stylesheet} from './system'`,
    1,
  )
  const consumer = `import * as ui from '@lib/ui'; export const styles=ui.stylesheet({Root:{color:'card',gap:2}})`
  project.update(uri('control.ts'), consumer, 1)
  return { project, consumer, service: new DesignLanguageService(project) }
}
describe('bounded static module resolution', () => {
  it('resolves namespace imports, workspace aliases, reexports, object spreads/rest and stylesheet aliases to original token definitions', () => {
    const { project, service, consumer } = fixture()
    const tokens = project.tokensForSystem('ui', uri('control.ts'))
    expect(tokens.map((token) => token.name).sort()).toEqual([
      'color',
      'foreground',
      'gap',
    ])
    expect(tokens.find((token) => token.name === 'color')?.uri).toBe(
      uri('lib/ui/daylight.ts'),
    )
    const position = service
      .document(uri('control.ts'))!
      .positionAt(consumer.indexOf("'card'") + 2)
    expect(
      service
        .completions(uri('control.ts'), position)
        .items.map((item) => item.label),
    ).toEqual(['card', 'accent'])
    expect(
      service.definition(
        uri('control.ts'),
        service
          .document(uri('control.ts'))!
          .positionAt(consumer.indexOf('color:')),
      )[0]?.uri,
    ).toBe(uri('lib/ui/daylight.ts'))
    const parses = project.statistics.parses
    for (let i = 0; i < 100; i++)
      expect(project.tokensForSystem('ui', uri('control.ts'))).toBe(tokens)
    expect(project.statistics.parses).toBe(parses)
  })
  it('invalidates dependent vocabulary when a token changes, is removed, or is restored without reparsing consumers', () => {
    const { project } = fixture()
    expect(
      project
        .tokensForSystem('ui', uri('control.ts'))
        .find((t) => t.name === 'color')?.values,
    ).toEqual(['card', 'accent'])
    const before = project.statistics.parses
    project.update(
      uri('lib/ui/daylight.ts'),
      `export const color=defineToken({values:['updated']})`,
      2,
    )
    expect(
      project
        .tokensForSystem('ui', uri('control.ts'))
        .find((t) => t.name === 'color')?.values,
    ).toEqual(['updated'])
    expect(project.statistics.parses).toBe(before + 1)
    project.remove(uri('lib/ui/daylight.ts'))
    expect(project.tokensForSystem('ui', uri('control.ts'))).toEqual([])
    project.update(
      uri('lib/ui/daylight.ts'),
      `export const color=defineToken({values:['restored']})`,
      1,
    )
    expect(
      project
        .tokensForSystem('ui', uri('control.ts'))
        .find((t) => t.name === 'color')?.values,
    ).toEqual(['restored'])
  })
  it('treats unknown spreads and computed keys as barriers while preserving later explicit keys', () => {
    const project = new DesignProject()
    project.update(
      uri('dynamic.ts'),
      `const color=defineToken({values:['a']}); const ui=defineSystem({color,...makeTokens(),gap:defineToken({values:[2]})}); const opaque=defineSystem({color,[key]:color});`,
      1,
    )
    expect(
      project.tokensForSystem('ui', uri('dynamic.ts')).map((t) => t.name),
    ).toEqual(['gap'])
    expect(project.tokensForSystem('opaque', uri('dynamic.ts'))).toEqual([])
  })
  it('resolves named exports and stars while bounding cycles and excluding private/type-only exports', () => {
    const project = new DesignProject()
    project.update(
      uri('a.ts'),
      `export * from './b'; export const gap=defineToken({values:[1]}); const secret=defineToken({values:[9]}); export type {Other} from './b'`,
      1,
    )
    project.update(
      uri('b.ts'),
      `export * from './a'; export {gap as space} from './a'`,
      1,
    )
    project.update(
      uri('system.ts'),
      `import * as tokens from './b'; const ui=defineSystem({...tokens,own:defineToken({values:[0]})})`,
      1,
    )
    const result = project.tokensForSystem('ui', uri('system.ts'))
    expect(result.map((t) => t.name)).not.toContain('secret')
    expect(result.map((t) => t.name)).toContain('own')
  })
  it('supports exact aliases ahead of wildcard paths and rejects unsafe or unbounded configurations', () => {
    const project = new DesignProject()
    project.configureModules(root, {
      '@lib/*': ['wrong/*'],
      '@lib/ui': ['lib/ui.ts'],
    })
    project.update(
      uri('lib/ui.ts'),
      'export const token=defineToken({values:[1]})',
      1,
    )
    expect(project.resolveImport(uri('consumer.ts'), '@lib/ui')).toBe(
      uri('lib/ui.ts'),
    )
    expect(() =>
      project.configureModules(root, { '@bad': ['../escape'] }),
    ).toThrow()
    expect(() =>
      project.configureModules(root, { '@bad': ['file:///escape'] }),
    ).toThrow()
    expect(() => project.configureModules(root, { '@bad': ['./*'] })).toThrow()
    expect(
      project.resolveImport(uri('consumer.ts'), '@lib/../escape'),
    ).toBeUndefined()
  })
  it('offers literals from open numeric domains without rejecting dynamic values or alpha modifiers', () => {
    const project = new DesignProject(),
      service = new DesignLanguageService(project)
    const text = `const spacing=[new Number(),0,2,4]; const ui=defineSystem({gap:defineCssToken('gap',spacing),color:defineToken({values:['accent'],alphaChannel:['color']})}); const styles=ui.stylesheet({Root:{gap:3,color:'accent/50'}})`
    project.update(uri('open.ts'), text, 1)
    const tokens = project.tokensForSystem('ui', uri('open.ts'))
    expect(tokens.find((token) => token.name === 'gap')).toMatchObject({
      values: [0, 2, 4],
      valuesComplete: false,
    })
    expect(
      service
        .diagnostics(uri('open.ts'))
        .filter((diagnostic) => diagnostic.code === 'token-value'),
    ).toEqual([])
    const position = service
      .document(uri('open.ts'))!
      .positionAt(text.lastIndexOf('gap:3') + 4)
    expect(
      service
        .completions(uri('open.ts'), position)
        .items.map((item) => item.label),
    ).toEqual(['0', '2', '4'])
  })
  it('navigates namespace stylesheet members and includes reexport barrels in impact edges', () => {
    const { project, service, consumer } = fixture()
    const position = service
      .document(uri('control.ts'))!
      .positionAt(consumer.indexOf('ui.stylesheet') + 4)
    expect(service.definition(uri('control.ts'), position)[0]?.uri).toBe(
      uri('lib/ui/system.ts'),
    )
    expect(project.dependents(uri('lib/ui/system.ts'))).toContain(
      uri('control.ts'),
    )
    project.configureModules(root, { '@lib/*': ['missing/*'] })
    expect(project.tokensForSystem('ui', uri('control.ts'))).toEqual([])
  })

  it('caps completion payloads, ignores type-only imports and bounds cyclic aliases', () => {
    const project = new DesignProject(),
      service = new DesignLanguageService(project)
    const tokens = Array.from(
      { length: 600 },
      (_, index) => `p${index}:defineToken({values:[${index}]})`,
    ).join(',')
    const text = `const ui=defineSystem({${tokens}});const styles=ui.stylesheet({Root:{p0:0}});const a=b;const b=a;const cycle=defineSystem(a)`
    project.update(uri('large.ts'), text, 1)
    const completion = service.completions(
      uri('large.ts'),
      service.document(uri('large.ts'))!.positionAt(text.lastIndexOf('p0:0')),
    )
    expect(completion.items).toHaveLength(500)
    expect(completion.isIncomplete).toBe(true)
    expect(project.tokensForSystem('cycle', uri('large.ts'))).toEqual([])
    project.update(
      uri('types.ts'),
      `import type {ui} from './large';const styles=ui.stylesheet({Root:{p0:0}})`,
      1,
    )
    expect(project.tokensForSystem('ui', uri('types.ts'))).toEqual([])
  })
})
