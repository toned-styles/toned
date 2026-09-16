/** Build-only CSS generation. This entry imports no DOM injector or React hook. */
import { generate } from '../dom/generate.ts'
import { getStylesheetPlan } from '../stylesheet/plans.ts'
import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'
import { collectManifestConditions, systemDefinition } from './manifest.ts'

export { generate } from '../dom/generate.ts'
export { generatePalette } from '../dom/palette.ts'
export type { GeneratePaletteOptions } from '../dom/palette.ts'

export type BuildManifest = Readonly<{
  version: 1
  systemId: string
  /** Exact static schema, including named thresholds and token vocabulary. */
  definition: string
  /** Ad-hoc condition atoms. Named conditions belong to definition. */
  conditions: readonly string[]
  fingerprint: string
}>

export type BuildArtifact = Readonly<{ css: string; manifest: BuildManifest }>

/** Stable content identifier, not a security hash or an equality shortcut. */
function fingerprint(text: string): string {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(36)
}

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
    throw new Error('Toned build: systemId must match the runtime system namespace')
  if (options.layer && !/^[a-zA-Z_][\w-]*(?:\.[a-zA-Z_][\w-]*)*$/.test(options.layer))
    throw new Error('Toned build: layer must be a CSS layer name')
  const output = generate(system.system, {
    scope: options.scope,
    conditions,
    ...(systemId === 'legacy' ? {} : { id: systemId }),
  })
  const css = options.layer ? `@layer ${options.layer} {\n${output}\n}\n` : output
  const manifest = Object.freeze({
    version: 1 as const,
    systemId,
    definition: systemDefinition(system.system),
    conditions,
    fingerprint: fingerprint(css),
  })
  return Object.freeze({ css, manifest })
}

export function assertManifestConditions(manifest: BuildManifest, rules: unknown): void {
  const needed = new Set<string>()
  collectManifestConditions(rules, needed)
  const emitted = new Set(manifest.conditions)
  for (const atom of needed) {
    if (!emitted.has(atom))
      throw new Error(
        `Toned manifest ${manifest.systemId}: undeclared condition ${atom}; add the stylesheet to buildStyles({ sheets }) and regenerate CSS`,
      )
  }
}
