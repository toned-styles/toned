/** One emission path for programmatic builds and the Vite adapter. */
import { generate } from '../dom/generate.ts'
import { validateSystemId } from '../system/namespace.ts'
import type { TokenStyleDeclaration } from '../types/index.ts'
import { fingerprint, systemDefinition } from './manifest.ts'
import type { BuildArtifact } from './manifest.ts'

export function generateArtifact(
  system: TokenStyleDeclaration,
  options: {
    systemId?: string
    conditions?: readonly string[]
    scope?: string
    layer?: string
  },
): BuildArtifact {
  const systemId = options.systemId ?? 'legacy'
  if (options.systemId !== undefined) validateSystemId(options.systemId)
  if (
    options.layer &&
    !/^[a-zA-Z_][\w-]*(?:\.[a-zA-Z_][\w-]*)*$/.test(options.layer)
  )
    throw new Error('Toned build: layer must be a CSS layer name')
  const conditions = Object.freeze(
    [...new Set(options.conditions ?? [])].sort(),
  )
  const output = generate(system, {
    scope: options.scope,
    conditions,
    ...(options.systemId === undefined ? {} : { id: options.systemId }),
  })
  const css = options.layer
    ? `@layer ${options.layer} {\n${output}\n}\n`
    : output
  return Object.freeze({
    css,
    manifest: Object.freeze({
      version: 1 as const,
      systemId,
      definition: systemDefinition(system),
      conditions,
      fingerprint: fingerprint(css),
    }),
  })
}
