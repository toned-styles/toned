import { useEffect, useRef, useState } from 'react'
import { type FileName, fileNames, type SourceFiles } from '../types.ts'
import { LanguageClient, type LanguageStatus } from './client.ts'
import type { LanguageProblem } from './protocol.ts'

const DEBOUNCE_MS = 250

export type LanguageCheck = {
  problems: readonly LanguageProblem[]
  /** How long the worker spent on this check. */
  ms: number
}

/**
 * Owns the language worker for the playground: keeps its two documents in
 * step with the editor and re-checks them shortly after each change.
 */
export function useLanguage(files: SourceFiles, enabled: boolean) {
  const [client, setClient] = useState<LanguageClient | null>(null)
  const [status, setStatus] = useState<LanguageStatus>({ kind: 'starting' })
  const [check, setCheck] = useState<LanguageCheck | null>(null)
  /** Files over the size limit: the worker keeps their last checked text. */
  const [skipped, setSkipped] = useState<readonly FileName[]>([])
  const checks = useRef(0)

  useEffect(() => {
    if (!enabled) return
    let created: LanguageClient
    try {
      created = new LanguageClient(setStatus)
    } catch (error) {
      setStatus({
        kind: 'failed',
        message: error instanceof Error ? error.message : String(error),
      })
      return
    }
    checks.current = 0
    setClient(created)
    return () => {
      created.dispose()
      setClient(null)
    }
  }, [enabled])

  useEffect(() => {
    if (!client) return
    const oversized = fileNames.filter(
      (file) => !client.update(file, files[file]),
    )
    setSkipped((previous) =>
      previous.join() === oversized.join() ? previous : oversized,
    )
    let cancelled = false
    const timer = window.setTimeout(
      async () => {
        const result = await client.request({ kind: 'diagnostics' })
        if (cancelled || !result || !client.current(result.versions)) return
        checks.current++
        setCheck({
          problems: result.problems.filter(
            (problem) => !oversized.includes(problem.file),
          ),
          ms: result.ms,
        })
      },
      checks.current === 0 ? 0 : DEBOUNCE_MS,
    )
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [client, files])

  return { client, status, check, skipped }
}
