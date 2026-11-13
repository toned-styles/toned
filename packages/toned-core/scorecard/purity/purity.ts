/**
 * Build purity: the guarantee that generated CSS and its manifest depend only
 * on the system declaration, so adding, editing or deleting a stylesheet
 * changes no output. This measures it: build once, apply each mutation to
 * the sheet set, build again, and diff.
 */

/** Named sheet factories, standing in for stylesheet modules on disk. */
export type SheetSet = Readonly<Record<string, () => unknown>>

export type BuildOutput = { css: string; manifest: object }

export type OutputChange =
  | { output: 'css'; added: string[]; removed: string[] }
  | { output: 'manifest'; fields: string[] }

export type Mutation = {
  id: string
  description: string
  apply: (sheets: SheetSet) => SheetSet
}

export type PurityResult = {
  id: string
  description: string
  pure: boolean
  changes: OutputChange[]
}

/** Top-level CSS rules (at-rules keep their blocks), in source order. */
export function cssRules(css: string): string[] {
  const rules: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < css.length; index++) {
    const char = css[index]
    if (char === '{') depth++
    else if (char === '}' && --depth === 0) {
      rules.push(css.slice(start, index + 1).trim())
      start = index + 1
    }
  }
  const rest = css.slice(start).trim()
  if (rest) rules.push(rest)
  return rules
}

/** Items in `a` that `b` lacks, counting repeats. */
function missing(a: readonly string[], b: readonly string[]): string[] {
  const counts = new Map<string, number>()
  for (const item of b) counts.set(item, (counts.get(item) ?? 0) + 1)
  return a.filter((item) => {
    const left = counts.get(item) ?? 0
    if (left > 0) counts.set(item, left - 1)
    return left === 0
  })
}

export function diffBuild(
  before: BuildOutput,
  after: BuildOutput,
): OutputChange[] {
  const changes: OutputChange[] = []
  if (before.css !== after.css) {
    const [a, b] = [cssRules(before.css), cssRules(after.css)]
    changes.push({
      output: 'css',
      added: missing(b, a),
      removed: missing(a, b),
    })
  }
  const fields = [
    ...new Set([
      ...Object.keys(before.manifest),
      ...Object.keys(after.manifest),
    ]),
  ]
    .filter(
      (key) =>
        JSON.stringify((before.manifest as Record<string, unknown>)[key]) !==
        JSON.stringify((after.manifest as Record<string, unknown>)[key]),
    )
    .sort()
  if (fields.length) changes.push({ output: 'manifest', fields })
  return changes
}

export function measurePurity(
  build: (sheets: SheetSet) => BuildOutput,
  sheets: SheetSet,
  mutations: readonly Mutation[],
): PurityResult[] {
  const before = build(sheets)
  return mutations.map(({ id, description, apply }) => {
    const changes = diffBuild(before, build(apply(sheets)))
    return { id, description, pure: changes.length === 0, changes }
  })
}
