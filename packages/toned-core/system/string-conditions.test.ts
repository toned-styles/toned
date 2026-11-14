/**
 * String condition keys are the canonical spelling; a `q` builder that has a
 * string equivalent is a lint error whose autofix writes the string
 * (`toned/canonical-condition-key`). These pin that each rewrite the fix
 * makes is the same declaration: the same CSS and the same resolved output.
 */
import { describe, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { createWebRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from './index.ts'

const opacity = defineToken({
  values: [0, 0.5, 1] as const,
  resolve: (value) => ({ opacity: value }),
})
const ui = defineSystem({
  id: 'strings',
  tokens: { opacity },
  conditions: {
    media: { md: 768, lg: 1024 },
    containers: { field: { wide: 400 } },
    states: {
      open: { selector: "[data-state='open']", relations: ['ancestor'] },
    },
  },
})

// Untyped on purpose: the pairs are compared at runtime.
const sheet = (rules: unknown) => ui.stylesheet(rules as never)
const output = (rules: unknown) => {
  const built = sheet(rules)
  const { css, manifest } = buildStyles(ui, { sheets: [built] })
  return { css, resolved: createWebRenderer(ui, { manifest }).resolve(built) }
}
const q = ui.q

describe('a q builder and its string form are one declaration', () => {
  test.each([
    [
      'q.state',
      { [q.state('open')]: { opacity: 0 } },
      { ':open': { opacity: 0 } },
    ],
    ['q.media', { [q.media('md')]: { opacity: 0 } }, { '@md': { opacity: 0 } }],
    [
      'q.container',
      { [q.container('field', 'wide')]: { opacity: 0 } },
      { '@field/wide': { opacity: 0 } },
    ],
    [
      'q.platform',
      { [q.platform('web')]: { $style: { cursor: 'pointer' } } },
      { '@platform web': { $style: { cursor: 'pointer' } } },
    ],
    [
      'q.all of media',
      { [q.all(q.media('md'), q.not(q.media('lg')))]: { opacity: 0 } },
      { '@md&!lg': { opacity: 0 } },
    ],
    [
      'q.any of media',
      { [q.any(q.media('md'), q.container('field', 'wide'))]: { opacity: 0 } },
      { '@md|field/wide': { opacity: 0 } },
    ],
    [
      'q.not of media',
      { [q.not(q.media('md'))]: { opacity: 0 } },
      { '@!md': { opacity: 0 } },
    ],
    [
      'q.all of a media and a state',
      { [q.all(q.media('md'), q.state('open'))]: { opacity: 0 } },
      { '@md': { ':open': { opacity: 0 } } },
    ],
    [
      'q.all of states',
      { [q.all(q.state('open'), q.state('hover'))]: { opacity: 0 } },
      { ':open:hover': { opacity: 0 } },
    ],
  ])('%s', (_name, builder, string) => {
    const a = output({ Root: { opacity: 1, ...builder } })
    const b = output({ Root: { opacity: 1, ...string } })
    // The condition is in effect, not dropped by both spellings.
    expect(b.resolved).not.toEqual(output({ Root: { opacity: 1 } }).resolved)
    expect(a.resolved).toEqual(b.resolved)
    expect(a.css).toBe(b.css)
  })

  test('q.part(…).state', () => {
    const a = output({
      Trigger: { opacity: 1 },
      Chevron: { opacity: 1 },
      [q.part('Trigger').state('open')]: { Chevron: { opacity: 0 } },
    })
    const b = output({
      Trigger: { opacity: 1 },
      Chevron: { opacity: 1 },
      'Trigger:open': { Chevron: { opacity: 0 } },
    })
    expect(a.resolved).toEqual(b.resolved)
    expect(a.css).toBe(b.css)
  })
})
