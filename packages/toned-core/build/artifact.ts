/** One emission path for programmatic builds and the Vite adapter. */
import { generate } from '../dom/generate.ts'
import { validateSystemId } from '../system/namespace.ts'
import { assertDeclaredWidths, declaredWidthAtoms } from '../system/widths.ts'
import type { TokenStyleDeclaration } from '../types/index.ts'
import type { BuildArtifact } from './manifest.ts'
import { fingerprint, systemDefinition } from './manifest.ts'

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
  // The build reads only the system: its declared widths are the ad-hoc
  // atoms. A caller-listed atom (the deprecated `conditions` input) must be
  // one of them, so it can never add CSS the declaration does not describe.
  if (options.conditions?.length)
    assertDeclaredWidths(
      options.conditions,
      system.widths,
      system.containers as Readonly<Record<string, unknown>> | undefined,
    )
  const conditions = Object.freeze(declaredWidthAtoms(system.widths))
  const output = generate(system, {
    scope: options.scope,
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
      namespace: options.systemId ?? null,
      definition: systemDefinition(system),
      conditions,
      fingerprint: fingerprint(css),
    }),
  })
}
