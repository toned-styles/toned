/** Serializable protocol shared by editor, agent and visual tooling. Offsets are UTF-16. */
export type DesignValue =
  | null
  | boolean
  | number
  | string
  | readonly DesignValue[]
  | { readonly [key: string]: DesignValue }
export type DesignKind =
  | 'system'
  | 'token'
  | 'sheet'
  | 'part'
  | 'declaration'
  | 'family'
export interface SourceSpan {
  readonly start: number
  readonly end: number
}
export interface DesignNode {
  readonly id: string
  readonly uri: string
  readonly kind: DesignKind
  readonly name: string
  readonly owner: string
  readonly path: readonly string[]
  readonly span: SourceSpan
  readonly selection: SourceSpan
  readonly valueSpan?: SourceSpan
  readonly value?: DesignValue
  readonly expression?: string
  readonly opaque?: string
  readonly description?: string
  /** False when enumerable suggestions are only part of an open/modifier domain. */
  readonly valuesComplete?: boolean
  readonly values?: readonly DesignValue[]
  readonly variants?: Readonly<Record<string, readonly DesignValue[] | null>>
  readonly variantType?: string
  readonly system?: string
  readonly target?: string
}
export interface DesignImport {
  readonly typeOnly?: boolean
  readonly local: string
  readonly imported: string
  readonly from: string
  readonly span: SourceSpan
}
export interface DesignReference {
  readonly name: string
  readonly span: SourceSpan
  readonly owner?: string
}
export interface DesignDiagnostic {
  readonly code: string
  readonly message: string
  readonly severity: 'error' | 'warning' | 'information'
  readonly span: SourceSpan
}
export interface DesignDocument {
  readonly module?: import('./static-source.ts').StaticModule
  readonly uri: string
  readonly version: number
  readonly revision: string
  readonly text: string
  readonly nodes: readonly DesignNode[]
  readonly imports: readonly DesignImport[]
  readonly references: readonly DesignReference[]
  readonly diagnostics: readonly DesignDiagnostic[]
}
export interface DesignPage<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly next?: number
  readonly revision: number
}
export interface DesignEdit {
  readonly uri: string
  readonly version: number
  readonly revision: string
  readonly nodeId: string
  readonly span: SourceSpan
  readonly before: string
  readonly after: string
}
export interface DesignChange {
  readonly edit: DesignEdit
  readonly affected: readonly string[]
  readonly impact: 'declared-dependencies'
  readonly limitations: readonly string[]
}
export interface DesignSnapshot {
  readonly revision: number
  readonly nodes: readonly DesignNode[]
  readonly diagnostics: readonly (DesignDiagnostic & { readonly uri: string })[]
}
