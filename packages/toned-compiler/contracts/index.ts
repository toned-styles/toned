import type { DeclarationOrigin } from '@toned/core/core'
import { contrastRatio } from './color.ts'
import type { Scenario, ScenarioSuite, ScenarioValue } from './scenarios.ts'

export { contrastRatio } from './color.ts'
export type {
  Scenario,
  ScenarioDimensions,
  ScenarioSuite,
  ScenarioValue,
} from './scenarios.ts'
export { createScenarios } from './scenarios.ts'

type Target<Part extends string> = { readonly id: string; readonly part: Part }
type FactCondition<Facts extends Readonly<Record<string, ScenarioValue>>> = {
  [K in keyof Facts & string]: { readonly fact: K; readonly equals: Facts[K] }
}[keyof Facts & string]
export type DesignContract<
  Part extends string = string,
  Facts extends Readonly<Record<string, ScenarioValue>> = Readonly<
    Record<string, ScenarioValue>
  >,
> = Target<Part> &
  (
    | {
        readonly kind: 'interaction-size'
        readonly minWidth: number
        readonly minHeight: number
      }
    | {
        readonly kind: 'contrast'
        readonly backgroundPart?: Part
        readonly minRatio: number
      }
    | {
        readonly kind: 'overflow'
        readonly axis?: 'x' | 'y' | 'both'
        readonly tolerance?: number
      }
    | {
        readonly kind: 'focus'
        readonly when: FactCondition<Facts>
      }
    | {
        readonly kind: 'reduced-motion'
        readonly when: FactCondition<Facts>
        readonly maxDurationMs: number
      }
  )
/** Matches the stable evidence shape returned by renderer.explain(sheet,input). */
export interface ContractResolution {
  readonly output: Readonly<
    Record<string, { readonly style: Readonly<Record<string, unknown>> }>
  >
  readonly parts: Readonly<
    Record<
      string,
      Readonly<
        Record<
          string,
          {
            readonly value: unknown
            readonly winner: DeclarationOrigin
            readonly writes: readonly DeclarationOrigin[]
          }
        >
      >
    >
  >
}
export interface PartMeasurement {
  readonly width?: number
  readonly height?: number
  readonly overflowX?: number
  readonly overflowY?: number
  /** A host-observed visible focus indicator, not just a declared outline. */
  readonly focusVisible?: boolean
  /** Observed animation/transition duration under this scenario. */
  readonly motionDurationMs?: number
  /** Host-composited opaque sRGB colors; accepted as #rgb or #rrggbb. */
  readonly foreground?: string
  readonly background?: string
}
export interface ContractFinding {
  readonly contract: string
  readonly part: string
  readonly status: 'fail' | 'inconclusive'
  readonly reason: string
  readonly scenario: Scenario
  readonly evidence: Readonly<Record<string, unknown>>
  readonly origins: readonly DeclarationOrigin[]
}
export interface ContractReport {
  readonly coverage: ScenarioSuite['coverage']
  readonly passed: number
  readonly failed: number
  readonly inconclusive: number
  readonly skipped: number
  readonly findings: readonly ContractFinding[]
  readonly omittedFindings: number
  readonly status: 'pass' | 'fail' | 'inconclusive'
}

/** Resolve and measure each explicit scenario once; never infer layout/accessibility
 * from declarations alone. Findings are bounded while total counters remain exact. */
type ResolutionPart<R extends ContractResolution> = Extract<
  keyof R['output'],
  string
>
export async function verifyContracts<
  R extends ContractResolution,
  S extends Scenario,
>(options: {
  readonly suite: ScenarioSuite<S>
  readonly contracts: readonly DesignContract<
    ResolutionPart<NoInfer<R>>,
    NoInfer<S['facts']>
  >[]
  readonly resolve: (scenario: S) => R | Promise<R>
  readonly measure?: (
    scenario: S,
    resolution: R,
  ) =>
    | Readonly<Partial<Record<ResolutionPart<R>, PartMeasurement>>>
    | Promise<Readonly<Partial<Record<ResolutionPart<R>, PartMeasurement>>>>
  readonly maxFindings?: number
  readonly signal?: AbortSignal
}): Promise<ContractReport> {
  const max = options.maxFindings ?? 100
  if (!Number.isInteger(max) || max < 1 || max > 10000)
    throw new Error('Toned contracts: maxFindings must be from 1 to 10000')
  if (
    options.suite.scenarios.length > 10000 ||
    options.contracts.length > 1000 ||
    options.suite.scenarios.length * options.contracts.length > 100000
  )
    throw new Error('Toned contracts: verification budget exceeded')
  if (
    new Set(options.contracts.map((c) => c.id)).size !==
    options.contracts.length
  )
    throw new Error('Toned contracts: contract ids must be unique')
  for (const contract of options.contracts) {
    if (
      ![
        'interaction-size',
        'contrast',
        'overflow',
        'focus',
        'reduced-motion',
      ].includes(contract.kind) ||
      typeof contract.id !== 'string' ||
      !contract.id ||
      typeof contract.part !== 'string' ||
      !contract.part ||
      (contract.kind === 'overflow' &&
        contract.axis !== undefined &&
        !['x', 'y', 'both'].includes(contract.axis)) ||
      ((contract.kind === 'focus' || contract.kind === 'reduced-motion') &&
        (!contract.when ||
          typeof contract.when.fact !== 'string' ||
          !contract.when.fact ||
          !(
            contract.when.equals === null ||
            typeof contract.when.equals === 'string' ||
            typeof contract.when.equals === 'boolean' ||
            (typeof contract.when.equals === 'number' &&
              Number.isFinite(contract.when.equals))
          )))
    )
      throw new Error('Toned contracts: malformed policy')
    const numbers =
      contract.kind === 'interaction-size'
        ? [contract.minWidth, contract.minHeight]
        : contract.kind === 'contrast'
          ? [contract.minRatio]
          : contract.kind === 'overflow'
            ? [contract.tolerance ?? 0]
            : contract.kind === 'reduced-motion'
              ? [contract.maxDurationMs]
              : []
    if (
      !numbers.every((n) => Number.isFinite(n) && n >= 0) ||
      (contract.kind === 'contrast' &&
        (contract.minRatio < 1 || contract.minRatio > 21))
    )
      throw new Error(`Toned contracts: invalid policy ${contract.id}`)
  }
  const report = {
    coverage: options.suite.coverage,
    passed: 0,
    failed: 0,
    inconclusive: 0,
    skipped: 0,
    findings: [] as ContractFinding[],
    omittedFindings: 0,
    status: 'pass' as ContractReport['status'],
  }
  const record = (
    contract: DesignContract<ResolutionPart<R>>,
    scenario: Scenario,
    resolution: ContractResolution | undefined,
    status: 'fail' | 'inconclusive',
    reason: string,
    evidence: Readonly<Record<string, unknown>>,
  ) => {
    if (status === 'fail') report.failed++
    else report.inconclusive++
    if (report.findings.length >= max) {
      report.omittedFindings++
      return
    }
    const partNames =
      contract.kind === 'contrast' && contract.backgroundPart
        ? [contract.part, contract.backgroundPart]
        : [contract.part]
    const origins = partNames.flatMap((part) =>
      Object.values(resolution?.parts[part] ?? {}).map((field) => field.winner),
    )
    report.findings.push({
      contract: contract.id,
      part: contract.part,
      status,
      reason,
      scenario,
      evidence,
      origins,
    })
  }
  for (const scenario of options.suite.scenarios) {
    options.signal?.throwIfAborted()
    let resolution: R | undefined,
      measurements:
        | Readonly<Partial<Record<ResolutionPart<R>, PartMeasurement>>>
        | undefined
    try {
      resolution = await options.resolve(scenario)
      measurements = await options.measure?.(scenario, resolution)
    } catch (error) {
      if (options.signal?.aborted) throw error
      for (const contract of options.contracts)
        record(
          contract,
          scenario,
          resolution,
          'inconclusive',
          'resolution-or-measurement-error',
          { error: error instanceof Error ? error.message : String(error) },
        )
      continue
    }
    for (const contract of options.contracts) {
      if ('when' in contract) {
        if (!Object.hasOwn(scenario.facts, contract.when.fact)) {
          record(
            contract,
            scenario,
            resolution,
            'inconclusive',
            'missing-condition-fact',
            { fact: contract.when.fact },
          )
          continue
        }
        if (scenario.facts[contract.when.fact] !== contract.when.equals) {
          report.skipped++
          continue
        }
      }
      const observed = measurements?.[contract.part],
        style = resolution.output[contract.part]?.style
      if (!style) {
        record(
          contract,
          scenario,
          resolution,
          'inconclusive',
          'missing-part',
          {},
        )
        continue
      }
      let passed: boolean | undefined
      let evidence: Record<string, unknown> = { ...observed }
      const finite = (v: unknown): v is number =>
        typeof v === 'number' && Number.isFinite(v) && v >= 0
      if (contract.kind === 'interaction-size') {
        if (finite(observed?.width) && finite(observed?.height))
          passed =
            observed.width >= contract.minWidth &&
            observed.height >= contract.minHeight
        evidence = {
          ...evidence,
          minWidth: contract.minWidth,
          minHeight: contract.minHeight,
        }
      } else if (contract.kind === 'contrast') {
        const background = contract.backgroundPart ?? contract.part
        const fg = observed?.foreground
        const bg = measurements?.[background]?.background
        const ratio = contrastRatio(fg, bg)
        if (ratio !== undefined) passed = ratio >= contract.minRatio
        evidence = {
          foreground: fg,
          background: bg,
          ratio,
          minRatio: contract.minRatio,
          colorModel: 'opaque-srgb',
        }
      } else if (contract.kind === 'overflow') {
        const values =
          contract.axis === 'x'
            ? [observed?.overflowX]
            : contract.axis === 'y'
              ? [observed?.overflowY]
              : [observed?.overflowX, observed?.overflowY]
        if (values.every(finite))
          passed = values.every((v) => v <= (contract.tolerance ?? 0))
      } else if (contract.kind === 'focus') {
        if (typeof observed?.focusVisible === 'boolean')
          passed = observed.focusVisible
      } else if (finite(observed?.motionDurationMs))
        passed = observed.motionDurationMs <= contract.maxDurationMs
      if (passed === true) report.passed++
      else
        record(
          contract,
          scenario,
          resolution,
          passed === false ? 'fail' : 'inconclusive',
          passed === false
            ? 'policy-violation'
            : 'missing-or-unsupported-evidence',
          evidence,
        )
    }
  }
  report.status = report.failed
    ? 'fail'
    : report.inconclusive || !report.passed
      ? 'inconclusive'
      : 'pass'
  return report
}
