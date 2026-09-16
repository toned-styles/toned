/** Build-only CSS generation. This entry imports no DOM injector or React hook. */
import { generateArtifact } from './artifact.ts'
import { getStylesheetPlan } from '../stylesheet/plans.ts'
import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'
import { collectManifestConditions } from './manifest.ts'
import type { BuildArtifact } from './manifest.ts'
export { assertManifestConditions, assertBuildArtifact } from './manifest.ts'
export type { BuildManifest, BuildArtifact } from './manifest.ts'

export { generate } from '../dom/generate.ts'
export type { GeneratePaletteOptions } from '../dom/palette.ts'
export { generatePalette } from '../dom/palette.ts'

export function buildStyles<S extends TokenStyleDeclaration>(
  system: TokenSystem<S>,
  options: {
    /** Include lazy sheets explicitly. Import order is not a collection API. */
    sheets: readonly object[]
    conditions?: readonly string[]
    scope?: string
    layer?: string
    systemId?: string
  },
): BuildArtifact {
  const atoms = new Set(options.conditions ?? [])
  for (const sheet of options.sheets) {
    const plan = getStylesheetPlan(sheet)
    if (plan.ref !== (system as unknown))
      throw new Error('Toned build: stylesheet belongs to a different system')
    collectManifestConditions(plan.rules, atoms)
  }
  const conditions = Object.freeze([...atoms].sort())
  const systemId = system.id ?? 'legacy'
  if (options.systemId !== undefined && options.systemId !== systemId)
    throw new Error(
      'Toned build: systemId must match the runtime system namespace',
    )
  return generateArtifact(system.system, {
    ...options,
    systemId: system.id,
    conditions,
  })
}
