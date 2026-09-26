import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { DesignProject } from './project.ts'
import {
  loadWorkspace,
  readBoundedSource,
  readWorkspaceFile,
} from './workspace.ts'

vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>()
  return {
    ...actual,
    open: vi.fn(actual.open),
    opendir: vi.fn(actual.opendir),
    readdir: vi.fn(actual.readdir),
  }
})
const actualFs =
  await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
beforeEach(() => {
  vi.mocked(fs.open).mockImplementation(actualFs.open)
  vi.mocked(fs.opendir).mockImplementation(actualFs.opendir)
  vi.mocked(fs.readdir).mockImplementation(actualFs.readdir)
})
const directories: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  for (const directory of directories.splice(0))
    await fs.rm(directory, { recursive: true, force: true })
})
async function fixture() {
  const directory = await fs.realpath(
    await fs.mkdtemp(join(tmpdir(), 'toned-workspace-')),
  )
  directories.push(directory)
  const file = join(directory, 'styles.ts'),
    uri = pathToFileURL(file).href
  await fs.writeFile(file, 'const s=ui.stylesheet({Root:{gap:1}})')
  return { directory, file, uri, root: pathToFileURL(directory).href }
}

test('streams directory entries to enforce the scan budget, then closes the directory', async () => {
  const { directory, root } = await fixture()
  for (let index = 0; index < 10; index++)
    await fs.writeFile(join(directory, `file${index}.ts`), '')
  const project = new DesignProject()
  await expect(loadWorkspace(project, root, { maxEntries: 3 })).rejects.toThrow(
    'entry budget',
  )
  expect(fs.readdir).not.toHaveBeenCalled()
  expect(fs.opendir).toHaveBeenCalledOnce()
  expect(project.statistics.files).toBeLessThanOrEqual(3)
})

test('initial indexing cannot overwrite a newer editor or watcher snapshot', async () => {
  const { file, uri, root } = await fixture()
  const project = new DesignProject()
  project.update(uri, 'const old=ui.stylesheet({Root:{gap:0}})', 0)
  const open = actualFs.open
  vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
    const handle = await open(...args)
    const read = handle.read.bind(handle)
    vi.spyOn(handle, 'read').mockImplementationOnce(
      async (...readArgs: any[]) => {
        const result = await (read as any)(...readArgs)
        project.update(uri, 'const latest=ui.stylesheet({Root:{gap:4}})', 1)
        return result
      },
    )
    return handle
  })
  const result = await loadWorkspace(project, root)
  expect(result.errors).toEqual([])
  expect(result.loaded).toBe(0)
  expect(project.get(uri)?.text).toContain('latest')
  expect(await fs.readFile(file, 'utf8')).toContain('gap:1')
})

test('opened-handle budgets reject oversized, growing, replaced and invalid UTF-8 files', async () => {
  const { file } = await fixture()
  await expect(readBoundedSource(file, { maxBytes: 4 })).rejects.toThrow(
    'byte budget',
  )
  const originalOpen = actualFs.open
  vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
    const handle = await originalOpen(...args)
    const stat = handle.stat.bind(handle)
    vi.spyOn(handle, 'stat').mockImplementationOnce(async () => {
      const info = await stat()
      await fs.appendFile(file, 'x'.repeat(10_000))
      return info
    })
    return handle
  })
  await expect(readBoundedSource(file, { maxBytes: 100 })).rejects.toThrow(
    'changed during read',
  )
  await fs.writeFile(file, 'before')
  vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
    const handle = await originalOpen(...args)
    const stat = handle.stat.bind(handle)
    vi.spyOn(handle, 'stat').mockImplementationOnce(async () => {
      const info = await stat()
      await fs.writeFile(`${file}.next`, 'after')
      await fs.rename(`${file}.next`, file)
      return info
    })
    return handle
  })
  await expect(readBoundedSource(file)).rejects.toThrow('changed during read')
  await fs.writeFile(file, Buffer.from([0xff, 0xfe]))
  await expect(readBoundedSource(file)).rejects.toThrow()
})

test('source reads reject traversal and cancellation and preserve newer open documents', async () => {
  const { directory, file, uri, root } = await fixture()
  const nested = join(directory, 'nested')
  await fs.mkdir(nested)
  await expect(
    readWorkspaceFile(pathToFileURL(nested).href, uri),
  ).rejects.toThrow('outside')
  const controller = new AbortController()
  controller.abort()
  await expect(
    readBoundedSource(file, { signal: controller.signal }),
  ).rejects.toThrow()
  const project = new DesignProject()
  const result = await loadWorkspace(project, root, {
    isOpen: (value) => value === uri,
  })
  expect(result.loaded).toBe(0)
  expect(project.get(uri)).toBeUndefined()
})
