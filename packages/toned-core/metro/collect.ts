/**
 * Child-process entry for `withTonedOutputsSync`: builds every output and writes
 * it to the cache directory. Argument: a JSON `{ root, outputs, cacheDir, runner }`.
 * Prints each output's module keys, as `withTonedOutputs` resolves them.
 */
import { outputKeys, writeOutputCache } from '../outputs/cache.ts'
import { createOutputsLoader } from '../outputs/runner.ts'

const { root, outputs, cacheDir, runner } = JSON.parse(process.argv[2] ?? '{}')
const loader = createOutputsLoader({ root, outputs, runner })
const built = await loader.loadAll()
await writeOutputCache(cacheDir, built)
process.stdout.write(JSON.stringify(outputKeys(built)))
