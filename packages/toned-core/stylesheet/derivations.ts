/**
 * How a derived stylesheet came to be: the sheet it extends and what the
 * extension said. `sheet.extend()` records one step per call, so a host that
 * restyles a subtree (React's `StyleOverrides`) can replay the same steps over
 * whatever that sheet currently resolves to there.
 */
export interface DerivationStep {
  /** The sheet this one was derived from. */
  readonly from: object
  /** The extension's rules, as authored (an object or a query-builder callback). */
  readonly rules: unknown
  /** The extension's variant rules, as authored. */
  readonly variants?: unknown
  /** Variant defaults the step set. */
  readonly defaults?: Readonly<Record<string, unknown>>
}

const steps = new WeakMap<object, DerivationStep>()

export function recordDerivation(sheet: object, step: DerivationStep): void {
  steps.set(sheet, Object.freeze(step))
}

/** The step that produced `sheet`, or undefined for a sheet written directly. */
export function derivationOf(sheet: object): DerivationStep | undefined {
  return steps.get(sheet)
}

/**
 * The steps that lead from `ancestor` to `sheet`, oldest first, or undefined
 * when `sheet` does not derive from it. An empty list means they are the same.
 */
export function derivationSteps(
  sheet: object,
  ancestor: object,
): readonly DerivationStep[] | undefined {
  const chain: DerivationStep[] = []
  let current: object = sheet
  while (current !== ancestor) {
    const step = steps.get(current)
    if (!step) return undefined
    chain.unshift(step)
    current = step.from
  }
  return chain
}
