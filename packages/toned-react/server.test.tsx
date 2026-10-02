import { defineSystem, defineToken, type Variants } from '@toned/core'
import { buildStyles } from '@toned/core/build'
import { createWebRenderer } from '@toned/core/server'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'

// The entry a bundler picks under the `react-server` condition.
import {
  createElements,
  registerRenderer,
  StyleOverrides,
  useStyles,
} from './index.server.ts'

const ui = defineSystem({
  id: 'rsc',
  tokens: {
    pad: defineToken({
      values: [1, 2] as const,
      resolve: (padding) => ({ padding }),
    }),
    tone: defineToken({
      values: ['plain', 'loud'] as const,
      resolve: (tone) => ({ color: tone === 'loud' ? 'red' : 'black' }),
    }),
  },
})
const sheet = ui
  .stylesheet({
    Root: { pad: 1 },
    Label: { $kind: 'text', tone: 'plain' },
  })
  .variants(
    ($: Variants<{ size: 's' | 'm' }>) => ({
      [$.size('m')]: { Root: { pad: 2 }, Label: { tone: 'loud' } },
    }),
    { defaults: { size: 's' } },
  )
const plain = ui.stylesheet({ Box: { pad: 1 } })
const renderer = createWebRenderer(ui, {
  manifest: buildStyles(ui, { sheets: [sheet, plain] }).manifest,
})

test('a sheet with no registered renderer names the fix', () => {
  expect(() => useStyles(plain)).toThrow(/registerRenderer\(renderer\)/)
})

test('useStyles resolves outside React, with no hook and no provider', () => {
  registerRenderer(renderer)
  // Called at module level: a hook would throw "Invalid hook call" here.
  const small = useStyles(sheet, { size: 's' })
  const medium = useStyles(sheet, { size: 'm' })
  expect(small.Root.className).toContain('rsc--pad_1')
  expect(medium.Root.className).toContain('rsc--pad_2')
  // The default applies when the variant is left out, as on the client.
  expect(useStyles(sheet, {}).Root.className).toBe(small.Root.className)
  // with() merges host props, as on the client.
  expect(medium.Root.with({ className: 'mine', id: 'x' })).toMatchObject({
    className: `${medium.Root.className} mine`,
    id: 'x',
  })
})

test('a family passes its variants to the parts written inside it', () => {
  registerRenderer(renderer)
  const S = createElements(sheet)
  function Card({ children }: { children: ReactNode }) {
    return <section>{children}</section>
  }
  const html = renderToStaticMarkup(
    <S size="m">
      <Card>
        <S.Root as="article" id="root">
          <S.Label>Hello</S.Label>
        </S.Root>
      </Card>
    </S>,
  )
  // No provider, no wrapper element, the kind's default tag, and the variant.
  expect(html).toMatch(
    /^<section><article class="[^"]*rsc--pad_2[^"]*" id="root"><span class="[^"]*rsc--tone_loud[^"]*">Hello<\/span><\/article><\/section>$/,
  )
  expect(html).not.toContain('tonedVariants')
})

test('a nested family of the same sheet keeps its own variants', () => {
  registerRenderer(renderer)
  const S = createElements(sheet)
  const html = renderToStaticMarkup(
    <S size="m">
      <S.Root>
        <S size="s">
          <S.Root data-inner />
        </S>
      </S.Root>
    </S>,
  )
  expect(html).toMatch(
    /rsc--pad_2[^>]*><div class="[^"]*rsc--pad_1[^"]*" data-inner="true"/,
  )
})

test("a part out of its family's reach says so instead of guessing", () => {
  registerRenderer(renderer)
  const S = createElements(sheet)
  const Inner = () => <S.Root />
  expect(() =>
    renderToStaticMarkup(
      <S size="m">
        <Inner />
      </S>,
    ),
  ).toThrow(/out of its reach/)
})

test('a family without variants renders its parts on their own', () => {
  registerRenderer(renderer)
  const P = createElements(plain)
  expect(renderToStaticMarkup(<P.Box />)).toMatch(
    /^<div class="[^"]*rsc--pad_1[^"]*"><\/div>$/,
  )
})

test('a client-only export says where it belongs', () => {
  expect(() =>
    renderToStaticMarkup(<StyleOverrides value={[]}>x</StyleOverrides>),
  ).toThrow(/"use client"/)
})
