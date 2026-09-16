/** Deterministic comparative microbenchmark; timing is evidence, never a test gate. */
import { performance } from 'node:perf_hooks'
import { pathToFileURL } from 'node:url'
import { StyleMatcher } from '../packages/toned-core/stylesheet/StyleMatcher.ts'

const baselinePath = process.argv[2]
if (!baselinePath)
  throw new Error('Pass the extracted checkpoint StyleMatcher.ts path')
const Baseline = (await import(pathToFileURL(baselinePath).href))
  .StyleMatcher as typeof StyleMatcher

type Props = Record<string, string>
type Style = Record<string, string | number>
function fixture(axes: number, values: number) {
  const clauses: { matches: Props; style: Style }[] = []
  for (let axis = 0; axis < axes; axis++) {
    for (let value = 0; value < values; value++)
      clauses.push({
        matches: { [`axis${axis}`]: `v${value}` },
        style: { [`field${axis}`]: value, shared: `${axis}:${value}` },
      })
  }
  clauses.push({
    matches: { axis0: 'v0', axis1: 'v1' },
    style: { shared: 'compound' },
  })
  const rules = Object.fromEntries(
    clauses.map((clause) => [
      Object.entries(clause.matches)
        .map(([key, value]) => `[${key}=${value}]`)
        .join(''),
      { Root: clause.style },
    ]),
  )
  const states: Props[] = Array.from({ length: 512 }, (_, index) => {
    const props: Props = {}
    // Deterministic axis values, with every bit position exercised.
    let word = (index + 1) * 2654435761
    for (let axis = 0; axis < axes; axis++) {
      props[`axis${axis}`] = `v${(word >>> 0) % values}`
      word = Math.imul(word ^ (word >>> 13), 1597334677)
    }
    return props
  })
  const reference = (props: Props): Style => {
    const result: Style = {}
    for (const clause of clauses) {
      if (
        Object.entries(clause.matches).every(
          ([key, value]) => props[key] === value,
        )
      )
        Object.assign(result, clause.style)
    }
    return result
  }
  return { rules, states, reference }
}

let sink: unknown
function measure(iterations: number, run: (iteration: number) => unknown) {
  for (let i = 0; i < Math.min(500, iterations); i++) sink = run(i)
  const samples: number[] = []
  for (let round = 0; round < 7; round++) {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) sink = run(i)
    samples.push(((performance.now() - start) * 1000) / iterations)
  }
  samples.sort((a, b) => a - b)
  return {
    median_us: Number(samples[3]!.toFixed(3)),
    min_us: Number(samples[0]!.toFixed(3)),
    max_us: Number(samples[6]!.toFixed(3)),
  }
}

const results = []
for (const [name, axes, values] of [
  ['small-16-facts', 4, 4],
  ['large-80-facts', 10, 8],
] as const) {
  const data = fixture(axes, values)
  for (const [version, Matcher] of [
    ['checkpoint', Baseline],
    ['current', StyleMatcher],
  ] as const) {
    const matcher = new Matcher(data.rules)
    const matched = data.states.map((state) => matcher.match(state))
    const mismatches = data.states.filter((state, index) => {
      const actual = matched[index].Root ?? {}
      const expected = data.reference(state)
      return (
        Object.keys(actual).length !== Object.keys(expected).length ||
        Object.entries(expected).some(([key, value]) => actual[key] !== value)
      )
    }).length
    results.push({
      fixture: name,
      version,
      facts: axes * values,
      rules: Object.keys(data.rules).length,
      reference_mismatches: mismatches,
      compile: measure(500, () => new Matcher(data.rules)),
      cache_hit: measure(30000, (index) =>
        matcher.match(data.states[index % data.states.length]!),
      ),
      uncached_match: measure(10000, (index) => {
        matcher.cache.clear()
        return matcher.match(data.states[index % data.states.length]!)
      }),
      membership_equal: measure(30000, (index) =>
        matcher.isEqual(
          'Root',
          matched[index % matched.length],
          matched[(index + 1) % matched.length],
        ),
      ),
      reference_evaluator: measure(10000, (index) =>
        data.reference(data.states[index % data.states.length]!),
      ),
    })
  }
}
console.log(
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      runtime: process.versions,
      rounds: 7,
      units: 'microseconds per operation; median/min/max',
      note: 'Matcher only. Does not measure React renders, host writes, layout, or device performance. A baseline with reference mismatches is not a valid faster implementation.',
      results,
    },
    null,
    2,
  ),
)
void sink
