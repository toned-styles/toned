import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Connection } from 'vscode-languageserver/node.js'
import { loadWorkspace, readWorkspaceFile } from '../workspace.ts'
import { WorkspaceDiskQueue } from './disk-queue.ts'
import { registerLanguageServer } from './server.ts'
import { DesignLanguageService } from './service.ts'

vi.mock('../workspace.ts', async (original) => ({
  ...(await original<typeof import('../workspace.ts')>()),
  loadWorkspace: vi.fn(),
  readWorkspaceFile: vi.fn(),
}))
const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const tick = () => new Promise<void>((resolve) => setImmediate(resolve))
const root = 'file:///disk-race',
  uri = root + '/tokens.ts'
const tokens = (value: string) =>
  `export const color=defineToken({values:['${value}']})`
function harness() {
  const callbacks = new Map<string, (...args: any[]) => any>()
  const connection = new Proxy(
    { console: { warn: vi.fn(), error: vi.fn() } },
    {
      get(target, key) {
        if (key === 'console') return target.console
        return (...args: any[]) =>
          callbacks.set(
            String(key) +
              (typeof args[0] === 'string' ? ':' + args.shift() : ''),
            args[0],
          )
      },
    },
  ) as unknown as Connection
  const service = new DesignLanguageService(),
    registration = registerLanguageServer(connection, service)
  const call = (name: string, params?: unknown) => callbacks.get(name)!(params)
  call('onInitialize', { rootUri: root, capabilities: {} })
  const open = (target: string, text: string) =>
    call('onDidOpenTextDocument', {
      textDocument: { uri: target, text, languageId: 'typescript', version: 1 },
    })
  const watch = (type = 2) =>
    call('onDidChangeWatchedFiles', { changes: [{ uri, type }] })
  return { service, registration, call, open, watch }
}
afterEach(() => vi.resetAllMocks())

describe('ordered disk publication', () => {
  it('serializes eager, initial-scan and watcher reads without discarding newer disk content', async () => {
    const h = harness(),
      first = deferred<string>(),
      scan = deferred<void>()
    let reads = 0,
      active = 0,
      maximum = 0
    vi.mocked(readWorkspaceFile).mockImplementation(async (_root, target) => {
      expect(target).toBe(uri)
      maximum = Math.max(maximum, ++active)
      try {
        return ++reads === 1 ? await first.promise : tokens('fresh')
      } finally {
        active--
      }
    })
    vi.mocked(loadWorkspace).mockImplementation(
      async (_project, _root, options) => {
        await scan.promise
        return {
          loaded: Number(await options!.loadFile!(uri)),
          skipped: 0,
          errors: [],
        }
      },
    )
    try {
      h.service.project.update(
        root + '/system.ts',
        `import {color} from './tokens';const system=defineSystem({color});export const stylesheet=system.stylesheet`,
        0,
      )
      const text = `import * as ui from './system';const styles=ui.stylesheet({Root:{color:'accent'}})`
      h.open(root + '/component.ts', text)
      const indexing = h.call('onInitialized')
      const completion = h.call('onCompletion', {
        textDocument: { uri: root + '/component.ts' },
        position: { line: 0, character: text.indexOf("'accent'") + 2 },
      })
      await tick()
      expect(reads).toBe(1)
      scan.resolve()
      await tick()
      h.watch()
      expect(reads).toBe(1)
      first.resolve(tokens('old'))
      await indexing
      await completion
      await tick()
      expect(maximum).toBe(1)
      expect(reads).toBe(2)
      expect(h.service.project.get(uri)?.text).toBe(tokens('fresh'))
      const latest = await h.call('onCompletion', {
        textDocument: { uri: root + '/component.ts' },
        position: { line: 0, character: text.indexOf("'accent'") + 2 },
      })
      expect(latest.items.map((item: { label: string }) => item.label)).toEqual(
        ['fresh'],
      )
    } finally {
      h.registration.dispose()
    }
  })
  it('coalesced scan and delete remove missing files, while a recreated file wins over an old delete notification', async () => {
    const h = harness(),
      first = deferred<string>(),
      scan = deferred<void>()
    let reads = 0,
      current: string | undefined
    vi.mocked(readWorkspaceFile).mockImplementation(async () => {
      if (++reads === 1) return first.promise
      if (current === undefined)
        throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      return current
    })
    vi.mocked(loadWorkspace).mockImplementation(
      async (_project, _root, options) => {
        await scan.promise
        try {
          return {
            loaded: Number(await options!.loadFile!(uri)),
            skipped: 0,
            errors: [],
          }
        } catch (error) {
          return {
            loaded: 0,
            skipped: 0,
            errors: [{ uri, message: String(error) }],
          }
        }
      },
    )
    try {
      h.service.project.update(uri, tokens('indexed'), 0)
      h.watch()
      h.watch(3)
      const indexing = h.call('onInitialized')
      scan.resolve()
      await tick()
      first.resolve(tokens('stale'))
      await indexing
      await tick()
      expect(h.service.project.get(uri)).toBeUndefined()
      current = tokens('recreated')
      h.watch(3)
      await tick()
      expect(h.service.project.get(uri)?.text).toBe(current)
    } finally {
      h.registration.dispose()
    }
  })
  it('a delayed disk read cannot overwrite an unsaved editor snapshot', async () => {
    const h = harness(),
      first = deferred<string>()
    vi.mocked(readWorkspaceFile).mockReturnValue(first.promise)
    try {
      h.watch()
      h.open(uri, tokens('editor'))
      await h.call('onCompletion', {
        textDocument: { uri },
        position: { line: 0, character: 0 },
      })
      first.resolve(tokens('disk'))
      await tick()
      expect(h.service.project.get(uri)?.text).toBe(tokens('editor'))
    } finally {
      h.registration.dispose()
    }
  })
  it('bounds distinct queued files, coalesces follow-ups and rejects queued work on disposal', async () => {
    const queue = new WorkspaceDiskQueue(),
      hold = deferred<boolean>()
    const active = Array.from({ length: 128 }, (_, i) =>
      queue.run(String(i), () => hold.promise),
    )
    await expect(queue.run('overflow', async () => true)).rejects.toThrow(
      'budget',
    )
    const next = queue.run('0', async () => false)
    expect(queue.run('0', async () => true)).toBe(next)
    // Attach the rejection assertion before disposal rejects the pending read.
    const rejected = (async () => {
      await expect(next).rejects.toThrow('disposed')
    })()
    queue.dispose()
    await rejected
    hold.resolve(true)
    await Promise.all(active)
  })
})
