/** Bounded synthetic authoring workspace; no filesystem walk or project execution.
 * Run: bun benchmarks/design-tools.ts [files=1000] [coldSamples=3]
 * Reports absolute timings, not an unmeasured improvement over another revision. */

import { cpus, release } from 'node:os'
import { performance } from 'node:perf_hooks'
import { DesignLanguageService } from '../packages/toned-compiler/lsp/service.ts'
import { DesignProject } from '../packages/toned-compiler/project.ts'

const files = Number(process.argv[2] ?? 1000)
const coldSamples = Number(process.argv[3] ?? 3)
if (
  !Number.isSafeInteger(files) ||
  files < 1 ||
  files > 4096 ||
  !Number.isSafeInteger(coldSamples) ||
  coldSamples < 1 ||
  coldSamples > 10
)
  throw new Error('Use 1..4096 files and 1..10 cold samples')
const sources = Array.from({ length: files }, (_, index) => {
  const parts = Array.from(
    { length: 12 },
    (_, part) =>
      `Part${part}: { gap: 4, color: 'accent', $style: { padding: 8, margin: 2, opacity: 1, flexGrow: 0 } }`,
  ).join(',\n')
  const text = `import { defineSystem, defineToken } from '@toned/core';
import { createElements } from '@toned/react';
${index ? `import { S as Previous } from './component${index - 1}';` : ''}
type Mods = { size: 's' | 'm' | 'l'; active: boolean };
const ui = defineSystem({ id: 'fixture${index}', tokens: { gap: defineToken({ values: [0, 2, 4, 8], resolve: gap => ({ gap }) }) } });
export const styles = ui.stylesheet({ ${parts} }).variants(($: Variants<Mods>) => ({ [$.size('s')]: { Part0: { gap: 2 } } }));
export const S = createElements(styles);
export const App = () => <S><S.Part0 />${index ? '<Previous.Part0 />' : ''}</S>;`
  return {
    uri: `file:///benchmark/component${index}.tsx`,
    text,
    offset: text.indexOf('padding: 8') + 2,
  }
})
const sample = (iterations: number, action: (index: number) => void) => {
  const values: number[] = []
  for (let index = 0; index < iterations; index++) {
    const before = performance.now()
    action(index)
    values.push(performance.now() - before)
  }
  values.sort((a, b) => a - b)
  return {
    samples: iterations,
    medianMs: values[Math.floor(values.length / 2)]!,
    p95Ms:
      values[Math.min(values.length - 1, Math.floor(values.length * 0.95))]!,
  }
}
let project!: DesignProject
const cold = sample(coldSamples, () => {
  project?.dispose()
  project = new DesignProject()
  for (const source of sources) project.update(source.uri, source.text, 1)
  if (project.statistics.parses !== files)
    throw new Error('Cold parse count differs')
})
const before = project.statistics.parses
const versions = Array<number>(files).fill(1)
const dirty = sample(100, (index) => {
  const at = index % files,
    source = sources[at]!
  source.text = source.text.replace(/padding: \d+/, `padding: ${10 + index}`)
  project.update(source.uri, source.text, ++versions[at]!)
})
if (project.statistics.parses !== before + 100)
  throw new Error('Dirty update reparsed unrelated documents')
const unchanged = sample(1000, (index) => {
  const at = index % files,
    source = sources[at]!
  project.update(source.uri, source.text, ++versions[at]!)
})
const lookup = sample(10_000, (index) => {
  const source = sources[index % files]!
  if (
    !project.at(source.uri, source.offset) ||
    !project.lookup('Part0', source.uri).length
  )
    throw new Error('Warm query lost indexed nodes')
})
const queryPage = sample(1000, () => {
  if (project.query({ kind: 'sheet', limit: 100 }).total !== files)
    throw new Error('Query total differs')
})
if (project.statistics.parses !== before + 100)
  throw new Error('Warm queries unexpectedly parsed documents')
const service = new DesignLanguageService(project)
const completionPositions = sources.map((source) =>
  service.document(source.uri)!.positionAt(source.text.indexOf('gap: 4') + 5),
)
const completions = sample(10_000, (index) => {
  const at = index % files
  const result = service.completions(sources[at]!.uri, completionPositions[at]!)
  if (result.items.length !== 4 || result.items[0]!.label !== '0')
    throw new Error('Actual token value completion differs')
})
if (project.statistics.parses !== before + 100)
  throw new Error('Completions reparsed documents')
const snapshot = project.snapshot()
console.log(
  JSON.stringify(
    {
      runtime: process.versions.bun
        ? `Bun ${process.versions.bun}`
        : process.version,
      machine: {
        os: process.platform,
        release: release(),
        arch: process.arch,
        cpu: cpus()[0]?.model,
      },
      files,
      characters: project.statistics.characters,
      designNodes: snapshot.nodes.length,
      cold,
      dirtyDocument: dirty,
      unchangedDocument: unchanged,
      localLookupAndInnermostRange: lookup,
      indexedSheetPage: queryPage,
      tokenValueCompletion: completions,
      statistics: project.statistics,
      limits:
        'Synthetic 12-part TSX files; timings are absolute and machine-specific. Heap, full TypeScript language service and browser/device work are not measured.',
    },
    null,
    2,
  ),
)
service.dispose()
