import { assertThemeSides, generateThemes } from '../dom/themes.ts'
import { getStylesheetPlan } from '../stylesheet/plans.ts'
import type { SystemOptions } from '../system/definition.ts'
import { assertDeclaredWidths } from '../system/widths.ts'
import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { warnOnce } from '../utils/warn.ts'
import { collectWebRules } from '../web/collect.ts'
import { warnWebRules } from '../web/deprecation.ts'
/** Build-only CSS generation. This entry imports no DOM injector or React hook. */
import { generateArtifact } from './artifact.ts'
import type { BuildArtifact } from './manifest.ts'
import { fingerprint } from './manifest.ts'

export { generate } from '../dom/generate.ts'
export type { GeneratePaletteOptions } from '../dom/palette.ts'
export { generatePalette } from '../dom/palette.ts'
export type { GenerateThemesOptions } from '../dom/themes.ts'
export { generateThemes } from '../dom/themes.ts'
export type { BuildArtifact, BuildManifest } from './manifest.ts'
export { assertBuildArtifact, assertManifestConditions } from './manifest.ts'

/**
 * Build a system's CSS and manifest from its declaration alone. No stylesheet
 * is read: every condition a sheet may use (named media and container steps,
 * declared `widths`, states) is declared by the system, so adding, editing or
 * deleting a sheet changes no output.
 */
export function buildStyles<S extends TokenStyleDeclaration>(
  system: TokenSystem<S>,
  options: {
    /**
     * @deprecated The build no longer reads sheets for conditions; a sheet's
     * width thresholds are declared in `conditions.widths`. Sheets are read
     * only for the deprecated `$webRules` extension; without one, this option
     * changes nothing and warns in development.
     */
    sheets?: readonly object[]
    /**
     * @deprecated Ad-hoc atoms come from the system's `conditions.widths`.
     * Each listed atom must be declared there (an undeclared one throws,
     * naming where to declare it); a declared one changes nothing.
     */
    conditions?: readonly string[]
    scope?: string
    layer?: string
    systemId?: string
    /**
     * Themes declared by the system are written as custom properties, the
     * first declared as the default. Name another default, or pass `false`
     * to deliver theme values yourself.
     */
    themes?: false | { default?: string }
  } = {},
): BuildArtifact {
  if (options.conditions?.length) {
    const declared = system.system as SystemOptions
    assertDeclaredWidths(
      options.conditions,
      declared.widths,
      declared.containers,
    )
    warnOnce(
      'build-conditions',
      'Toned deprecated: buildStyles({ conditions }) no longer changes the output; the build emits the widths the system declares in conditions.widths. Remove the option.',
    )
  }
  const extensions = new Map<string, string>()
  for (const sheet of options.sheets ?? []) {
    const plan = getStylesheetPlan(sheet)
    if (plan.ref !== (system as unknown))
      throw new Error('Toned build: stylesheet belongs to a different system')
    const rules = resolvePlatformKeys(plan.rules, 'web')
    for (const [name, css] of collectWebRules(
      rules,
      system.id ?? 'legacy',
      options.scope,
    )) {
      if (extensions.has(name) && extensions.get(name) !== css)
        throw new Error('Toned: webRules content identity collision')
      extensions.set(name, css)
    }
  }
  if (extensions.size) warnWebRules()
  else if (options.sheets?.length)
    warnOnce(
      'build-sheets',
      'Toned deprecated: buildStyles({ sheets }) no longer changes the output: the build reads only the system declaration (declare width thresholds in conditions.widths). Sheets are read only for the deprecated $webRules extension; remove the option.',
    )
  const systemId = system.id ?? 'legacy'
  if (options.systemId !== undefined && options.systemId !== systemId)
    throw new Error(
      'Toned build: systemId must match the runtime system namespace',
    )
  const artifact = generateArtifact(system.system, {
    scope: options.scope,
    layer: options.layer,
    systemId: system.id,
  })
  if (options.themes !== false) assertThemeSides(artifact.css, system)
  const extra = [
    ...[...extensions]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, css]) => css),
    ...(options.themes === false
      ? []
      : [
          generateThemes(system, {
            default: options.themes?.default,
            scope: options.scope,
          }),
        ]),
  ]
    .filter(Boolean)
    .join('\n')
  if (!extra) return artifact
  const css = `${artifact.css}\n${
    options.layer ? `@layer ${options.layer} {\n${extra}\n}` : extra
  }\n`
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
