/**
 * The toned scorecard: runs the agent-free gates and prints their numbers.
 *
 *   bun scorecard/scorecard.ts             markdown table, then the JSON
 *   bun scorecard/scorecard.ts --json      JSON only (for the eval harness)
 *   bun scorecard/scorecard.ts --markdown  markdown only
 *   bun scorecard/scorecard.ts --write     also regenerate intents/INTENTS.md
 *
 * The JSON shape is stable: `{ library, version, metrics, details }`, where
 * `metrics` maps a dotted name to a number. Add metrics; never rename one.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

import { buildStyles } from '../build/index.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import { runDeclaredSuite } from './conformance/declared.ts'
import { runMotionSuite } from './conformance/motion.ts'
import { runConformanceSuite } from './conformance/suite.ts'
import { runCorpus } from './corpus/runner.ts'
import { ui } from './fixture/system.ts'
import { intentMetrics, intents, renderIntentTable } from './intents/intents.ts'
import { coreRoot } from './probe.ts'
import { cssRules } from './purity/purity.ts'
import { runPuritySuite } from './purity/suite.ts'

export type Scorecard = {
  library: 'toned'
  version: string
  metrics: Record<string, number>
  details: Record<string, unknown>
}

/** CSS a system pays for one more declared state, measured by difference. */
function cssPerDeclaredState() {
  const gap = defineToken({ values: [1], resolve: (value) => ({ gap: value }) })
  const css = (states: Record<string, string>) =>
    buildStyles(
      defineSystem({ id: 'cost', tokens: { gap }, conditions: { states } }),
      {
        sheets: [],
      },
    ).css
  const one = css({ a: '[data-a]' })
  const two = css({ a: '[data-a]', b: '[data-b]' })
  return {
    bytes: two.length - one.length,
    rules: cssRules(two).length - cssRules(one).length,
  }
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length

export async function runScorecard(): Promise<Scorecard> {
  const corpus = await runCorpus(join(coreRoot, 'scorecard/corpus/cases'))
  const purity = runPuritySuite()
  const conformance = await runConformanceSuite()
  const declared = await runDeclaredSuite()
  const motion = await runMotionSuite()
  const css = buildStyles(ui, { sheets: [] }).css
  const perState = cssPerDeclaredState()
  const count = <T>(items: readonly T[], test: (item: T) => boolean) =>
    items.filter(test).length
  const { version } = JSON.parse(
    readFileSync(join(coreRoot, 'package.json'), 'utf8'),
  )
  const spellings = intentMetrics()

  return {
    library: 'toned',
    version,
    metrics: {
      'corpus.cases': corpus.length,
      'corpus.compile': count(corpus, (c) => c.stage === 'compile'),
      'corpus.build': count(corpus, (c) => c.stage === 'build'),
      'corpus.runtime': count(corpus, (c) => c.stage === 'runtime'),
      'corpus.silent': count(corpus, (c) => c.stage === 'silent'),
      'corpus.namesFix': count(corpus, (c) => c.namesFix),
      'corpus.compileOrBuildNamingFix': count(
        corpus,
        (c) => (c.stage === 'compile' || c.stage === 'build') && c.namesFix,
      ),
      'corpus.regressions': count(corpus, (c) => c.regressed),
      'intents.count': spellings.intents,
      'intents.withOneSpelling': spellings.intentsWithOneSpelling,
      'intents.spellingsTotal': spellings.spellingsTotal,
      'intents.spellingsMean': spellings.spellingsMean,
      'intents.spellingsMax': spellings.spellingsMax,
      'purity.mutations': purity.length,
      'purity.pure': count(purity, (p) => p.pure),
      'purity.impure': count(purity, (p) => !p.pure),
      'conformance.cells': conformance.length,
      'conformance.works': count(conformance, (c) => c.outcome === 'works'),
      'conformance.rejected': count(
        conformance,
        (c) => c.outcome === 'rejected',
      ),
      'conformance.typeErrors': count(
        conformance,
        (c) => c.outcome === 'type-error',
      ),
      'css.fixtureBytes': css.length,
      'css.fixtureGzipBytes': gzipSync(css).length,
      'css.bytesPerDeclaredState': perState.bytes,
      'css.rulesPerDeclaredState': perState.rules,
      'docs.coreReadmeWords': words(
        readFileSync(join(coreRoot, 'README.md'), 'utf8'),
      ),
      // Added after the first release of the scorecard: appended, never renamed.
      'corpus.lint': count(corpus, (c) => c.stage === 'lint'),
      'conformance.declared.cells': declared.length,
      'conformance.declared.works': count(
        declared,
        (c) => c.outcome === 'works',
      ),
      'conformance.declared.rejected': count(
        declared,
        (c) => c.outcome === 'rejected',
      ),
      'conformance.declared.typeErrors': count(
        declared,
        (c) => c.outcome === 'type-error',
      ),
      'conformance.motion.cells': motion.length,
      'conformance.motion.works': count(motion, (c) => c.outcome === 'works'),
      'conformance.motion.rejected': count(
        motion,
        (c) => c.outcome === 'rejected',
      ),
      'conformance.motion.typeErrors': count(
        motion,
        (c) => c.outcome === 'type-error',
      ),
    },
    details: {
      corpus: corpus.map(({ reports: _reports, ...result }) => result),
      intents,
      purity: purity.map((p) => ({
        id: p.id,
        description: p.description,
        pure: p.pure,
        changed: p.changes.map((change) => change.output),
      })),
      conformance,
      declaredConformance: declared,
      motionConformance: motion,
    },
  }
}

const mark = (value: boolean) => (value ? 'yes' : 'no')

export function renderMarkdown(card: Scorecard): string {
  const corpus = card.details['corpus'] as Awaited<ReturnType<typeof runCorpus>>
  const conformance = card.details['conformance'] as Awaited<
    ReturnType<typeof runConformanceSuite>
  >
  const purity = card.details['purity'] as {
    id: string
    pure: boolean
    changed: string[]
  }[]
  const declared = (card.details['declaredConformance'] ??
    []) as typeof conformance
  const motion = (card.details['motionConformance'] ?? []) as typeof conformance
  const matrix = (cells: typeof conformance) => {
    const targets = [...new Set(cells.map((c) => c.target))]
    const features = [...new Set(cells.map((c) => c.feature))]
    const cellOf = (feature: string, target: string) =>
      cells.find((c) => c.feature === feature && c.target === target)
        ?.outcome ?? ''
    return [
      `| Feature | ${targets.join(' | ')} |`,
      `| --- | ${targets.map(() => '---').join(' | ')} |`,
      ...features.map(
        (f) => `| ${f} | ${targets.map((t) => cellOf(f, t)).join(' | ')} |`,
      ),
    ]
  }
  return [
    `# Toned scorecard (${card.version})`,
    '',
    '| Metric | Value |',
    '| --- | --- |',
    ...Object.entries(card.metrics).map(
      ([name, value]) => `| ${name} | ${value} |`,
    ),
    '',
    '## Mistake corpus',
    '',
    '| Case | Category | Stage | Names the fix | Baseline |',
    '| --- | --- | --- | --- | --- |',
    ...corpus.map(
      (c) =>
        `| ${c.id} | ${c.category} | ${c.stage} | ${mark(c.namesFix)} | ${c.baseline.stage}${c.regressed ? ' (regressed)' : c.improved ? ' (improved)' : ''} |`,
    ),
    '',
    '## Build purity',
    '',
    '| Mutation | Pure | Outputs changed |',
    '| --- | --- | --- |',
    ...purity.map(
      (p) => `| ${p.id} | ${mark(p.pure)} | ${p.changed.join(', ') || '—'} |`,
    ),
    '',
    '## Target conformance',
    '',
    ...matrix(conformance),
    '',
    '## Declared-target conformance',
    '',
    'Each feature in a system that declares only that target (`targets: [t]`).',
    '',
    ...matrix(declared),
    '',
    '## Motion conformance',
    '',
    'Motion declared with `defineMotion` for a system that declares only that target, stepped with a test clock.',
    '',
    ...matrix(motion),
    '',
  ].join('\n')
}

if (import.meta.main) {
  const args = new Set(process.argv.slice(2))
  if (args.has('--write')) {
    const doc = join(coreRoot, 'scorecard/intents/INTENTS.md')
    writeFileSync(doc, renderIntentTable())
    // Format as the repository does; the doc test ignores table padding.
    spawnSync(join(coreRoot, '../../node_modules/.bin/oxfmt'), [doc])
  }
  const card = await runScorecard()
  const json = JSON.stringify(card, null, 2)
  if (args.has('--json')) console.log(json)
  else if (args.has('--markdown')) console.log(renderMarkdown(card))
  else console.log(`${renderMarkdown(card)}\n\`\`\`json\n${json}\n\`\`\``)
}
