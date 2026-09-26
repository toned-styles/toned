import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open, realpath, rename, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { applyDesignEdit, proposeValueEdit } from '../edits.ts'
import type { InspectorTransport } from '../inspector/index.ts'
import type { DesignChange } from '../model.ts'
import { DesignProject } from '../project.ts'
import { parseEditRequest, parseQuery } from '../requests.ts'
import { parseDesignDocument } from '../source.ts'

export type { SourceBridgeHttpOptions } from './http.ts'
export { createSourceBridgeHandler } from './http.ts'
export { sourceBridgePlugin } from './vite.ts'

export interface SourceProposal extends DesignChange {
  readonly proposalId: string
  readonly expiresAt: number
}
export interface SourceBridge extends InspectorTransport {
  propose(
    input: Parameters<InspectorTransport['propose']>[0],
    signal: AbortSignal,
  ): Promise<SourceProposal>
  dispose(): Promise<void>
}
export interface SourceBridgeOptions {
  readonly root: string
  /** Explicit source allowlist. Paths are relative to root, or contained file URLs. */
  readonly files: readonly string[]
  readonly maxFiles?: number
  readonly maxFileBytes?: number
  readonly maxCharacters?: number
  readonly maxPendingProposals?: number
  readonly proposalTtlMs?: number
  readonly maxQueuedOperations?: number
}
const bounded = (value: number, name: string, max: number) => {
  if (!Number.isSafeInteger(value) || value < 1 || value > max)
    throw new Error(`Toned bridge: ${name} must be 1..${max}`)
  return value
}

/** Development-only persistence for the shared source model. No module execution. */
export async function createSourceBridge(
  options: SourceBridgeOptions,
): Promise<SourceBridge> {
  const maxFiles = bounded(options.maxFiles ?? 256, 'maxFiles', 4096)
  const maxBytes = bounded(
    options.maxFileBytes ?? 1_000_000,
    'maxFileBytes',
    8_000_000,
  )
  const maxCharacters = bounded(
    options.maxCharacters ?? 8_000_000,
    'maxCharacters',
    32_000_000,
  )
  const maxPending = bounded(
    options.maxPendingProposals ?? 128,
    'maxPendingProposals',
    1024,
  )
  const maxQueued = bounded(
    options.maxQueuedOperations ?? 128,
    'maxQueuedOperations',
    4096,
  )
  const ttl = bounded(
    options.proposalTtlMs ?? 300_000,
    'proposalTtlMs',
    3_600_000,
  )
  if (!options.files.length || options.files.length > maxFiles)
    throw new Error('Toned bridge: explicit source file budget exceeded')
  const root = await realpath(options.root)
  if (!(await lstat(root)).isDirectory())
    throw new Error('Toned bridge: root must be a directory')
  const files = new Map<string, string>()
  const project = new DesignProject({
    maxFiles,
    maxCharacters,
    maxDocumentCharacters: maxBytes,
  })
  const pending = new Map<string, SourceProposal>()
  let queued = 0
  let closed = false,
    tail: Promise<unknown> = Promise.resolve()
  const inside = (path: string) => {
    const rel = relative(root, path)
    return (
      rel !== '' &&
      rel !== '..' &&
      !rel.startsWith(`..${sep}`) &&
      !isAbsolute(rel)
    )
  }
  const verifyPath = async (path: string) => {
    if (!inside(path)) throw new Error('Toned bridge: source is outside root')
    const segments = relative(root, path).split(sep)
    let current = root
    for (const segment of segments) {
      current = resolve(current, segment)
      const stat = await lstat(current)
      if (stat.isSymbolicLink())
        throw new Error('Toned bridge: symlink source paths are not supported')
      if (current !== path && !stat.isDirectory())
        throw new Error('Toned bridge: source parent is not a directory')
    }
    if ((await realpath(path)) !== path)
      throw new Error('Toned bridge: source path changed')
  }
  for (const entry of options.files) {
    let path: string
    if (entry.startsWith('file:')) {
      const url = new URL(entry)
      if (url.search || url.hash)
        throw new Error(
          'Toned bridge: source URLs cannot include query or fragment',
        )
      path = fileURLToPath(url)
    } else path = resolve(root, entry)
    if (!/\.[cm]?[jt]sx?$/.test(path))
      throw new Error('Toned bridge: allowlisted sources must be JS/TS files')
    await verifyPath(path)
    files.set(pathToFileURL(path).href, path)
  }
  const read = async (uri: string, signal?: AbortSignal) => {
    if (closed) throw new Error('Toned bridge: disposed')
    const path = files.get(uri)
    if (!path) throw new Error('Toned bridge: source is not allowlisted')
    signal?.throwIfAborted()
    await verifyPath(path)
    const handle = await open(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    )
    try {
      const stat = await handle.stat()
      if (!stat.isFile() || stat.nlink !== 1)
        throw new Error(
          'Toned bridge: expected a regular, singly linked source file',
        )
      if (stat.size > maxBytes)
        throw new Error('Toned bridge: source byte budget exceeded')
      await verifyPath(path)
      const named = await lstat(path)
      if (stat.dev !== named.dev || stat.ino !== named.ino)
        throw new Error('Toned bridge: source identity changed during open')
      const buffer = Buffer.alloc(Math.min(stat.size + 1, maxBytes + 1))
      let size = 0
      while (size < buffer.length) {
        signal?.throwIfAborted()
        const result = await handle.read(
          buffer,
          size,
          buffer.length - size,
          null,
        )
        size += result.bytesRead
        if (!result.bytesRead) break
      }
      if (size > maxBytes)
        throw new Error('Toned bridge: source byte budget exceeded')
      const after = await handle.stat()
      if (
        after.size !== stat.size ||
        after.mtimeMs !== stat.mtimeMs ||
        after.ctimeMs !== stat.ctimeMs
      )
        throw new Error('Toned bridge: source changed during read')
      signal?.throwIfAborted()
      const text = new TextDecoder('utf-8', { fatal: true }).decode(
        buffer.subarray(0, size),
      )
      return { text, stat, path }
    } finally {
      await handle.close()
    }
  }
  const sync = async (uri: string, signal?: AbortSignal) => {
    const disk = await read(uri, signal),
      previous = project.get(uri)
    const version = previous
      ? previous.version + (previous.text === disk.text ? 0 : 1)
      : 1
    const document = project.update(uri, disk.text, version)
    return { ...disk, document }
  }
  const enqueue = <T>(
    signal: AbortSignal,
    operation: () => Promise<T>,
  ): Promise<T> => {
    if (closed) return Promise.reject(new Error('Toned bridge: disposed'))
    if (queued >= maxQueued)
      return Promise.reject(new Error('Toned bridge: operation queue is full'))
    queued++
    const result = tail
      .then(async () => {
        if (closed) throw new Error('Toned bridge: disposed')
        signal.throwIfAborted()
        return operation()
      })
      .finally(() => {
        queued--
      })
    tail = result.catch(() => undefined)
    return result
  }
  const prune = () => {
    for (const [id, proposal] of pending)
      if (proposal.expiresAt <= Date.now()) pending.delete(id)
  }
  for (const uri of files.keys()) await sync(uri)
  return {
    query: (input, signal) =>
      enqueue(signal, async () => {
        const query = parseQuery(input)
        if (query.uri && !files.has(query.uri))
          throw new Error('Toned bridge: source is not allowlisted')
        // No hidden watcher: queries refresh only the explicit finite source set.
        for (const uri of query.uri ? [query.uri] : files.keys())
          await sync(uri, signal)
        return project.query(query)
      }),
    document: (uri, signal) =>
      enqueue(signal, async () => (await sync(uri, signal)).document),
    propose: (input, signal) =>
      enqueue(signal, async () => {
        const request = parseEditRequest(input)
        await sync(request.scope.uri, signal)
        const change = proposeValueEdit(project, request)
        const proposal = JSON.parse(
          JSON.stringify({
            ...change,
            proposalId: randomUUID(),
            expiresAt: Date.now() + ttl,
          }),
        ) as SourceProposal
        // Keep a separate server copy; callers cannot mutate the issued authority.
        prune()
        while (pending.size >= maxPending)
          pending.delete(pending.keys().next().value!)
        pending.set(
          proposal.proposalId,
          JSON.parse(JSON.stringify(proposal)) as SourceProposal,
        )
        return proposal
      }),
    apply: (input, signal) =>
      enqueue(signal, async () => {
        prune()
        const id = (input as Partial<SourceProposal>).proposalId
        const proposal = typeof id === 'string' ? pending.get(id) : undefined
        if (!proposal)
          throw new Error('Toned bridge: unknown, consumed or expired proposal')
        if (JSON.stringify(input.edit) !== JSON.stringify(proposal.edit))
          throw new Error('Toned bridge: client modified the issued proposal')
        // Consume before any write attempt. An error requires a fresh reviewed proposal.
        pending.delete(proposal.proposalId)
        const { document, path, stat } = await sync(proposal.edit.uri, signal)
        const next = applyDesignEdit(
          document.text,
          document.version,
          proposal.edit,
        )
        if (
          Buffer.byteLength(next, 'utf8') > maxBytes ||
          project.statistics.characters - document.text.length + next.length >
            maxCharacters
        )
          throw new Error('Toned bridge: edited source budget exceeded')
        parseDesignDocument(document.uri, next, document.version + 1, {
          maxCharacters: maxBytes,
          maxNodes: 20000,
        })
        signal.throwIfAborted()
        const temporary = resolve(dirname(path), `.toned-${randomUUID()}.tmp`)
        let staged = false,
          committed = false
        try {
          await verifyPath(path)
          const handle = await open(
            temporary,
            constants.O_WRONLY |
              constants.O_CREAT |
              constants.O_EXCL |
              constants.O_NOFOLLOW,
            stat.mode & 0o777,
          )
          staged = true
          try {
            if ((await realpath(dirname(temporary))) !== dirname(path))
              throw new Error('Toned bridge: source parent changed')
            await handle.chmod(stat.mode & 0o777)
            await handle.writeFile(next, 'utf8')
            await handle.sync()
          } finally {
            await handle.close()
          }
          const current = await read(document.uri, signal)
          if (
            current.text !== document.text ||
            current.stat.dev !== stat.dev ||
            current.stat.ino !== stat.ino
          )
            throw new Error('Toned bridge: source changed before commit')
          signal.throwIfAborted()
          if (closed) throw new Error('Toned bridge: disposed')
          await rename(temporary, path)
          committed = true
          // Commit has happened. Late cancellation does not pretend this edit was undone.
          return project.update(document.uri, next, document.version + 1)
        } catch (failure) {
          if (staged && !committed) {
            try {
              await unlink(temporary)
            } catch (cause) {
              if ((cause as NodeJS.ErrnoException).code !== 'ENOENT')
                throw new AggregateError(
                  [failure, cause],
                  `Toned bridge: source not committed; staged cleanup failed at ${temporary}`,
                )
            }
          }
          throw failure
        }
      }),
    async dispose() {
      closed = true
      await tail
      pending.clear()
      project.dispose()
      files.clear()
    },
  }
}
