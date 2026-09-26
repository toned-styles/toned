import { expect, test } from 'vitest'
import {
  exportDtcg,
  importDtcg,
  mapDtcgTokens,
  resolveDtcgContext,
} from './index.ts'

test('groups, aliases, descriptions and vendor extensions roundtrip without flattening', () => {
  const input = {
    $description: 'system',
    color: {
      $type: 'color',
      $extensions: { 'example.org': { note: true } },
      ink: {
        $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 1 },
        $description: 'ink',
      },
      text: { $value: '{color.ink}', $deprecated: 'use ink' },
    },
    gap: { $type: 'dimension', $root: { $value: { value: 4, unit: 'px' } } },
  }
  const library = importDtcg(input)
  expect(library.diagnostics).toEqual([])
  expect(
    library.tokens.find((t) => t.path.join('.') === 'color.text')?.value,
  ).toEqual(input.color.ink.$value)
  expect(exportDtcg(library)).toEqual(input)
  input.color.ink.$value.components[0] = 1
  expect(library.tokens[0]?.value).toMatchObject({ components: [0, 0, 0] })
})

test('chained aliases infer types and malformed graphs diagnose missing, circular and mismatched references', () => {
  const valid = importDtcg({
    a: { $value: '{b}' },
    b: { $value: '{c}' },
    c: { $type: 'number', $value: 3 },
  })
  expect(valid.resolved).toBe(true)
  expect(valid.tokens.map((t) => t.value)).toEqual([3, 3, 3])
  const broken = importDtcg({
    a: { $type: 'number', $value: '{b}' },
    b: { $type: 'number', $value: '{a}' },
    missing: { $value: '{none}' },
    wrong: { $type: 'dimension', $value: '{number}' },
    number: { $type: 'number', $value: 4 },
  })
  expect(broken.resolved).toBe(false)
  expect(new Set(broken.diagnostics.map((d) => d.code))).toEqual(
    new Set([
      'circular-reference',
      'missing-reference',
      'invalid-token',
      'type-mismatch',
    ]),
  )
})

test('unsupported constructs retain source data but cannot be silently mapped to a theme', () => {
  const input = {
    group: {
      $extends: '{other}',
      token: { $type: 'shadow', $value: { blur: 2 } },
    },
    color: {
      $type: 'color',
      $value: { colorSpace: 'display-p3', components: [1, 0, 0] },
    },
    ref: { $type: 'number', $value: { $ref: '#/number/$value' } },
  }
  const library = importDtcg(input)
  expect(library.resolved).toBe(false)
  expect(exportDtcg(library)).toEqual(input)
  expect(() =>
    mapDtcgTokens(library, (t) => [t.path.join('.'), t.value]),
  ).toThrow('diagnostics')
})

test('mapping is explicit, receives resolved values and rejects duplicate target names', () => {
  const library = importDtcg({
    small: { $type: 'number', $value: 2 },
    large: { $type: 'number', $value: 8 },
  })
  expect(mapDtcgTokens(library, (t) => [t.path[0]!, t.value])).toEqual({
    small: 2,
    large: 8,
  })
  expect(() => mapDtcgTokens(library, (t) => ['same', t.value])).toThrow(
    'duplicate',
  )
})

test('JSON boundaries reject cycles, executable values and excessive depth', () => {
  const cyclic: Record<string, unknown> = {}
  cyclic['self'] = cyclic
  expect(() => importDtcg(cyclic)).toThrow('cyclic')
  expect(() => importDtcg({ value: () => 1 })).toThrow('JSON')
  const accessor = {
    get token() {
      throw new Error('must not execute')
    },
  }
  expect(() => importDtcg(accessor)).toThrow('accessors')
  let deep: unknown = {}
  for (let i = 0; i < 70; i++) deep = { next: deep }
  expect(() => importDtcg(deep)).toThrow('budget')
})

test('one finite resolver context applies ordered sets, sources, defaults and aliases after overrides', () => {
  const document = {
    version: '2025.10',
    sets: { base: { sources: [{ $ref: 'base.json' }] } },
    modifiers: {
      theme: {
        contexts: {
          light: [],
          dark: [{ ink: { $type: 'number', $value: 2 } }],
        },
        default: 'light',
      },
    },
    resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
  }
  const sources = {
    'base.json': {
      ink: { $type: 'number', $value: 1 },
      alias: { $value: '{ink}' },
    },
  }
  const dark = resolveDtcgContext(document, {
    context: { theme: 'dark' },
    sources,
  })
  expect(dark.resolved).toBe(true)
  expect(dark.library.tokens.map((t) => t.value)).toEqual([2, 2])
  const light = resolveDtcgContext(document, { sources })
  expect(light.context).toEqual({ theme: 'light' })
  expect(light.library.tokens.map((t) => t.value)).toEqual([1, 1])
})

test('resolver contexts never fetch missing sources and circular sets are diagnosed', () => {
  const unresolved = resolveDtcgContext({
    version: '2025.10',
    sets: {
      missing: { sources: [{ $ref: 'https://example.invalid/tokens.json' }] },
    },
    resolutionOrder: [{ $ref: '#/sets/missing' }],
  })
  expect(unresolved.diagnostics[0]?.code).toBe('missing-reference')
  const circular = resolveDtcgContext({
    version: '2025.10',
    sets: { a: { sources: [{ $ref: '#/sets/a' }] } },
    resolutionOrder: [{ $ref: '#/sets/a' }],
  })
  expect(circular.diagnostics[0]?.code).toBe('circular-reference')
})

test('partial resolver context and unsupported reference overrides cannot be mapped as complete data', () => {
  const document = {
    version: '2025.10',
    sets: {
      base: {
        sources: [
          { number: { $type: 'number', $value: 1 } },
          { $ref: 'missing.json' },
        ],
      },
    },
    resolutionOrder: [{ $ref: '#/sets/base' }],
  }
  const result = resolveDtcgContext(document)
  expect(result.library.tokens).toHaveLength(1)
  expect(result.library.resolved).toBe(false)
  expect(() =>
    mapDtcgTokens(result.library, (token) => [
      token.path.join('.'),
      token.value,
    ]),
  ).toThrow('diagnostics')
  const overrides = resolveDtcgContext({
    version: '2025.10',
    sets: { base: { sources: [] } },
    resolutionOrder: [{ $ref: '#/sets/base', sources: [] }],
  })
  expect(overrides.diagnostics[0]?.code).toBe('unsupported-feature')
  expect(
    exportDtcg(
      importDtcg({ token: { $type: 'number', $value: 1, $description: 7 } }),
    )['token'],
  ).toBeDefined()
})
