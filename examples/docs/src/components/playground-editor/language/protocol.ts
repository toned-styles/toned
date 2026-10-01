/** Messages between the editor and its language worker. All plain data. */
import type { FileName } from '../types.ts'

export type ProblemSource = 'ts' | 'toned'

export type LanguageProblem = {
  file: FileName
  /** UTF-16 offsets into the file. */
  from: number
  to: number
  /** 1-based position of `from`. */
  line: number
  column: number
  severity: 'error' | 'warning' | 'info'
  source: ProblemSource
  code: string
  message: string
}

export type Versions = Record<FileName, number>

export type CompletionEntry = {
  label: string
  /** A CodeMirror completion type: `function`, `property`, `enum`, … */
  kind: string
  /** Short text beside the label, e.g. `23 values`. */
  detail?: string
  /** Toned's own documentation for the entry, shown above the TS details. */
  tonedInfo?: string
  origin: 'ts' | 'toned' | 'both'
  /** Higher sorts first among equally good matches (-99..99). */
  boost: number
  /** Text to insert when it differs from the label. */
  insert?: string
  /** Replace this range instead of the result's default one. */
  range?: { from: number; to: number }
  /** Present when TypeScript can describe the entry in more detail. */
  ts?: { name: string; source?: string; data?: unknown }
}

export type CompletionResult = {
  from: number
  to: number
  /** Inside a string literal, where identifier characters are not the limit. */
  inString: boolean
  entries: CompletionEntry[]
}

export type SymbolDetails = {
  /** The symbol's signature, as TypeScript prints it. */
  signature: string
  docs?: string
  tags?: { name: string; text: string }[]
}

export type TonedDetails = {
  /** e.g. `declaration buttonStyles / Root / bgColor`. */
  title: string
  facts: { label: string; value: string }[]
}

export type HoverResult = {
  from: number
  to: number
  ts?: SymbolDetails
  toned?: TonedDetails
}

export type LanguageRequest =
  | { kind: 'diagnostics' }
  | {
      kind: 'completions'
      file: FileName
      position: number
      /** The typed character that opened the list, if one did. */
      trigger?: string
    }
  | {
      kind: 'completionDetails'
      file: FileName
      position: number
      entry: NonNullable<CompletionEntry['ts']>
    }
  | { kind: 'hover'; file: FileName; position: number }

export type LanguageResponse = {
  diagnostics: { versions: Versions; problems: LanguageProblem[]; ms: number }
  completions: CompletionResult | null
  completionDetails: SymbolDetails | null
  hover: HoverResult | null
}

export type ToWorker =
  | { type: 'update'; file: FileName; text: string; version: number }
  | { type: 'request'; id: number; request: LanguageRequest }
  | { type: 'cancel'; id: number }

export type FromWorker =
  | { type: 'ready'; ms: number; typescript: string }
  | { type: 'failed'; message: string }
  | { type: 'response'; id: number; result: unknown }
  | { type: 'error'; id: number; message: string }
