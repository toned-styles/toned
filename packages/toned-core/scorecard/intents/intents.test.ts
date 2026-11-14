import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

import { ui } from '../fixture/system.ts'
import {
  intentMetrics,
  intents,
  normaliseTable,
  renderIntentTable,
  spellingsOf,
} from './intents.ts'

describe('intent table', () => {
  test('ids are unique and every intent has a canonical spelling', () => {
    expect(new Set(intents.map((i) => i.id)).size).toBe(intents.length)
    for (const intent of intents) expect(intent.canonical.spelling).not.toBe('')
  })

  test('removed spellings and errors are listed but not counted', () => {
    const derive = intents.find((i) => i.id === 'derive-sheet')
    expect(derive && spellingsOf(derive)).toBe(1)
    const platform = intents.find((i) => i.id === 'platform-block')
    expect(platform?.aliases.map((a) => a.status)).toEqual(['error', 'error'])
    expect(platform && spellingsOf(platform)).toBe(1)
  })

  test('the stack review baselines are what the table computes', () => {
    const count = (id: string) => {
      const intent = intents.find((i) => i.id === id)
      return intent && spellingsOf(intent)
    }
    expect(count('web-only-value')).toBe(2)
    expect(count('platform-block')).toBe(1)
    expect(count('compose-fragments')).toBe(1)
    expect(count('hover-gating')).toBe(4)
    expect(count('ancestor-hover')).toBe(3)
    // The raw bridge variable is a lint error now (toned/prefer-bridge-key).
    expect(count('placeholder-colour')).toBe(2)
    expect(count('component-option')).toBe(2)
    expect(intentMetrics().spellingsMax).toBe(4)
  })

  test('each condition intent has one spelling: the string key', () => {
    for (const id of [
      'media-condition',
      'container-condition',
      'compound-condition',
      'ancestor-state',
      'platform-block',
    ]) {
      const intent = intents.find((i) => i.id === id)
      expect(intent?.canonical.spelling, id).not.toMatch(/^\[q\./)
      expect(intent && spellingsOf(intent), id).toBe(1)
    }
  })

  test('the platform alias note matches what the query builder returns', () => {
    // q.platform returns the canonical spelling; the alias is an error.
    expect(ui.q.platform('web')).toBe('@platform web')
  })

  test('INTENTS.md is generated from the table', () => {
    const doc = readFileSync(new URL('./INTENTS.md', import.meta.url), 'utf8')
    expect(
      normaliseTable(doc),
      'run `bun scorecard/scorecard.ts --write` in packages/toned-core',
    ).toBe(normaliseTable(renderIntentTable()))
  })
})
