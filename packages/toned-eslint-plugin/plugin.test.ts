import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { expect, test } from 'vitest'

const cliTimeout = 15_000
// These are real subprocess integrations. The outer test must allow each owned
// CLI invocation to reach its existing deadline, then finish fixture cleanup.
const cliCaseBudget = (invocations = 1) => invocations * cliTimeout + 5_000

const exec = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
// HQ embeds Toned two levels down; standalone Toned also resolves its own executable.
const binary = join(
  dirname(createRequire(import.meta.url).resolve('oxlint')),
  '..',
  'bin',
  'oxlint',
)
type Diagnostic = { message: string; code: string; filename: string }
async function lint(
  files: Record<string, string>,
  rules: Record<string, unknown>,
  fix = false,
) {
  const directory = await mkdtemp(join(tmpdir(), 'toned-lint-'))
  try {
    const config = join(directory, 'oxlintrc.json')
    await writeFile(
      config,
      JSON.stringify({
        jsPlugins: [join(here, 'index.js'), join(here, 'readt.js')],
        categories: { correctness: 'off' },
        rules,
      }),
    )
    for (const [name, source] of Object.entries(files))
      await writeFile(join(directory, name), source)
    let stdout: string
    try {
      ;({ stdout } = await exec(
        binary,
        [
          '-c',
          config,
          '--format=json',
          ...(fix ? ['--fix'] : []),
          ...Object.keys(files).map((name) => join(directory, name)),
        ],
        { maxBuffer: 2_000_000, timeout: cliTimeout },
      ))
    } catch (cause) {
      const error = cause as { code?: number; stdout?: string }
      if (error.code !== 1 || !error.stdout) throw cause
      stdout = error.stdout
    }
    const result = JSON.parse(stdout) as { diagnostics: Diagnostic[] }
    const changed = Object.fromEntries(
      await Promise.all(
        Object.keys(files).map(async (name) => [
          name,
          await readFile(join(directory, name), 'utf8'),
        ]),
      ),
    )
    return { diagnostics: result.diagnostics, files: changed }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
const names = (diagnostics: Diagnostic[]) =>
  diagnostics.map((d) => d.filename.split('/').at(-1)).sort()

test(
  'readt family identity rule resolves aliases and ignores shadowing and non-render factories',
  async () => {
    const result = await lint(
      {
        'named.tsx': `import {createElements as family} from '@toned/react'; export function Button(){const S=family(styles);return <S.Root/>}`,
        'namespace.tsx': `import * as toned from '@toned/react'; const build=toned.createElements; export const Card=()=>{const S=build(styles);return <S.Root/>}`,
        'memo.tsx': `import {createElements} from '@toned/react'; import {useMemo as memo} from 'react'; export function Card(){const S=memo(()=>createElements(styles),[]);return <S.Root/>}`,
        'good.tsx': `import {createElements} from '@toned/react'; const S=createElements(styles); export function Card(){return <S.Root/>}`,
        'shadow.tsx': `import {createElements} from '@toned/react'; export function Card(createElements){return createElements(styles)}`,
        'other.tsx': `import {createElements} from 'other'; export function Card(){return createElements(styles)}`,
        'factory.tsx': `import {createElements} from '@toned/react'; export function makeFamily(sheet){return createElements(sheet)}`,
        'default-factory.tsx': `import {createElements} from '@toned/react'; export default function makeFamily(sheet){return createElements(sheet)}`,
        'anonymous-factory.tsx': `import {createElements} from '@toned/react'; export default sheet=>createElements(sheet)`,
        'anonymous-function-factory.tsx': `import {createElements} from '@toned/react'; export default function(sheet){return createElements(sheet)}`,
        'default-component.tsx': `import {createElements} from '@toned/react'; export default function(){const S=createElements(styles);return <S.Root/>}`,
        'handler.tsx': `import {createElements} from '@toned/react'; export function Card(){function onClick(){createElements(styles)}return <button onClick={onClick}/>}`,
      },
      { 'readt/no-create-elements-in-render': 'error' },
    )
    expect(names(result.diagnostics)).toEqual([
      'default-component.tsx',
      'memo.tsx',
      'named.tsx',
      'namespace.tsx',
    ])
  },
  cliCaseBudget(),
)

test(
  'explicit reexport contracts and destructured namespace aliases remain import aware',
  async () => {
    const result = await lint(
      {
        'wrapper.tsx': `import {elements} from './toned'; export function Card(){return elements(styles)}`,
        'destructure.tsx': `import * as toned from '@toned/react';const {createElements:family}=toned;export function Card(){return family(styles)}`,
        'shadow.tsx': `import {elements} from './toned'; export function Card(elements){return elements(styles)}`,
      },
      {
        'readt/no-create-elements-in-render': [
          'error',
          { modules: { './toned': { elements: 'createElements' } } },
        ],
      },
    )
    expect(names(result.diagnostics)).toEqual([
      'destructure.tsx',
      'wrapper.tsx',
    ])
  },
  cliCaseBudget(),
)

test(
  'partial bags are diagnosed only at known hosts and complete spreads retain ownership',
  async () => {
    const prefix = `import {useStyles as stylesFor} from '@toned/react';`
    const result = await lint(
      {
        'partial.tsx': `${prefix} export function Card(){const s=stylesFor(sheet);return <div style={s.Root.style}/>}`,
        'alias.tsx': `${prefix} export function Card(){const s=stylesFor(sheet);const {Root}=s;const {className}=Root;return <div className={className}/>}`,
        'namespace-native.tsx': `${prefix} import * as Native from 'react-native';export function Card(){const s=stylesFor(sheet);return <Native.View style={s.Root.style}/>} `,
        'native.tsx': `${prefix} import {View} from 'react-native'; export function Card(){const s=stylesFor(sheet);return <View style={s.Root.style}/>}`,
        'complete.tsx': `${prefix} export function Card(){const s=stylesFor(sheet);return <div {...s.Root} style={s.Root.style}/>}`,
        'merged.tsx': `${prefix} export function Card(){const s=stylesFor(sheet);return <div {...s.Root.withProps({onClick:run})} className={s.Root.className}/>}`,
        'api.tsx': `${prefix} export function Card(){const s=stylesFor(sheet);return <DayPicker styles={{root:s.Root.style}}/>}`,
        'foreign.tsx': `${prefix} export function Card(){const s=stylesFor(sheet);return <ForeignAPI style={s.Root.style}/>}`,
        'ordinary.tsx':
          'export function Card(){const s=other(sheet);return <div style={s.Root.style}/>}',
        'shadow.tsx': `${prefix} export function Card(stylesFor){const s=stylesFor(sheet);return <div style={s.Root.style}/>}`,
      },
      { 'readt/no-partial-host-bag': 'error' },
    )
    expect(names(result.diagnostics)).toEqual([
      'alias.tsx',
      'namespace-native.tsx',
      'native.tsx',
      'partial.tsx',
    ])
  },
  cliCaseBudget(),
)

test(
  'global policy detects calls and aliases without banning unrelated APIs or pure token helpers',
  async () => {
    const result = await lint(
      {
        'named.ts': `import {setConfig as install} from '@toned/core';install(config)`,
        'alias.ts': `import * as toned from '@toned/core';const install=toned.setConfig;install(config)`,
        'shadow.ts': `import {setConfig} from '@toned/core';function configure(setConfig){setConfig(config)}`,
        'other.ts': `import {setConfig} from 'other';setConfig(config)`,
        'pure.ts': `import {createTokenStyles} from '@toned/core/server';const t=createTokenStyles(system,config);t({padding:2})`,
      },
      { 'toned/no-global-config': 'error' },
    )
    expect(names(result.diagnostics)).toEqual(['alias.ts', 'named.ts'])
  },
  cliCaseBudget(),
)

test(
  'canonical key fixes respect declaration boundaries and preserve token payloads and collisions',
  async () => {
    const result = await lint(
      {
        'safe.ts': `import {defineSystem} from '@toned/core';const ui=defineSystem(tokens);const {stylesheet}=ui;const sheet=stylesheet({Root:{$$type:'view',style:{opacity:1},paint:{style:'payload'},':hover':{style:{opacity:0}}}})`,
        'collision.ts': `import {stylesheet} from '@toned/core';stylesheet({Root:{style:{opacity:1},$style:{opacity:0}}})`,
        'spread.ts': `import {stylesheet} from '@toned/core';stylesheet({Root:{...dynamic,style:{opacity:1}}})`,
        'ordinary.ts': `const settings={Root:{style:{color:'red'},$$type:'view'}};function run(stylesheet){stylesheet(settings)}`,
      },
      { 'toned/prefer-canonical-declarations': 'warn' },
      true,
    )
    expect(result.files['safe.ts']).toContain(
      "$kind:'view',$style:{opacity:1},paint:{style:'payload'},':hover':{$style:{opacity:0}}",
    )
    expect(result.files['collision.ts']).toContain(
      'style:{opacity:1},$style:{opacity:0}',
    )
    expect(result.files['spread.ts']).toContain('...dynamic,style:')
    expect(result.files['ordinary.ts']).toContain("$$type:'view'")
    expect(names(result.diagnostics)).toEqual(['collision.ts', 'spread.ts'])
  },
  cliCaseBudget(),
)

test(
  'canonical variants are suggestions, with configured wrapper provenance',
  async () => {
    const result = await lint(
      {
        'legacy.ts': `import {stylesheet} from './ui';const s=stylesheet({Root:{}}).variants<Mods>($=>({[$.size('s')]:{Root:{style:{opacity:1}}}}))`,
        'good.ts': `import {stylesheet} from './ui';const s=stylesheet({Root:{}}).variants(($:Variants<Mods>)=>({[$.size('s')]:{Root:{$style:{opacity:1}}}}))`,
        'other.ts':
          'const s=other().variants<Mods>($=>({Root:{style:{opacity:1}}}))',
      },
      {
        'toned/prefer-canonical-declarations': [
          'warn',
          { modules: { './ui': { stylesheet: 'stylesheet' } } },
        ],
      },
    )
    expect(names(result.diagnostics)).toEqual(['legacy.ts', 'legacy.ts'])
  },
  cliCaseBudget(),
)

test(
  'semantic suggestions are opt-in, static only, and do not rewrite design choices',
  async () => {
    const source = `import {stylesheet} from '@toned/core';stylesheet({Root:{$style:{color:'#123456',fontSize:14,opacity:0.5,padding:measured,transform:[{scale:2}]},paint:{color:'payload'},'@platform native':{$style:{fontSize:size}},':hover':{$style:{color:'currentColor'}}}})`
    const off = await lint(
      { 'component.ts': source },
      { 'toned/prefer-semantic-tokens': 'warn' },
    )
    expect(off.diagnostics).toEqual([])
    const on = await lint(
      { 'component.ts': source },
      {
        'toned/prefer-semantic-tokens': [
          'warn',
          { properties: { color: 'textColor', fontSize: 'typography' } },
        ],
      },
      true,
    )
    expect(on.diagnostics).toHaveLength(2)
    expect(on.files['component.ts']).toBe(source)
    expect(on.diagnostics.map((d) => d.message).join(' ')).toContain(
      'does not establish visual equivalence',
    )
  },
  cliCaseBudget(2),
)

test(
  'canonical computed keys and shorthand never change the referenced binding',
  async () => {
    const source = `import {stylesheet} from '@toned/core';const style={opacity:1};stylesheet({["Root"]:{['style']:{opacity:1}},Label:{style},Text:{'$$type':'text'}})`
    const result = await lint(
      { 'safe.ts': source },
      { 'toned/prefer-canonical-declarations': 'warn' },
      true,
    )
    expect(result.files['safe.ts']).toContain("['style']:{opacity:1}")
    expect(result.files['safe.ts']).toContain('Label:{style}')
    expect(result.files['safe.ts']).toContain("Text:{$kind:'text'}")
    expect(result.diagnostics).toHaveLength(2)
    expect(
      result.diagnostics.every(
        (d) => d.code === 'toned(prefer-canonical-declarations)',
      ),
    ).toBe(true)
  },
  cliCaseBudget(),
)

test(
  'computed query declarations stay local while dynamic token payloads remain opaque',
  async () => {
    const source = `import {defineSystem,overrideSheet} from '@toned/core';const ui=defineSystem(tokens);const s=ui.stylesheet(q=>({Root:{[q.all(q.state('hover'),q.media('wide'))]:{style:{opacity:1}},[dynamic]:{style:'opaque'}}}));overrideSheet(s,q=>({Root:{[q.platform('native')]:{style:{opacity:0}}}}),($,q)=>({[$.size('s')]:{Root:{[q.state('hover')]:{style:{opacity:0}}}}}))`
    const result = await lint(
      { 'queries.ts': source },
      { 'toned/prefer-canonical-declarations': 'warn' },
      true,
    )
    expect(result.files['queries.ts'].match(/\$style/g)).toHaveLength(3)
    expect(result.files['queries.ts']).toContain("[dynamic]:{style:'opaque'}")
    expect(result.diagnostics).toEqual([])
  },
  cliCaseBudget(),
)
