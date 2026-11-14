/**
 * The scorecard's JSON is ingested by the HQ eval harness: its top-level
 * shape and metric names are a contract. Adding a metric is fine (add it
 * here); renaming or removing one breaks the ingest.
 */
import { describe, expect, test } from 'vitest'

import { renderMarkdown, runScorecard } from './scorecard.ts'

const METRICS = [
  'corpus.cases',
  'corpus.compile',
  'corpus.build',
  'corpus.runtime',
  'corpus.silent',
  'corpus.namesFix',
  'corpus.compileOrBuildNamingFix',
  'corpus.regressions',
  'intents.count',
  'intents.withOneSpelling',
  'intents.spellingsTotal',
  'intents.spellingsMean',
  'intents.spellingsMax',
  'purity.mutations',
  'purity.pure',
  'purity.impure',
  'conformance.cells',
  'conformance.works',
  'conformance.rejected',
  'conformance.typeErrors',
  'css.fixtureBytes',
  'css.fixtureGzipBytes',
  'css.bytesPerDeclaredState',
  'css.rulesPerDeclaredState',
  'css.responsiveAtomBytes',
  'css.responsiveAtomGzipBytes',
  'docs.coreReadmeWords',
  'corpus.lint',
  'conformance.declared.cells',
  'conformance.declared.works',
  'conformance.declared.rejected',
  'conformance.declared.typeErrors',
  'conformance.motion.cells',
  'conformance.motion.works',
  'conformance.motion.rejected',
  'conformance.motion.typeErrors',
  'purity.deprecated',
  'purity.deprecatedImpure',
]

describe('scorecard', async () => {
  const card = await runScorecard()

  test('has the stable top-level shape', () => {
    expect(Object.keys(card).sort()).toEqual([
      'details',
      'library',
      'metrics',
      'version',
    ])
    expect(card.library).toBe('toned')
    expect(card.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  test('every metric is a finite number under its stable name', () => {
    expect(Object.keys(card.metrics)).toEqual(METRICS)
    for (const value of Object.values(card.metrics))
      expect(Number.isFinite(value)).toBe(true)
  })

  test('the counts add up', () => {
    const m = card.metrics
    expect(
      (m['corpus.compile'] ?? 0) +
        (m['corpus.lint'] ?? 0) +
        (m['corpus.build'] ?? 0) +
        (m['corpus.runtime'] ?? 0) +
        (m['corpus.silent'] ?? 0),
    ).toBe(m['corpus.cases'])
    expect((m['purity.pure'] ?? 0) + (m['purity.impure'] ?? 0)).toBe(
      m['purity.mutations'],
    )
    expect(
      (m['conformance.works'] ?? 0) +
        (m['conformance.rejected'] ?? 0) +
        (m['conformance.typeErrors'] ?? 0),
    ).toBe(m['conformance.cells'])
    expect(
      (m['conformance.declared.works'] ?? 0) +
        (m['conformance.declared.rejected'] ?? 0) +
        (m['conformance.declared.typeErrors'] ?? 0),
    ).toBe(m['conformance.declared.cells'])
    expect(
      (m['conformance.motion.works'] ?? 0) +
        (m['conformance.motion.rejected'] ?? 0) +
        (m['conformance.motion.typeErrors'] ?? 0),
    ).toBe(m['conformance.motion.cells'])
  })

  test('the JSON round-trips and the markdown names every metric', () => {
    expect(JSON.parse(JSON.stringify(card)).metrics).toEqual(card.metrics)
    const markdown = renderMarkdown(card)
    for (const name of METRICS) expect(markdown).toContain(`| ${name} |`)
  })
})
