export type ScenarioValue = string | number | boolean | null
export interface ScenarioDimensions {
  readonly variants?: Readonly<Record<string, readonly ScenarioValue[]>>
  readonly facts?: Readonly<Record<string, readonly ScenarioValue[]>>
  readonly themes?: readonly string[]
  readonly texts?: readonly string[]
  readonly viewports?: readonly {
    readonly width: number
    readonly height: number
  }[]
}
type AxisValues<T> = {
  readonly [K in keyof T]: T[K] extends readonly (infer V)[] ? V : never
}
export interface Scenario<D extends ScenarioDimensions = ScenarioDimensions> {
  readonly index: string
  readonly variants: AxisValues<NonNullable<D['variants']>>
  readonly facts: AxisValues<NonNullable<D['facts']>>
  readonly theme?: string
  readonly text?: string
  readonly viewport?: { readonly width: number; readonly height: number }
}
export interface ScenarioSuite<S extends Scenario = Scenario> {
  readonly scenarios: readonly S[]
  readonly coverage: {
    readonly kind: 'exhaustive' | 'sampled'
    readonly total: string
    readonly selected: number
    readonly strategy: 'all' | 'evenly-spaced'
    readonly dimensions: readonly {
      readonly name: string
      readonly values: number
    }[]
  }
}

/** Enumerate only the requested budget, without allocating the Cartesian product. */
export function createScenarios<const D extends ScenarioDimensions>(
  dimensions: D,
  options: {
    readonly maxScenarios?: number
    readonly mode?: 'exhaustive' | 'sampled'
  } = {},
): ScenarioSuite<Scenario<D>> {
  const max = options.maxScenarios ?? 256
  if (!Number.isSafeInteger(max) || max < 1 || max > 10000)
    throw new Error(
      'Toned contracts: maxScenarios must be an integer from 1 to 10000',
    )
  type Axis = {
    name: string
    values: readonly unknown[]
    group: 'variants' | 'facts' | 'theme' | 'text' | 'viewport'
    key: string
  }
  const axes: Axis[] = []
  for (const group of ['variants', 'facts'] as const)
    for (const [key, values] of Object.entries(dimensions[group] ?? {})) {
      if (
        !values.every(
          (value) =>
            value === null ||
            typeof value === 'string' ||
            typeof value === 'boolean' ||
            (typeof value === 'number' && Number.isFinite(value)),
        )
      )
        throw new Error(`Toned contracts: invalid value in ${group}.${key}`)
      axes.push({ name: `${group}.${key}`, group, key, values })
    }
  for (const [key, group] of [
    ['themes', 'theme'],
    ['texts', 'text'],
    ['viewports', 'viewport'],
  ] as const) {
    const values = dimensions[key]
    if (values !== undefined) axes.push({ name: key, group, key, values })
  }
  if (axes.length > 64)
    throw new Error('Toned contracts: at most 64 dimensions are supported')
  let total = 1n
  for (const axis of axes) {
    if (
      !Array.isArray(axis.values) ||
      axis.values.length < 1 ||
      axis.values.length > 10000
    )
      throw new Error(
        `Toned contracts: ${axis.name} needs 1 to 10000 finite values`,
      )
    if (
      new Set(axis.values.map((value) => JSON.stringify(value))).size !==
      axis.values.length
    )
      throw new Error(`Toned contracts: duplicate values in ${axis.name}`)
    if (
      axis.group === 'viewport' &&
      !axis.values.every((value) => {
        const viewport = value as { width: number; height: number }
        return (
          Number.isFinite(viewport.width) &&
          viewport.width > 0 &&
          Number.isFinite(viewport.height) &&
          viewport.height > 0
        )
      })
    )
      throw new Error(
        'Toned contracts: viewports need finite positive dimensions',
      )
    if (
      (axis.group === 'theme' || axis.group === 'text') &&
      !axis.values.every((value) => typeof value === 'string')
    )
      throw new Error(`Toned contracts: ${axis.name} needs strings`)
    total *= BigInt(axis.values.length)
  }
  const sampled = total > BigInt(max)
  if (sampled && options.mode !== 'sampled')
    throw new Error(
      `Toned contracts: ${total} scenarios exceed budget ${max}; explicitly request sampled coverage or reduce dimensions`,
    )
  const count = Number(sampled ? BigInt(max) : total)
  const scenarios: Scenario[] = []
  for (let i = 0; i < count; i++) {
    const index =
      sampled && count > 1
        ? (BigInt(i) * (total - 1n)) / BigInt(count - 1)
        : BigInt(i)
    let cursor = index
    const scenario: {
      index: string
      variants: Record<string, ScenarioValue>
      facts: Record<string, ScenarioValue>
      theme?: string
      text?: string
      viewport?: { width: number; height: number }
    } = { index: index.toString(), variants: {}, facts: {} }
    for (let a = axes.length - 1; a >= 0; a--) {
      const axis = axes[a]!
      const value = axis.values[Number(cursor % BigInt(axis.values.length))]
      cursor /= BigInt(axis.values.length)
      if (axis.group === 'variants' || axis.group === 'facts')
        Object.defineProperty(scenario[axis.group], axis.key, {
          value,
          enumerable: true,
        })
      else if (axis.group === 'viewport')
        scenario.viewport = Object.freeze({
          ...(value as { width: number; height: number }),
        })
      else scenario[axis.group] = value as string
    }
    Object.freeze(scenario.variants)
    Object.freeze(scenario.facts)
    scenarios.push(Object.freeze(scenario))
  }
  return Object.freeze({
    scenarios: Object.freeze(scenarios) as readonly Scenario<D>[],
    coverage: Object.freeze({
      kind: sampled ? 'sampled' : 'exhaustive',
      total: total.toString(),
      selected: count,
      strategy: sampled ? 'evenly-spaced' : 'all',
      dimensions: Object.freeze(
        axes.map((axis) =>
          Object.freeze({ name: axis.name, values: axis.values.length }),
        ),
      ),
    }),
  })
}
