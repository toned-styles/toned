import { constants } from 'node:fs'
import { lstat, open, opendir, realpath } from 'node:fs/promises'
import { extname, isAbsolute, join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { DesignProject } from './project.ts'

export interface WorkspaceLoad {
  readonly loaded: number
  readonly skipped: number
  readonly errors: readonly { uri: string; message: string }[]
}
const excluded = new Set([
  'node_modules',
  '.git',
  '.dist',
  '.tsc',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
  'coverage',
  '.worktrees',
])
/** The same lexical inclusion policy is used for initial scans and watcher updates. */
function selectedPath(
  local: string,
  include: readonly string[] | undefined,
  directory: boolean,
): boolean {
  const path = local.split(sep).join('/')
  return (
    !include ||
    include.some(
      (scope) =>
        scope === '.' ||
        path === scope ||
        path.startsWith(scope + '/') ||
        (directory && (path === '' || scope.startsWith(path + '/'))),
    )
  )
}
export function includesWorkspaceDirectory(
  rootUri: string,
  uri: string,
  include?: readonly string[],
): boolean {
  try {
    const local = relative(fileURLToPath(rootUri), fileURLToPath(uri))
    return (
      local !== '..' &&
      !local.startsWith(`..${sep}`) &&
      !isAbsolute(local) &&
      !local.split(sep).some((part) => excluded.has(part)) &&
      selectedPath(local, include, true)
    )
  } catch {
    return false
  }
}
export function includesWorkspaceFile(
  rootUri: string,
  uri: string,
  include?: readonly string[],
): boolean {
  try {
    const path = fileURLToPath(uri)
    const local = relative(fileURLToPath(rootUri), path)
    return (
      local !== '' &&
      local !== '..' &&
      !local.startsWith(`..${sep}`) &&
      !isAbsolute(local) &&
      selectedPath(local, include, false) &&
      !local.split(sep).some((part) => excluded.has(part)) &&
      ['.ts', '.tsx', '.js', '.jsx'].includes(extname(path)) &&
      !/\.(test|test-d|spec|d)\.[cm]?[jt]sx?$/.test(path)
    )
  } catch {
    return false
  }
}

/** Async host I/O only; source analysis never imports the application's modules. */
export async function loadWorkspace(
  project: DesignProject,
  rootUri: string,
  options: {
    signal?: AbortSignal
    maxEntries?: number
    include?: readonly string[]
    isOpen?: (uri: string) => boolean
  } = {},
): Promise<WorkspaceLoad> {
  const maxEntries = options.maxEntries ?? 30_000
  if (
    !Number.isSafeInteger(maxEntries) ||
    maxEntries < 1 ||
    maxEntries > 1_000_000
  )
    throw new Error('Invalid Toned workspace entry budget')
  options.signal?.throwIfAborted()
  const root = await realpath(fileURLToPath(rootUri)),
    queue = [root]
  const errors: { uri: string; message: string }[] = []
  let loaded = 0,
    skipped = 0,
    entries = 0
  for (let cursor = 0; cursor < queue.length; cursor++) {
    if (options.signal?.aborted)
      throw new Error('Toned workspace indexing cancelled')
    for await (const entry of await opendir(queue[cursor]!)) {
      options.signal?.throwIfAborted()
      if (++entries > maxEntries)
        throw new Error(
          'Toned workspace entry budget exceeded; narrow the workspace root',
        )
      if (entry.isSymbolicLink() || excluded.has(entry.name)) {
        skipped++
        continue
      }
      const path = join(queue[cursor]!, entry.name)
      if (entry.isDirectory()) {
        if (
          includesWorkspaceDirectory(
            pathToFileURL(root).href,
            pathToFileURL(path).href,
            options.include,
          )
        )
          queue.push(path)
        else skipped++
        continue
      }
      if (
        !entry.isFile() ||
        !includesWorkspaceFile(
          pathToFileURL(root).href,
          pathToFileURL(path).href,
          options.include,
        )
      ) {
        skipped++
        continue
      }
      const uri = pathToFileURL(path).href
      if (options.isOpen?.(uri)) continue
      const before = project.get(uri)
      try {
        const text = await readBoundedSource(path, { signal: options.signal })
        options.signal?.throwIfAborted()
        // A watcher or editor owns any newer snapshot published during the read.
        if (options.isOpen?.(uri) || project.get(uri) !== before) continue
        project.update(uri, text, (project.get(uri)?.version ?? -1) + 1)
        loaded++
      } catch (error) {
        options.signal?.throwIfAborted()
        errors.push({ uri, message: String(error) })
      }
      // Yield between files, making cancellation/interactive protocol requests observable.
      await new Promise<void>((resolve) => setImmediate(resolve))
    }
  }
  return { loaded, skipped, errors }
}

export async function readWorkspaceFile(
  rootUri: string,
  uri: string,
): Promise<string> {
  const root = await realpath(fileURLToPath(rootUri)),
    path = await realpath(fileURLToPath(uri))
  const local = relative(root, path)
  if (
    local === '..' ||
    local.startsWith(`..${sep}`) ||
    local === '' ||
    isAbsolute(local)
  )
    throw new Error('Document is outside the configured Toned workspace')
  return readBoundedSource(path)
}

/** Bound allocation and read bytes on the opened file, not an earlier pathname stat. */
export async function readBoundedSource(
  path: string,
  options: { signal?: AbortSignal; maxBytes?: number } = {},
): Promise<string> {
  const maxBytes = options.maxBytes ?? 2_000_000
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 8_000_000)
    throw new Error('Invalid Toned source byte budget')
  options.signal?.throwIfAborted()
  const handle = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  )
  try {
    const before = await handle.stat()
    if (!before.isFile() || before.size > maxBytes)
      throw new Error('File exceeds Toned source byte budget or is not regular')
    const buffer = Buffer.alloc(Math.min(before.size + 1, maxBytes + 1))
    let size = 0
    while (size < buffer.length) {
      options.signal?.throwIfAborted()
      const result = await handle.read(buffer, size, buffer.length - size, null)
      if (!result.bytesRead) break
      size += result.bytesRead
    }
    const after = await handle.stat(),
      named = await lstat(path)
    if (size > maxBytes)
      throw new Error('File exceeds Toned source byte budget')
    if (
      size !== before.size ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs ||
      before.dev !== named.dev ||
      before.ino !== named.ino
    )
      throw new Error(
        'Toned source changed during read; retry the current file',
      )
    options.signal?.throwIfAborted()
    return new TextDecoder('utf-8', { fatal: true }).decode(
      buffer.subarray(0, size),
    )
  } finally {
    await handle.close()
  }
}
