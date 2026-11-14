/**
 * Builds a feature × target conformance matrix. For each pair it asks two
 * questions and records both:
 *
 * - types: does a call of the target with the feature's sheet type-check?
 *   A generated probe file per pair is checked with the tsc CI uses, so the
 *   answer comes from the published types, not from a list.
 * - runtime: does the call return without throwing or warning? A
 *   deprecation notice (`Toned deprecated: …`) is not a rejection: the
 *   feature still works on the target, and the scorecard counts deprecated
 *   API on its own (the purity suite's `deprecated` mutations).
 *
 * The outcome is `type-error` when the types refuse the pair, otherwise
 * `rejected` (with the runtime message) or `works`. `works` means the
 * target resolved the sheet without complaint; it is not a visual check.
 */
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { capture, compileDiagnostics } from '../probe.ts'

const isDeprecation = (report: string) =>
  /^(?:\[toned\] )?Toned deprecated: /.test(report)

export type Feature = {
  description: string
  /** Builds the feature's sheet for a target (most ignore the target). */
  sheet: (target: string) => unknown
  /** Passed to the target as its second argument when present. */
  options?: unknown
}

// oxlint-disable-next-line typescript/no-explicit-any -- each target types its own parameters
export type TargetFn = (sheet: any, options?: any) => unknown

export type Outcome = 'works' | 'rejected' | 'type-error'

export type Cell = {
  feature: string
  target: string
  outcome: Outcome
  types: 'ok' | 'error'
  runtime: 'works' | 'rejected'
  /** The first type error, or the runtime refusal. */
  message?: string
}

export type MatrixInput = {
  features: Readonly<Record<string, Feature>>
  targets: Readonly<Record<string, TargetFn>>
  /** Module exporting `features`, imported by the type probes. */
  featuresModule: string
  /** Module exporting `targets`, imported by the type probes. */
  targetsModule: string
  /**
   * The probe's call, as source, when the sheet must be built in the probe
   * itself (a declared-target system's stylesheet call is what the types
   * reject there). Default: `targets[target](features[feature].sheet())`.
   */
  probe?: (feature: string, target: string) => string
  /** Extra imports a custom probe needs: module path → named exports. */
  probeImports?: (
    feature: string,
    target: string,
  ) => Readonly<Record<string, readonly string[]>>
}

function typeProbes(input: MatrixInput): Map<string, string | undefined> {
  const dir = join(input.featuresModule, '..', `.probes-${randomUUID()}`)
  mkdirSync(dir, { recursive: true })
  const specifier = (module: string) => {
    const path = relative(dir, module)
    return path.startsWith('.') ? path : `./${path}`
  }
  try {
    const files = new Map<string, string>()
    for (const [feature, definition] of Object.entries(input.features)) {
      for (const target of Object.keys(input.targets)) {
        const file = join(dir, `${feature}--${target}.ts`)
        const args = [
          `features[${JSON.stringify(feature)}].sheet()`,
          ...('options' in definition
            ? [`features[${JSON.stringify(feature)}].options`]
            : []),
        ]
        writeFileSync(
          file,
          [
            `import { features } from ${JSON.stringify(specifier(input.featuresModule))}`,
            `import { targets } from ${JSON.stringify(specifier(input.targetsModule))}`,
            ...Object.entries(input.probeImports?.(feature, target) ?? {}).map(
              ([module, names]) =>
                `import { ${names.join(', ')} } from ${JSON.stringify(specifier(module))}`,
            ),
            input.probe?.(feature, target) ??
              `targets[${JSON.stringify(target)}](${args.join(', ')})`,
            '',
          ].join('\n'),
        )
        files.set(`${feature}\u0000${target}`, file)
      }
    }
    const diagnostics = compileDiagnostics([...files.values()])
    return new Map(
      [...files].map(([key, file]) => [key, diagnostics.get(file)?.[0]]),
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export async function buildMatrix(input: MatrixInput): Promise<Cell[]> {
  const types = typeProbes(input)
  const cells: Cell[] = []
  for (const [feature, definition] of Object.entries(input.features)) {
    for (const [target, resolve] of Object.entries(input.targets)) {
      const reports = (
        await capture(() =>
          'options' in definition
            ? resolve(definition.sheet(target), definition.options)
            : resolve(definition.sheet(target)),
        )
      ).filter((report) => !isDeprecation(report))
      const typeError = types.get(`${feature}\u0000${target}`)
      const runtime = reports.length ? 'rejected' : 'works'
      const message = typeError ?? reports[0]
      cells.push({
        feature,
        target,
        outcome: typeError ? 'type-error' : runtime,
        types: typeError ? 'error' : 'ok',
        runtime,
        ...(message ? { message } : {}),
      })
    }
  }
  return cells
}
