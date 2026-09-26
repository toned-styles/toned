import type { Variants } from '@toned/core'
import {
  defineSystem,
  getConfig,
  overrideSheet,
  SYMBOL_INIT,
} from '@toned/core'
import { defineGrid, fr } from '@toned/core/grid'
import type { Base } from '@toned/core/stylesheet'
import { expect, test } from 'vitest'
import {
  assertStandalonePart,
  standaloneScopeRequirement,
} from './shared-scope.ts'

const system = defineSystem({ id: 'scope-requirements', tokens: {} })
function controller(
  sheet: { [SYMBOL_INIT]: (config: Base['config']) => unknown },
  platform: 'web' | 'native' = 'web',
) {
  return sheet[SYMBOL_INIT]({
    ...getConfig(),
    platform,
    getTokens: () => ({}),
    useClassName: false,
    mediaMode: false,
    pseudoMode: 'runtime',
  }) as Base
}

test('local states and unrelated parts can render independently', () => {
  const instance = controller(
    system.stylesheet({
      Root: { ':hover': { $style: { opacity: 0.5 } } },
      Label: { $style: { opacity: 1 } },
    }),
  )
  expect(standaloneScopeRequirement(instance, 'Root')).toBeUndefined()
  expect(standaloneScopeRequirement(instance, 'Label')).toBeUndefined()
  expect(() => assertStandalonePart(instance, 'Root')).not.toThrow()
})

test('cross-part predicates require both their source and styled target', () => {
  const sheet = system
    .stylesheet({ Root: {}, Label: {}, Independent: {} })
    .extend({
      [system.q.not(system.q.part('Root').state('hover'))]: {
        Label: { $style: { opacity: 0.5 } },
      },
    })
  const instance = controller(sheet)
  expect(standaloneScopeRequirement(instance, 'Root')).toMatch(/Root and Label/)
  expect(standaloneScopeRequirement(instance, 'Label')).toMatch(
    /Root and Label/,
  )
  expect(standaloneScopeRequirement(instance, 'Independent')).toBeUndefined()
  expect(() => assertStandalonePart(instance, 'Root')).toThrowError(
    expect.objectContaining({ name: 'TonedMissingScopeError' }),
  )
})

test('relations include both topology participants and an independent styled target', () => {
  const sheet = system
    .stylesheet({ Root: {}, Item: {}, Label: {}, Independent: {} })
    .extend({
      [system.q.part('Root').has('Item', 'hover', { scope: 'child' })]: {
        Label: { $style: { opacity: 0.5 } },
      },
    })
  const instance = controller(sheet)
  for (const part of ['Root', 'Item', 'Label'])
    expect(standaloneScopeRequirement(instance, part)).toMatch(/Root and Item/)
  expect(standaloneScopeRequirement(instance, 'Independent')).toBeUndefined()
})

test('legacy ancestor and sibling state channels require the actual source part', () => {
  for (const source of ['Root:hover', 'Root~:hover']) {
    const instance = controller(
      system.stylesheet({
        Root: {},
        Label: {},
        [source]: { Label: { $style: { opacity: 0.5 } } },
      }),
    )
    expect(standaloneScopeRequirement(instance, 'Root')).toBeDefined()
    expect(standaloneScopeRequirement(instance, 'Label')).toBeDefined()
  }
})

test('foreign platform branches cannot require scope on the current platform', () => {
  const sheet = system.stylesheet({ Root: {}, Label: {} }).extend({
    [system.q.all(
      system.q.platform('native'),
      system.q.part('Root').state('hover'),
    )]: { Label: { $style: { opacity: 0.5 } } },
  })
  expect(
    standaloneScopeRequirement(controller(sheet, 'web'), 'Label'),
  ).toBeUndefined()
  expect(
    standaloneScopeRequirement(controller(sheet, 'native'), 'Label'),
  ).toBeDefined()
})

test('ownership is structural even when a variant-dependent relationship is inactive', () => {
  const sheet = system
    .stylesheet({ Root: {}, Label: {} })
    .variants(($: Variants<{ linked: boolean }>, q) => ({
      [q.all($.linked(true), q.part('Root').state('hover'))]: {
        Label: { $style: { opacity: 0.5 } },
      },
    }))
  expect(standaloneScopeRequirement(controller(sheet), 'Label')).toBeDefined()
})

test('override additions and removals determine the effective ownership contract', () => {
  const base = system.stylesheet({ Root: {}, Label: {} })
  const added = overrideSheet(base, {
    'Root:hover': { Label: { $style: { opacity: 0.5 } } },
  })
  expect(standaloneScopeRequirement(controller(base), 'Label')).toBeUndefined()
  expect(standaloneScopeRequirement(controller(added), 'Root')).toBeDefined()
  const removed = overrideSheet(added, {
    'Root:hover': { Label: { $style: { opacity: null } } },
  })
  expect(
    standaloneScopeRequirement(controller(removed), 'Root'),
  ).toBeUndefined()
})

test('effective grid owner and area registrations require scope, unrelated parts do not', () => {
  const grid = defineGrid('scope-layout', {
    columns: [fr(1)],
    areas: [['body']],
  })
  const sheet = system.stylesheet({
    Root: { '@platform web': { $grid: grid } },
    Body: { '@platform web': { $area: grid.area('body') } },
    Independent: {},
  })
  const instance = controller(sheet)
  expect(standaloneScopeRequirement(instance, 'Root')).toMatch(/\$grid/)
  expect(standaloneScopeRequirement(instance, 'Body')).toMatch(/\$area/)
  expect(standaloneScopeRequirement(instance, 'Independent')).toBeUndefined()
  const removed = overrideSheet(sheet, {
    Root: { '@platform web': { $grid: null } },
    Body: { '@platform web': { $area: null } },
  })
  expect(
    standaloneScopeRequirement(controller(removed), 'Root'),
  ).toBeUndefined()
  expect(
    standaloneScopeRequirement(controller(removed), 'Body'),
  ).toBeUndefined()
})
