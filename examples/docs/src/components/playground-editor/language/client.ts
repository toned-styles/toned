import {
  type FileName,
  fileNames,
  fileRecord,
  MAX_FILE_CHARS,
} from '../types.ts'
import type {
  FromWorker,
  LanguageRequest,
  LanguageResponse,
  ToWorker,
  Versions,
} from './protocol.ts'

export type LanguageStatus =
  | { kind: 'starting' }
  | { kind: 'ready'; ms: number; typescript: string }
  | { kind: 'failed'; message: string }

type Kind = LanguageRequest['kind']
type Waiting = { kind: Kind; resolve: (result: unknown) => void }

/**
 * The editor's side of the language worker. Every request has an id; asking
 * again on the same channel cancels the one before it, whose promise then
 * resolves to `undefined`. A stale answer is never delivered.
 */
export class LanguageClient {
  private readonly worker: Worker
  private readonly waiting = new Map<number, Waiting>()
  private readonly latest = new Map<Kind, number>()
  private readonly texts = {} as Record<FileName, string>
  private ids = 0
  private disposed = false
  readonly versions: Versions = fileRecord(() => 0)
  status: LanguageStatus = { kind: 'starting' }

  constructor(private readonly onStatus: (status: LanguageStatus) => void) {
    this.worker = new Worker(new URL('./ts.worker.ts', import.meta.url), {
      type: 'module',
    })
    this.worker.addEventListener('message', (event: MessageEvent<FromWorker>) =>
      this.receive(event.data),
    )
    this.worker.addEventListener('error', (event) => {
      event.preventDefault()
      this.fail(event.message || 'The language worker could not start.')
    })
  }

  private post(message: ToWorker) {
    if (!this.disposed) this.worker.postMessage(message)
  }

  private fail(message: string) {
    this.status = { kind: 'failed', message }
    this.onStatus(this.status)
    for (const entry of this.waiting.values()) entry.resolve(undefined)
    this.waiting.clear()
  }

  private receive(message: FromWorker) {
    if (this.disposed) return
    if (message.type === 'ready') {
      this.status = {
        kind: 'ready',
        ms: message.ms,
        typescript: message.typescript,
      }
      this.onStatus(this.status)
    } else if (message.type === 'failed') this.fail(message.message)
    else {
      const entry = this.waiting.get(message.id)
      this.waiting.delete(message.id)
      entry?.resolve(message.type === 'response' ? message.result : undefined)
    }
  }

  /** Send a file's current text. Returns false when it is too large to check. */
  update(file: FileName, text: string) {
    if (this.texts[file] === text) return true
    if (text.length > MAX_FILE_CHARS) return false
    this.texts[file] = text
    this.versions[file]++
    this.post({ type: 'update', file, text, version: this.versions[file] })
    return true
  }

  /** True while the worker's copy of every file is the one the editor shows. */
  current(versions: Versions) {
    return fileNames.every((file) => versions[file] === this.versions[file])
  }

  request<K extends Kind>(
    request: Extract<LanguageRequest, { kind: K }>,
  ): Promise<LanguageResponse[K] | undefined> {
    if (this.disposed || this.status.kind === 'failed')
      return Promise.resolve(undefined)
    const previous = this.latest.get(request.kind)
    if (previous !== undefined) this.cancel(previous)
    const id = ++this.ids
    this.latest.set(request.kind, id)
    return new Promise((resolve) => {
      this.waiting.set(id, {
        kind: request.kind,
        resolve: resolve as (result: unknown) => void,
      })
      this.post({ type: 'request', id, request })
    })
  }

  private cancel(id: number) {
    const entry = this.waiting.get(id)
    if (!entry) return
    this.waiting.delete(id)
    entry.resolve(undefined)
    this.post({ type: 'cancel', id })
  }

  dispose() {
    this.disposed = true
    for (const entry of this.waiting.values()) entry.resolve(undefined)
    this.waiting.clear()
    this.worker.terminate()
  }
}
