import { expect, test } from 'vitest'
import { defineSystem, defineTokenFor } from '../index.ts'
import { assertBuildArtifact, buildStyles, generateThemes } from './index.ts'

type Theme = { surface: string; ink: string; unit: number }
const token = defineTokenFor<Theme>()
const tokens = {
  fill: token({
    values: ['surface'],
    resolve: (_value, theme) => ({ backgroundColor: theme.surface }),
  }),
  text: token({
    values: ['ink'],
    resolve: (_value, theme) => ({ color: theme.ink }),
  }),
}
const themes = {
  modern: { surface: '#fff', ink: '#111', unit: 4 },
  dos: { surface: '#0000aa', ink: '#ffff55', unit: 8 },
}
const ui = defineSystem({ id: 'demo', tokens, themes })
const sheet = ui.stylesheet({ Root: { fill: 'surface', text: 'ink' } })

test('a declared theme is built: classes read variables the build defines', () => {
  const { css } = buildStyles(ui, { sheets: [sheet] })
  // What a class reads…
  expect(css).toContain('var(--demo-surface)')
  // …the build now supplies: the first theme by default, every theme by name.
  expect(css).toContain(
    ':root { --demo-surface: #fff; --demo-ink: #111; --demo-unit: 4; }',
  )
  expect(css).toContain(
    "[data-theme='modern'] { --demo-surface: #fff; --demo-ink: #111; --demo-unit: 4; }",
  )
  expect(css).toContain(
    "[data-theme='dos'] { --demo-surface: #0000aa; --demo-ink: #ffff55; --demo-unit: 8; }",
  )
})

test('the default theme can be chosen, and stays selectable inside another theme', () => {
  const css = generateThemes(ui, { default: 'dos' })
  expect(css).toContain(':root { --demo-surface: #0000aa;')
  expect(css).toContain("[data-theme='dos'] { --demo-surface: #0000aa;")
  expect(css).toContain("[data-theme='modern'] { --demo-surface: #fff;")
  expect(() => generateThemes(ui, { default: 'paper' })).toThrow(
    /default theme 'paper' is not declared/,
  )
})

test('themes follow the build scope and layer, and can be left out', () => {
  expect(generateThemes(ui, { scope: '.app' })).toContain(
    ".app[data-theme='dos'], .app [data-theme='dos'] { --demo-surface: #0000aa;",
  )
  expect(generateThemes(ui, { scope: '.app' })).toMatch(/^\.app \{ --demo-/)
  const layered = buildStyles(ui, { sheets: [sheet], layer: 'components' }).css
  expect(layered).toMatch(/@layer components \{\n:root \{ --demo-surface/)
  expect(buildStyles(ui, { sheets: [sheet], themes: false }).css).not.toContain(
    'data-theme',
  )
})

test('the published fingerprint covers the theme CSS', () => {
  const artifact = buildStyles(ui, { sheets: [sheet] })
  expect(() => assertBuildArtifact(artifact)).not.toThrow()
  expect(artifact.manifest.fingerprint).not.toBe(
    buildStyles(ui, { sheets: [sheet], themes: false }).manifest.fingerprint,
  )
})

test('only values CSS variables can carry are emitted; unsafe ones are refused', () => {
  const nested = defineSystem({
    id: 'nested',
    tokens: {},
    themes: { day: { colors: { primary: '#246' }, gap: '4px' } },
  })
  // A nested group cannot be read through a CSS variable, so it is not emitted.
  expect(generateThemes(nested)).toBe(
    ":root { --nested-gap: 4px; }\n[data-theme='day'] { --nested-gap: 4px; }",
  )
  const unsafe = defineSystem({
    id: 'unsafe',
    tokens: {},
    themes: { day: { gap: '4px; } body { display: none' } },
  })
  expect(() => generateThemes(unsafe)).toThrow(
    /cannot be written as a CSS value/,
  )
  const quoted = defineSystem({
    id: 'quoted',
    tokens: {},
    themes: { dos: { before: '"[ ; { "' } },
  })
  expect(generateThemes(quoted)).toContain('--quoted-before: "[ ; { ";')
  expect(generateThemes(defineSystem({ id: 'plain', tokens: {} }))).toBe('')
})
