import { describe, expect, test } from 'vitest'
import { cssTestValue } from '../backends/css/test-values.test.helpers.ts'
import { generate } from '../dom/generate.ts'
import { defineGrid, fr } from '../grid/index.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { defineSystem, defineToken } from './definers.ts'
import { namespaceCss, namespaceOutput } from './namespace.ts'
import { normalizeDeclarations } from './normalize.ts'

const dynamic = defineToken({
  values: ['base', 'zero', 'wide'] as const,
  resolve: (value) =>
    value === 'base'
      ? { opacity: 1 }
      : value === 'zero'
        ? { opacity: 0 }
        : { width: 20 },
})
describe('conditional property resolution', () => {
  const system = defineSystem(
    { dynamic },
    { breakpoints: { __breakpoints: { md: 768 } } },
  )
  test('zero survives media and pseudo chains', () => {
    const media = system.exec(
      { tokens: {} },
      { dynamic: 'base', '@md_dynamic': 'zero' },
    ).style as Record<string, string>
    const pseudo = system.exec(
      { tokens: {} },
      { dynamic: 'base', ':hover_dynamic': 'zero' },
    ).style as Record<string, string>
    expect(Object.values(media).some((value) => value.endsWith(' 0'))).toBe(
      true,
    )
    expect(Object.values(pseudo).some((value) => value.endsWith(' 0'))).toBe(
      true,
    )
    expect(media['opacity']).toContain('var(')
    expect(pseudo['opacity']).toContain('var(')
  })
  test('later states may introduce new CSS fields without creating missing-field links', () => {
    const style = system.exec(
      { tokens: {} },
      { dynamic: 'base', ':hover_dynamic': 'zero', ':active_dynamic': 'wide' },
    ).style as Record<string, string>
    for (const hover of [false, true])
      for (const active of [false, true]) {
        const toggles = { '--toned_hover': hover, '--toned_active': active }
        expect(cssTestValue(style, 'width', toggles)).toBe(
          active ? '20px' : undefined,
        )
        expect(cssTestValue(style, 'opacity', toggles)).toBe(hover ? '0' : '1')
      }
  })
  test('pseudo toggle generation does not depend on breakpoints', () => {
    expect(generate({ dynamic })).toContain('._:hover')
    expect(generate({ dynamic })).toContain('--toned_hover')
  })
})
describe('declaration normalization', () => {
  test('builders and human aliases have canonical identities', () => {
    const { q } = defineSystem(
      { dynamic },
      {
        breakpoints: { __breakpoints: { md: 768 } },
        containers: { field: { wide: 400 } },
      },
    )
    expect(
      normalizeDeclarations({
        '@media md': {
          '@container field wide': {
            '@platform web': { $style: { opacity: 0 } },
          },
        },
      }),
    ).toEqual({
      [q.media('md')]: {
        [q.container('field', 'wide')]: {
          [q.platform('web')]: { style: { opacity: 0 } },
        },
      },
    })
    expect(q.state('focus-visible')).toBe(':focus-visible')
    expect(q.part('Root').state('hover')).toBe('Root:hover')
    expect(typeof q.all(q.media('md'))).toBe('object')
  })
  test('rejects conflicting or conditional kinds', () => {
    expect(() =>
      normalizeDeclarations({ Root: { $kind: 'view', $$type: 'text' } }),
    ).toThrow('must agree')
    expect(() =>
      normalizeDeclarations({ Root: { ':hover': { $kind: 'text' } } }),
    ).toThrow('static')
  })
  test('grid remains web-only and foreign blocks never execute', () => {
    const grid = defineGrid('card', { areas: [['body']], columns: [fr(1)] })
    const normalized = normalizeDeclarations({
      Root: { '@platform web': { $grid: grid, $area: grid.area('body') } },
    })
    expect(resolvePlatformKeys(normalized, 'native')).toEqual({ Root: {} })
    expect(resolvePlatformKeys(normalized, 'web')).toHaveProperty(
      'Root.style.display',
      'grid',
    )
  })
})
describe('system namespace', () => {
  test('two systems give distinct classes, state parameters, and keyframes', () => {
    const css =
      '.paint_base{opacity:var(--toned_hover)} ._:hover{--toned_hover: ;}@keyframes toned_spin{to{opacity:0.5}}'
    expect(namespaceCss(css, 'one')).toContain('.one--paint_base')
    expect(namespaceCss(css, 'one')).toContain('._:hover{--one-toned_hover: ;}')
    expect(namespaceCss(css, 'one')).toContain('@keyframes one-toned_spin')
    expect(namespaceCss(css, 'one')).toContain('opacity:0.5')
    expect(
      namespaceOutput(
        {
          style: {
            '--toned_hover': 'var(--base)',
            animationName: 'toned_spin',
          },
          className: '_ paint_base',
        },
        'one',
      ),
    ).toEqual({
      style: {
        '--one-toned_hover': 'var(--one-base)',
        animationName: 'one-toned_spin',
      },
      className: '_ one--paint_base',
    })
  })
  test('explicit system descriptors isolate vocabulary and namespace output', () => {
    const system = defineSystem({
      id: 'example',
      tokens: { dynamic },
      conditions: { breakpoints: { __breakpoints: { md: 768 } } },
    })
    expect(system.id).toBe('example')
    expect(system.tokens).not.toHaveProperty('breakpoints')
    expect(Object.isFrozen(system.tokens)).toBe(true)
    expect(
      system.exec({ tokens: {}, useClassName: true }, { dynamic: 'base' })
        .className,
    ).toContain('example--dynamic_base')
    expect(generate(system.system, { id: system.id })).toContain(
      '.example--dynamic_base',
    )
    expect(() => defineSystem({ id: 'Bad ID', tokens: {} })).toThrow(
      'kebab-case',
    )
  })
})

describe('portable threshold contract', () => {
  test('named media/container thresholds share logical pixels and ignore spacing base', () => {
    const create = (base: number) =>
      defineSystem({
        id: 'portable',
        tokens: { dynamic },
        conditions: {
          base,
          breakpoints: { __breakpoints: { md: 400 } },
          containers: { card: { wide: 400 } },
        },
      })
    for (const base of [1, 4, 10]) {
      const system = create(base)
      const css = generate(system.system, { id: system.id })
      expect(css).toContain('@media (min-width: 400px)')
      expect(css).toContain('@container card (min-width: 400px)')
      expect(system.config?.containers.card.wide).toBe('400px')
    }
  })
  test('dynamic and font-relative thresholds fail at construction for JavaScript callers', () => {
    for (const value of ['var(--width)', '25rem', NaN, -1]) {
      expect(() =>
        defineSystem({
          id: 'invalid',
          tokens: {},
          conditions: { containers: { card: { wide: value } } },
        } as any),
      ).toThrow('fixed nonnegative')
    }
  })
  test('configuration snapshots cannot change through caller mutation', () => {
    const config = { containers: { card: { wide: 400 } } }
    const system = defineSystem({ dynamic }, config)
    config.containers.card.wide = 100
    expect(system.config?.containers.card.wide).toBe(400)
    expect(Object.isFrozen(system.config?.containers.card)).toBe(true)
  })
})

test('raw styles are snapshots, not live caller objects', () => {
  const raw = { opacity: 0.4, transform: [{ scale: 1 }] }
  const normalized = normalizeDeclarations({ Root: { $style: raw } }) as any
  raw.opacity = 1
  raw.transform[0]!.scale = 5
  expect(normalized.Root.style.opacity).toBe(0.4)
  expect(normalized.Root.style.transform[0].scale).toBe(1)
  expect(Object.isFrozen(normalized.Root.style)).toBe(true)
})
test('strict descriptors reject unknown facts, while pure declarations read no theme', () => {
  const system = defineSystem({ id: 'checked', tokens: { dynamic } })
  expect(() =>
    system.stylesheet({ Root: { '@mdd': { dynamic: 'zero' } } } as any),
  ).toThrow('undeclared media')
  expect(() =>
    system.stylesheet({ Root: { ':hovver': { dynamic: 'zero' } } } as any),
  ).toThrow('undeclared state')
  expect(system.style({ dynamic: 'base' })).toEqual({ dynamic: 'base' })
  expect(Object.isFrozen(system.style({ dynamic: 'base' }))).toBe(true)
})

test('declared footprints survive immutable construction without resolver probes', () => {
  const token = defineToken({
    values: ['body'],
    properties: ['fontSize', 'lineHeight'],
    resolve: () => {
      throw new Error('actual theme required')
    },
  })
  const system = defineSystem({
    id: 'footprint',
    tokens: { typography: token },
  })
  expect(system.tokens.typography.properties).toEqual([
    'fontSize',
    'lineHeight',
  ])
})

test('pure style snapshots preserve grid and area reference identity', () => {
  const system = defineSystem({ id: 'layout', tokens: {} })
  const grid = defineGrid('layout', { columns: [fr(1)], areas: [['content']] })
  const area = grid.area('content')
  const parent = system.style({ '@platform web': { $grid: grid } })
  const child = system.style({ '@platform web': { $area: area } })
  const parentStyle = resolvePlatformKeys(parent, 'web') as Record<
    string,
    unknown
  >
  const childStyle = resolvePlatformKeys(child, 'web') as Record<
    string,
    unknown
  >
  expect(parentStyle['$grid']).toBe(grid)
  expect(childStyle['$area']).toBe(area)
  expect(parentStyle['style']).toMatchObject({ display: 'grid' })
  expect(childStyle['style']).toMatchObject({
    gridArea: 'a63_6f_6e_74_65_6e_74',
  })
})
