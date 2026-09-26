/** Shared-system invalidation benchmark. Optional second argument selects an isolated
 * compiler source directory; neither project nor source modules are executed. */
import { cpus, release } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const files = Number(process.argv[2] ?? 1000)
if (!Number.isSafeInteger(files) || files < 1 || files > 4096)
  throw new Error('Use 1..4096 files')
const compiler = process.argv[3]
  ? pathToFileURL(resolve(process.argv[3]) + '/').href
  : new URL('../packages/toned-compiler/', import.meta.url).href
const { DesignProject } = await import(new URL('project.ts', compiler).href)
const { DesignLanguageService } = await import(
  new URL('lsp/service.ts', compiler).href
)
const project = new DesignProject(),
  service = new DesignLanguageService(project)
const systemUri = 'file:///shared/system.ts'
const system = (value: string) =>
  `export const ui=defineSystem({${Array.from({ length: 70 }, (_, i) => `token${i}:defineToken({values:['${value}','other']})`).join(',')}})`
const text = `import {ui} from './system';const styles=ui.stylesheet({Root:{token0:'accent'}})`
const uris = Array.from(
  { length: files },
  (_, i) => `file:///shared/component${i}.ts`,
)
function measure(count: number, operation: (index: number) => void) {
  const values: number[] = []
  for (let index = 0; index < count; index++) {
    const start = performance.now()
    operation(index)
    values.push(performance.now() - start)
  }
  values.sort((a, b) => a - b)
  return {
    samples: count,
    medianMs: values[Math.floor(values.length / 2)],
    p95Ms: values[Math.floor(values.length * 0.95)],
  }
}
const memoryBefore = process.memoryUsage()
const cold = measure(1, () => {
  project.update(systemUri, system('accent'), 1)
  for (const uri of uris) project.update(uri, text, 1)
})
const firstConsumers = measure(files, (index) => {
  if (project.tokensForSystem('ui', uris[index]).length !== 70)
    throw new Error('Vocabulary mismatch')
})
const active = uris[0]!,
  position = { line: 0, character: text.indexOf("'accent'") + 2 }
const warm = measure(1000, () => {
  if (service.completions(active, position).items.length !== 2)
    throw new Error('Completion mismatch')
})
const unrelated = 'file:///shared/unrelated.ts'
const unrelatedEdit = measure(100, (index) => {
  project.update(unrelated, `const x=${index}`, index)
  if (project.tokensForSystem('ui', active).length !== 70)
    throw new Error('Unrelated edit dropped vocabulary')
})
const sharedEdit = measure(20, (index) => {
  project.update(systemUri, system(`edit${index}`), index + 2)
  if (service.completions(active, position).items[0]?.label !== `edit${index}`)
    throw new Error('Stale shared vocabulary')
})
console.log(
  JSON.stringify(
    {
      runtime: process.versions.bun
        ? `Bun ${process.versions.bun}`
        : process.version,
      machine: {
        platform: process.platform,
        release: release(),
        arch: process.arch,
        cpu: cpus()[0]?.model,
      },
      files,
      cold,
      firstConsumers,
      warm,
      unrelatedEdit,
      sharedEdit,
      statistics: project.statistics,
      memoryBefore,
      memoryAfter: process.memoryUsage(),
      limits:
        'One shared 70-token system; synthetic timings include source parsing and symbolic evaluation, not I/O or protocol. Memory snapshots are unforced process observations, not retained-heap comparisons.',
    },
    null,
    2,
  ),
)
service.dispose()
