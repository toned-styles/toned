/**
 * Child-process entry for `withTonedOutputsSync`: collects the outputs and
 * writes them to the cache directory. Arguments: a JSON `{ root, modules, cacheDir, runner }`.
 */
import { writeOutputCache } from '../outputs/cache.ts'
import { loadOutputs } from '../outputs/runner.ts'

const { root, modules, cacheDir, runner } = JSON.parse(process.argv[2] ?? '{}')
const outputs = await loadOutputs({ root, modules, runner })
await writeOutputCache(cacheDir, outputs)
process.stdout.write(JSON.stringify(Object.keys(outputs)))
