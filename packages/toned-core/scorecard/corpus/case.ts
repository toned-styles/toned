/**
 * One entry of the mistake corpus: a mistake an author (often an agent) makes,
 * written the way they write it, plus what toned did with it when it was
 * recorded. The runner measures the stage again on every run; the recorded
 * `baseline` only says how far it may regress.
 *
 * A case is one file in `cases/`. It must compile on its own except for the
 * mistake itself, because every TypeScript diagnostic in the file counts as
 * the compiler catching it.
 */
import type { TokenSystem } from '../../system/index.ts'

/**
 * Earliest stage at which a mistake is reported, best first. `lint` is toned's
 * lint plugin (`@toned/eslint-plugin`, recommended rules): static like the
 * compiler, but only where an application runs it, so it ranks after it.
 */
export const STAGES = ['compile', 'lint', 'build', 'runtime', 'silent'] as const
export type Stage = (typeof STAGES)[number]

export type CaseCategory =
  | 'tokens'
  | 'css'
  | 'conditions'
  | 'composition'
  | 'bridges'
  | 'variables'
  | 'cascade'
  | 'outputs'
  | 'platform'
  | 'motion'

export type Baseline = {
  stage: Stage
  /** Whether the first report at that stage named the fix. */
  namesFix: boolean
}

export type CorpusCase = {
  id: string
  description: string
  category: CaseCategory
  /** What toned did when the case was recorded. */
  baseline: Baseline
  /**
   * Text a report must contain to count as naming the fix: the right
   * spelling, the declared set, or the construct to use instead.
   */
  fix: string | RegExp
  /** Defaults to the fixture system. */
  // oxlint-disable-next-line typescript/no-explicit-any -- any system shape
  system?: TokenSystem<any>
  /** Builds the case's stylesheets; runs at runtime (construction). */
  sheets?: () => readonly unknown[]
  /** Extra runtime probe after the build and the web resolve. */
  exercise?: () => unknown
}

export const defineCase = (value: CorpusCase): CorpusCase => value
