/**
 * Child-process entry for `withTonedOutputsSync`: builds every output and writes
 * it to the cache directory. Argument: a JSON `{ root, outputs, cacheDir, runner }`.
 */
import { writeOutputCache } from '../outputs/cache.ts'
import { createOutputsLoader } from '../outputs/runner.ts'

const { root, outputs, cacheDir, runner } = JSON.parse(process.argv[2] ?? '{}')
const loader = createOutputsLoader({ root, outputs, runner })
await writeOutputCache(cacheDir, await loader.loadAll())
process.stdout.write(JSON.stringify(loader.names))
