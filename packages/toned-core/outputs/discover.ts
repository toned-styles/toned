import { existsSync, globSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

import { outputName } from './index.ts'

/** A package's own output declaration: `"toned": { "outputs": [globs] }` in its package.json. */
export interface OutputDeclaration {
  /** The package directory the globs are relative to. */
  dir: string
  patterns: readonly string[]
}

type Manifest = {
  toned?: { outputs?: unknown }
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

/** The nearest package.json at or above `dir`. */
function packageAbove(dir: string): string | undefined {
  for (let current = resolve(dir); ; current = dirname(current)) {
    if (existsSync(join(current, 'package.json'))) return current
    if (dirname(current) === current) return undefined
  }
}

/** Where `name` is installed for the package in `dir`, by Node's lookup, as a real path. */
function installed(dir: string, name: string): string | undefined {
  for (let current = dir; ; current = dirname(current)) {
    const candidate = join(current, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate)
    if (dirname(current) === current) return undefined
  }
}

const isWorkspacePackage = (dir: string) => !dir.split(sep).includes('node_modules')

function readManifest(dir: string): Manifest {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Manifest
}

function declaration(dir: string, manifest: Manifest): OutputDeclaration | undefined {
  if (manifest.toned === undefined) return undefined
  const patterns = manifest.toned?.outputs ?? []
  if (!Array.isArray(patterns) || patterns.some(pattern => typeof pattern !== 'string'))
    throw new Error(
      `${join(dir, 'package.json')}: "toned.outputs" must be an array of globs relative to the package`,
    )
  return { dir, patterns }
}

/**
 * The output declarations reachable from the package at or above `root`: its
 * own, then its dependencies', breadth first. The root package's dependencies
 * of every kind are followed; a dependency's own `devDependencies` are not
 * (they are not installed for the consumer). A dependency is read when it is a
 * workspace package (not under `node_modules`) or declares a `toned` field, so
 * the walk costs one package.json read per dependency of those packages, not
 * one per package in `node_modules`.
 */
export function declaredOutputs(root: string): OutputDeclaration[] {
  const start = packageAbove(root)
  if (!start) return []
  const declarations: OutputDeclaration[] = []
  const seen = new Set([realpathSync(start)])
  const queue: { dir: string; manifest: Manifest; isRoot: boolean }[] = [
    { dir: realpathSync(start), manifest: readManifest(start), isRoot: true },
  ]
  for (let next = queue.shift(); next; next = queue.shift()) {
    const { dir, manifest, isRoot } = next
    const own = declaration(dir, manifest)
    if (own) declarations.push(own)
    const names = Object.keys({
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
      ...manifest.peerDependencies,
      ...(isRoot ? manifest.devDependencies : {}),
    })
    for (const name of names) {
      const found = installed(dir, name)
      if (!found || seen.has(found)) continue
      seen.add(found)
      const dependency = readManifest(found)
      if (isWorkspacePackage(found) || dependency.toned !== undefined)
        queue.push({ dir: found, manifest: dependency, isRoot: false })
    }
  }
  return declarations
}

function addMatches(
  files: Record<string, string>,
  cwd: string,
  patterns: readonly string[],
): void {
  for (const pattern of patterns) {
    for (const match of globSync(pattern, { cwd, exclude: path => path.includes('node_modules') })) {
      const file = resolve(cwd, match)
      const name = outputName(file)
      if (!name) continue
      if (files[name] && files[name] !== file)
        throw new Error(`Toned output "${name}" is provided by both ${files[name]} and ${file}`)
      files[name] = file
    }
  }
}

/**
 * Output files by output name. With `patterns` (globs relative to `root`), only
 * those; without, the outputs every reachable package declares (`declaredOutputs`).
 */
export function discoverOutputs(
  root: string,
  patterns?: readonly string[],
): Record<string, string> {
  const files: Record<string, string> = {}
  if (patterns) addMatches(files, root, patterns)
  else for (const { dir, patterns: own } of declaredOutputs(root)) addMatches(files, dir, own)
  return files
}
