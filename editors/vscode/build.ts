import { chmod, copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('./', import.meta.url))
await mkdir(`${root}dist`, { recursive: true })
for (const name of ['extension', 'server', 'extension-test']) {
  const result = await Bun.build({
    entrypoints: [`${root}src/${name}.ts`],
    target: 'node',
    format: 'cjs',
    external: ['vscode'],
    outdir: `${root}dist`,
    naming: `${name}.cjs`,
    minify: false,
  })
  if (!result.success)
    throw new AggregateError(result.logs, `Cannot build Toned ${name}`)
}
await copyFile(`${root}../../LICENSE`, `${root}LICENSE`)

// vscode-languageclient's bundled POSIX fallback resolves this beside extension.cjs.
const terminate = `${root}dist/terminateProcess.sh`
await copyFile(
  fileURLToPath(
    import.meta.resolve('vscode-languageclient/lib/node/terminateProcess.sh'),
  ),
  terminate,
)
await chmod(terminate, 0o755)
await copyFile(
  fileURLToPath(import.meta.resolve('vscode-languageclient/License.txt')),
  `${root}dist/vscode-languageclient-LICENSE.txt`,
)
