import { expect, test } from 'vitest'
import {
  includesWorkspaceDirectory,
  includesWorkspaceFile,
} from '../workspace.ts'
import { parseWorkspaceOptions } from './options.ts'

test('workspace options bound directory scope without accepting escaping paths', () => {
  expect(parseWorkspaceOptions(undefined)).toEqual({})
  expect(
    parseWorkspaceOptions({
      toned: {
        include: ['lib/ui', 'app/hq'],
        modules: { '@lib/*': ['lib/*'] },
      },
    }),
  ).toEqual({ include: ['lib/ui', 'app/hq'], modules: { '@lib/*': ['lib/*'] } })
  for (const include of [
    ['../outside'],
    ['/tmp'],
    ['lib/../app'],
    [],
    Array(33).fill('lib'),
  ])
    expect(() => parseWorkspaceOptions({ toned: { include } })).toThrow()
  expect(() => parseWorkspaceOptions({ toned: { modules: [] } })).toThrow()
})

test('the same scope selects traversal, source files and watched updates', () => {
  const root = 'file:///repo',
    include = ['lib/ui', 'app/hq']
  expect(includesWorkspaceDirectory(root, 'file:///repo/lib', include)).toBe(
    true,
  )
  expect(
    includesWorkspaceDirectory(root, 'file:///repo/lib/ui/parts', include),
  ).toBe(true)
  expect(
    includesWorkspaceDirectory(root, 'file:///repo/lib/other', include),
  ).toBe(false)
  expect(
    includesWorkspaceFile(root, 'file:///repo/lib/ui/card.tsx', include),
  ).toBe(true)
  expect(
    includesWorkspaceFile(root, 'file:///repo/lib/ui-other/card.tsx', include),
  ).toBe(false)
  expect(
    includesWorkspaceFile(root, 'file:///repo/lib/ui/dist/card.js', include),
  ).toBe(false)
  expect(
    includesWorkspaceFile(root, 'file:///repo/lib/ui/card.test.tsx', include),
  ).toBe(false)
})

test('dot segments in accepted include paths are canonical before traversal and file matching', () => {
  const { include } = parseWorkspaceOptions({
    toned: { include: ['./src', 'src/./ui', './src/.', '.', './.'] },
  })
  expect(include).toEqual(['src', 'src/ui', '.'])
  const narrow = parseWorkspaceOptions({
    toned: { include: ['./src/./ui/.'] },
  }).include
  expect(narrow).toEqual(['src/ui'])
  expect(
    includesWorkspaceDirectory('file:///repo', 'file:///repo/src', narrow),
  ).toBe(true)
  expect(
    includesWorkspaceDirectory('file:///repo', 'file:///repo/src/ui', narrow),
  ).toBe(true)
  expect(
    includesWorkspaceFile(
      'file:///repo',
      'file:///repo/src/ui/card.ts',
      narrow,
    ),
  ).toBe(true)
  expect(
    includesWorkspaceFile(
      'file:///repo',
      'file:///repo/src/other/card.ts',
      narrow,
    ),
  ).toBe(false)
})
