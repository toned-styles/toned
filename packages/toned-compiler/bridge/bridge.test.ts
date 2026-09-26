import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, expect, test, vi } from 'vitest'
import type { DesignChange } from '../model.ts'
import { createSourceBridge, type SourceBridge } from './index.ts'

vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>()
  return { ...actual, rename: vi.fn(actual.rename) }
})

const fixtures: { directory: string; bridge?: SourceBridge }[] = []
const signal = () => new AbortController().signal
const source = `import { stylesheet } from '@toned/core'\n// Keep this comment.\nexport const button = stylesheet({ Root: { padding: 1 } })\n`
afterEach(async () => {
  vi.restoreAllMocks()
  for (const fixture of fixtures.splice(0)) {
    await fixture.bridge?.dispose()
    await fs.rm(fixture.directory, { recursive: true, force: true })
  }
})
async function setup(
  options: Partial<Parameters<typeof createSourceBridge>[0]> = {},
) {
  const directory = await fs.realpath(
    await fs.mkdtemp(join(tmpdir(), 'toned-bridge-')),
  )
  const root = join(directory, 'source')
  await fs.mkdir(root)
  const path = join(root, 'button.ts'),
    uri = pathToFileURL(path).href
  await fs.writeFile(path, source)
  const fixture = { directory, bridge: undefined as SourceBridge | undefined }
  fixtures.push(fixture)
  const bridge = await createSourceBridge({
    root,
    files: ['button.ts'],
    ...options,
  })
  fixture.bridge = bridge
  const node = (
    await bridge.query({ kind: 'declaration', limit: 10 }, signal())
  ).items[0]!
  const propose = (value: number) =>
    bridge.propose(
      {
        nodeId: node.id,
        value,
        expectedVersion: 1,
        scope: { uri, owner: 'button', path: ['Root'] },
      },
      signal(),
    )
  return { bridge, directory, root, path, uri, node, propose }
}

test('issued literal proposals roundtrip through real files and preserve source permissions', async () => {
  const { bridge, path, uri, propose } = await setup()
  await fs.chmod(path, 0o640)
  const change = await propose(2)
  expect(change.proposalId).toMatch(/^[\da-f-]+$/)
  const updated = await bridge.apply(change, signal())
  expect(updated.version).toBe(2)
  expect(await fs.readFile(path, 'utf8')).toBe(
    source.replace('padding: 1', 'padding: 2'),
  )
  expect((await fs.stat(path)).mode & 0o777).toBe(0o640)
  expect((await bridge.document(uri, signal())).text).toBe(updated.text)
  await expect(bridge.apply(change, signal())).rejects.toThrow('consumed')
})

test('arbitrary or modified client edits have no write authority', async () => {
  const { bridge, path, propose } = await setup()
  const issued = await propose(2)
  const modified = {
    ...issued,
    edit: { ...issued.edit, after: 'process.exit()' },
  }
  await expect(bridge.apply(modified, signal())).rejects.toThrow('modified')
  const { proposalId: _proposalId, ...unissued } = issued
  await expect(
    bridge.apply(unissued as DesignChange, signal()),
  ).rejects.toThrow('unknown')
  expect(await fs.readFile(path, 'utf8')).toBe(source)
})

test('external source changes invalidate proposals and concurrent bridge writers serialize', async () => {
  const { bridge, path, propose } = await setup()
  const first = await propose(2),
    second = await propose(3)
  const results = await Promise.allSettled([
    bridge.apply(first, signal()),
    bridge.apply(second, signal()),
  ])
  expect(results.map((result) => result.status)).toEqual([
    'fulfilled',
    'rejected',
  ])
  expect(await fs.readFile(path, 'utf8')).toBe(
    source.replace('padding: 1', 'padding: 2'),
  )
  const {
    bridge: externalBridge,
    path: externalPath,
    propose: externalPropose,
  } = await setup()
  const issued = await externalPropose(2)
  const external = source.replace('padding: 1', 'padding: 9')
  await fs.writeFile(externalPath, external)
  await expect(externalBridge.apply(issued, signal())).rejects.toThrow('Stale')
  expect(await fs.readFile(externalPath, 'utf8')).toBe(external)
})

test('bounded proposal cache expires and evicts issued capabilities', async () => {
  const { bridge, propose } = await setup({
    maxPendingProposals: 1,
    proposalTtlMs: 10,
  })
  const time = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const first = await propose(2),
    second = await propose(3)
  await expect(bridge.apply(first, signal())).rejects.toThrow('expired')
  time.mockReturnValue(1011)
  await expect(bridge.apply(second, signal())).rejects.toThrow('expired')
})

test('cancellation and failed atomic replacement preserve source and clean staged files', async () => {
  const { bridge, path, root, propose } = await setup()
  const canceled = await propose(2),
    abort = new AbortController()
  abort.abort()
  await expect(bridge.apply(canceled, abort.signal)).rejects.toThrow()
  expect(await fs.readFile(path, 'utf8')).toBe(source)
  const issued = await propose(3)
  vi.mocked(fs.rename).mockRejectedValueOnce(
    new Error('simulated rename failure'),
  )
  await expect(bridge.apply(issued, signal())).rejects.toThrow(
    'simulated rename failure',
  )
  expect(await fs.readFile(path, 'utf8')).toBe(source)
  expect(await fs.readdir(root)).toEqual(['button.ts'])
})

test('root escape, symlinks, oversized files and non-allowlisted reads are refused', async () => {
  const { bridge, directory, root, path } = await setup()
  const outside = join(directory, 'outside.ts')
  await fs.writeFile(outside, source)
  await expect(
    createSourceBridge({ root, files: ['../outside.ts'] }),
  ).rejects.toThrow('outside')
  await fs.symlink(outside, join(root, 'link.ts'))
  await expect(
    createSourceBridge({ root, files: ['link.ts'] }),
  ).rejects.toThrow('symlink')
  await expect(
    bridge.document(pathToFileURL(outside).href, signal()),
  ).rejects.toThrow('allowlisted')
  await expect(
    createSourceBridge({ root, files: ['button.ts'], maxFileBytes: 8 }),
  ).rejects.toThrow('budget')
  await fs.unlink(path)
  await fs.symlink(outside, path)
  await expect(bridge.query({ limit: 10 }, signal())).rejects.toThrow('symlink')
})

test('disposed bridges reject work without retaining documents or proposals', async () => {
  const { bridge, uri } = await setup()
  await bridge.dispose()
  await bridge.dispose()
  await expect(bridge.document(uri, signal())).rejects.toThrow('disposed')
})

test('operation queues are bounded and cancellation after replacement begins reports the committed document', async () => {
  const { bridge, uri, propose, path } = await setup({ maxQueuedOperations: 1 })
  const reading = bridge.document(uri, signal())
  await expect(bridge.document(uri, signal())).rejects.toThrow('queue is full')
  await reading
  const proposal = await propose(2),
    abort = new AbortController()
  const original = (
    await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  ).rename
  vi.mocked(fs.rename).mockImplementationOnce(async (...args) => {
    abort.abort()
    return original(...args)
  })
  const committed = await bridge.apply(proposal, abort.signal)
  expect(committed.version).toBe(2)
  expect(await fs.readFile(path, 'utf8')).toBe(
    source.replace('padding: 1', 'padding: 2'),
  )
})
