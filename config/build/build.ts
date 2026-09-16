import { readdir, rm } from 'node:fs/promises'
import * as path from 'node:path'
import { $ } from 'bun'

const cwd = process.cwd()
const dist = path.resolve(cwd, '.dist')
const monorepoRoot = path.resolve(__dirname, '../..')

const licenseLocation = path.join(monorepoRoot, 'LICENSE')

/**
 * Source `exports` point at the TypeScript entry points, so the packages can be
 * consumed directly from a workspace with no build step. The published package
 * ships compiled output, so every `.ts` target is rewritten to `.js` here.
 */
const toDistTarget = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.endsWith('.ts') ? `${value.slice(0, -3)}.js` : value
  }
  if (Array.isArray(value)) return value.map(toDistTarget)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toDistTarget(entry)]),
    )
  }
  return value
}

const transformPkg = async () => {
  const {
    scripts: _scripts,
    devDependencies: _devDeps,
    publishConfig: _publishConfig,
    ...pkg
  } = await Bun.file('package.json').json()

  if (pkg.exports) pkg.exports = toDistTarget(pkg.exports)

  await Bun.write(
    path.join(dist, 'package.json'),
    JSON.stringify(pkg, null, 2),
    { createPath: true },
  )
}

/** Type fixtures participate in checking, but test runners are not package dependencies. */
async function removeTestArtifacts(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (
      entry.name === '__tests__' ||
      /\.test(?:-d)?(?:\.|$)/.test(entry.name)
    ) {
      await rm(file, { recursive: true, force: true })
    } else if (entry.isDirectory()) {
      await removeTestArtifacts(file)
    }
  }
}

await $`rm -rf ${dist}`

await $`tsc -b --emitDeclarationOnly false`
await removeTestArtifacts(dist)

await $`cp README.md ${dist}`
await transformPkg()
await $`cp ${licenseLocation} ${dist}`
// NOTE: for some reason, npmignore isn't respected on publish by pnpm
await $`rm -rf ${path.join(dist, 'tsconfig.tsbuildinfo')}`
