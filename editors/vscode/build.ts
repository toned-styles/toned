import { copyFile, mkdir } from 'node:fs/promises'
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

// The package's exports map hides its licence file, so find it from the entry.
await copyFile(
  fileURLToPath(
    new URL(
      '../../License.txt',
      import.meta.resolve('vscode-languageclient/node'),
    ),
  ),
  `${root}dist/vscode-languageclient-LICENSE.txt`,
)
