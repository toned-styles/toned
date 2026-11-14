import { globSync } from 'node:fs'
import { resolve } from 'node:path'

import { outputName } from './index.ts'

/** Output files matching `patterns` (globs relative to `root`), by output name. */
export function discoverOutputs(root: string, patterns: readonly string[]): Record<string, string> {
  const files: Record<string, string> = {}
  for (const pattern of patterns) {
    for (const match of globSync(pattern, { cwd: root, exclude: path => path.includes('node_modules') })) {
      const file = resolve(root, match)
      const name = outputName(file)
      if (!name) continue
      if (files[name] && files[name] !== file)
        throw new Error(`Toned output "${name}" is provided by both ${files[name]} and ${file}`)
      files[name] = file
    }
  }
  return files
}
