import { type ChildProcess, fork } from 'node:child_process'

async function bounded<T>(
  promise: Promise<T>,
  milliseconds: number,
  signal?: AbortSignal,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let abort: (() => void) | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        abort = () => reject(new Error('Toned server startup cancelled'))
        if (signal?.aborted) return abort()
        signal?.addEventListener('abort', abort, { once: true })
        timer = setTimeout(
          () => reject(new Error('Toned server operation timed out')),
          milliseconds,
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
    if (abort) signal?.removeEventListener('abort', abort)
  }
}

/** Own exactly one subprocess. Stop never waits for the initialization handshake.
 * The bundled server starts no descendants; direct signal + close reaps its process. */
export class OwnedServer {
  private child?: ChildProcess
  private closed?: Promise<void>
  private didClose = false
  private initialized = false
  private readonly cancellation = new AbortController()
  private stopping?: Promise<void>
  private cleanup?: () => Promise<void>

  constructor(
    private readonly entrypoint: string,
    private readonly startupTimeout = 10_000,
    private readonly report: (message: string) => void = console.warn,
  ) {}

  spawn = async (): Promise<ChildProcess> => {
    if (this.cancellation.signal.aborted || this.child)
      throw new Error('Toned server session has stopped or already started')
    const child = fork(this.entrypoint, [], {
      execArgv: ['--max-old-space-size=384'],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ELECTRON_NO_ASAR: '1' },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })
    this.child = child
    this.closed = new Promise<void>((resolve) => {
      child.once('close', () => {
        this.didClose = true
        resolve()
      })
    })
    // A failed spawn is also observed by its stream/client; never leave an unhandled event.
    child.on('error', (error) =>
      this.report(`Toned server process error: ${String(error)}`),
    )
    return child
  }

  async initialize(
    start: () => Promise<void>,
    cleanup: () => Promise<void>,
  ): Promise<void> {
    this.cleanup = cleanup
    try {
      await bounded(
        Promise.resolve().then(start),
        this.startupTimeout,
        this.cancellation.signal,
      )
      this.initialized = true
    } catch (error) {
      await this.stop()
      throw error
    }
  }

  get isStopping(): boolean {
    return this.cancellation.signal.aborted
  }

  stop(): Promise<void> {
    this.cancellation.abort()
    this.stopping ??= this.finish().catch((error) => {
      // A still-live process stays owned, but a later stop may retry once the OS
      // delivers its exit. Never cache a failed cleanup forever.
      this.stopping = undefined
      throw error
    })
    return this.stopping
  }

  private async finish(): Promise<void> {
    if (this.initialized && this.cleanup)
      await bounded(Promise.resolve().then(this.cleanup), 1_000).catch(
        (error) => this.report(`Toned server cleanup: ${String(error)}`),
      )
    const child = this.child
    if (child && !this.didClose) {
      child.kill('SIGTERM')
      await bounded(this.closed!, 250).catch((error) =>
        this.report(`Toned server cleanup: ${String(error)}`),
      )
      if (!this.didClose) {
        child.kill('SIGKILL')
        await bounded(this.closed!, 2_000).catch((error) => {
          if (child.exitCode === null && child.signalCode === null) throw error
          // The process exited; inherited or delayed pipe closure must not poison
          // the workspace session. Release our remaining transport handles.
          this.report(
            `Toned server exited with delayed stream closure: ${String(error)}`,
          )
          child.stdin?.destroy()
          child.stdout?.destroy()
          child.stderr?.destroy()
        })
      }
    }
    if (!this.initialized && this.cleanup)
      await bounded(Promise.resolve().then(this.cleanup), 500).catch((error) =>
        this.report(`Toned server cleanup: ${String(error)}`),
      )
  }
}
