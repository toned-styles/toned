import { chmod, copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import * as path from 'node:path'

import { $ } from 'bun'

const cwd = process.cwd()
const dist = path.resolve(cwd, '.dist')
const monorepoRoot = path.resolve(__dirname, '../..')

const licenseLocation = path.join(monorepoRoot, 'LICENSE')

/**
 * Source `exports` point at the TypeScript entry points, so the packages can be
 * consumed directly from a workspace with no build step. The published package
 * ships compiled output, so every `.ts`/`.tsx` export and executable target is rewritten to `.js`.
 * React packages select react-jsx emission, which produces .js (not .jsx).
 */
const toDistTarget = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.replace(/\.tsx?$/, '.js')
  }
  if (isTypeOnlyExport(value)) {
    const base = value.types.replace(/\.ts$/, '')
    return { types: `${base}.d.ts`, default: `${base}.js` }
  }
  if (Array.isArray(value)) return value.map(toDistTarget)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toDistTarget(entry)]),
    )
  }
  return value
}

/**
 * An export written as `{ "types": "./name.ts" }` is a declaration-only module:
 * it augments types and has no runtime. Such modules are kept out of the
 * package's TypeScript project (two of them may augment the same interface),
 * so the compiler emits nothing for them and they are shipped here instead.
 */
const isTypeOnlyExport = (value: unknown): value is { types: string } =>
  typeof value === 'object' &&
  value !== null &&
  Object.keys(value).length === 1 &&
  typeof (value as { types?: unknown }).types === 'string' &&
  (value as { types: string }).types.endsWith('.ts')

/** Ship each declaration-only module as its source plus an empty module. */
async function emitTypeOnlyExports(exports: unknown): Promise<void> {
  if (!exports || typeof exports !== 'object') return
  for (const value of Object.values(exports)) {
    if (!isTypeOnlyExport(value)) continue
    const base = value.types.replace(/\.ts$/, '')
    await copyFile(path.join(cwd, value.types), path.join(dist, `${base}.d.ts`))
    await Bun.write(path.join(dist, `${base}.js`), 'export {}\n')
  }
}

/** Every file the published export map names must exist in the package. */
async function assertExportTargets(value: unknown, key = 'exports') {
  if (typeof value === 'string') {
    if (!value.includes('*') && !(await Bun.file(path.join(dist, value)).exists()))
      throw new Error(`Export ${key} points at ${value}, which was not built`)
  } else if (value && typeof value === 'object') {
    for (const [name, target] of Object.entries(value))
      await assertExportTargets(target, `${key} > ${name}`)
  }
}

/** TypeScript emits modules, not stylesheets. Copy only CSS explicitly exposed
 * by the package's export map, including nested conditional exports. */
async function copyExportedStyles(value: unknown): Promise<void> {
  if (typeof value === 'string') {
    if (!value.endsWith('.css')) return
    if (
      !value.startsWith('./') ||
      value.split('/').includes('..') ||
      value.includes('*')
    )
      throw new Error(
        `Expected an explicit package-relative CSS export: ${value}`,
      )
    const target = path.join(dist, value)
    await mkdir(path.dirname(target), { recursive: true })
    await copyFile(path.join(cwd, value), target)
  } else if (value && typeof value === 'object') {
    for (const target of Object.values(value)) await copyExportedStyles(target)
  }
}

const transformPkg = async () => {
  const {
    scripts: _scripts,
    devDependencies: _devDeps,
    publishConfig: {
      directory: _directory,
      linkDirectory: _linkDirectory,
      ...publishConfig
    } = {},
    ...pkg
  } = await Bun.file('package.json').json()
  // The published manifest keeps registry settings such as `access`; only the
  // workspace's directory redirection is dropped.
  if (Object.keys(publishConfig).length) pkg.publishConfig = publishConfig

  if (pkg.exports) {
    await copyExportedStyles(pkg.exports)
    await emitTypeOnlyExports(pkg.exports)
    pkg.exports = toDistTarget(pkg.exports)
    await assertExportTargets(pkg.exports)
  }

  if (pkg.bin) {
    pkg.bin = toDistTarget(pkg.bin)
    for (const target of typeof pkg.bin === 'string'
      ? [pkg.bin]
      : Object.values(pkg.bin)) {
      if (
        typeof target !== 'string' ||
        !target.startsWith('./') ||
        target.split('/').includes('..')
      )
        throw new Error(
          `Expected an explicit package-relative executable: ${String(target)}`,
        )
      await chmod(path.join(dist, target), 0o755)
    }
  }

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

// The workspace TypeScript, not whichever `tsc` happens to be on PATH.
const tsc = path.join(monorepoRoot, 'node_modules/.bin/tsc')
await $`${tsc} -b --emitDeclarationOnly false`
await removeTestArtifacts(dist)

await $`cp README.md ${dist}`
await transformPkg()
await $`cp ${licenseLocation} ${dist}`
// Build info is not package content. Remove it explicitly: pnpm publish does
// not apply .npmignore to this directory.
await $`rm -rf ${path.join(dist, 'tsconfig.tsbuildinfo')}`
