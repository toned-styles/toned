import { getStylesheetPlan } from '../stylesheet/plans.ts'
import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { collectWebRules } from '../web/collect.ts'
/** Build-only CSS generation. This entry imports no DOM injector or React hook. */
import { generateArtifact } from './artifact.ts'
import type { BuildArtifact } from './manifest.ts'
import { collectManifestConditions, fingerprint } from './manifest.ts'

export { generate } from '../dom/generate.ts'
export type { GeneratePaletteOptions } from '../dom/palette.ts'
export { generatePalette } from '../dom/palette.ts'
export type { BuildArtifact, BuildManifest } from './manifest.ts'
export { assertBuildArtifact, assertManifestConditions } from './manifest.ts'

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
  const extensions = new Map<string, string>()
  for (const sheet of options.sheets) {
    const plan = getStylesheetPlan(sheet)
    if (plan.ref !== (system as unknown))
      throw new Error('Toned build: stylesheet belongs to a different system')
    const rules = resolvePlatformKeys(plan.rules, 'web')
    collectManifestConditions(rules, atoms)
    for (const [name, css] of collectWebRules(rules, system.id ?? 'legacy')) {
      if (extensions.has(name) && extensions.get(name) !== css)
        throw new Error('Toned: webRules content identity collision')
      extensions.set(name, css)
    }
  }
  const conditions = Object.freeze([...atoms].sort())
  const systemId = system.id ?? 'legacy'
  if (options.systemId !== undefined && options.systemId !== systemId)
    throw new Error(
      'Toned build: systemId must match the runtime system namespace',
    )
  const artifact = generateArtifact(system.system, {
    ...options,
    systemId: system.id,
    conditions,
  })
  if (!extensions.size) return artifact
  let extra = [...extensions]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, css]) => css)
    .join('\n')
  if (options.scope)
    extra = extra
      .split('\n')
      .map((rule) => `${options.scope} ${rule}`)
      .join('\n')
  if (options.layer) extra = `@layer ${options.layer} {\n${extra}\n}`
  const css = `${artifact.css}\n${extra}\n`
  return Object.freeze({
    css,
    manifest: Object.freeze({
      ...artifact.manifest,
      extensions: Object.freeze([...extensions.keys()].sort()),
      fingerprint: fingerprint(css),
    }),
  })
}

export type { TailwindCompiler, TailwindManifest } from './tailwind.ts'
export { buildTailwind, compileTailwindProfile } from './tailwind.ts'
