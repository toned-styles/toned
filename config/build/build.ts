import * as path from 'node:path'
import { $ } from 'bun'

const cwd = process.cwd()
const dist = path.resolve(cwd, '.dist')
const monorepoRoot = path.resolve(__dirname, '../..')

const licenseLocation = path.join(monorepoRoot, 'LICENSE')
// @ts-expect-error
const _rollupBin = path.join(
  __dirname,
  'node_modules',
  'rollup',
  'dist',
  'bin',
  'rollup',
)

const transformPkg = async () => {
  const {
    scripts: _scripts,
    devDependencies: _devDeps,
    publishConfig: _publishConfig,
    ...pkg
  } = await Bun.file('package.json').json()

  await Bun.write(
    path.join(dist, 'package.json'),
    JSON.stringify(pkg, null, 2),
    { createPath: true },
  )
}

await $`rm -rf ${dist}`

await $`tsc -b --emitDeclarationOnly false`

await $`cp README.md ${dist}`
await transformPkg()
await $`cp ${licenseLocation} ${dist}`
// NOTE: for some reason, npmignore isn't respected on publish by pnpm
await $`rm -rf ${path.join(dist, 'tsconfig.tsbuildinfo')}`
