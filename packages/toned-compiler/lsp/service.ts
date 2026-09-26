import type {
  CompletionList,
  Diagnostic,
  DocumentSymbol,
  Hover,
  Location,
  Position,
  WorkspaceEdit,
} from 'vscode-languageserver/node.js'
import {
  CompletionItemKind,
  DiagnosticSeverity,
  SymbolKind,
} from 'vscode-languageserver/node.js'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { proposeValueEdit } from '../edits.ts'
import type {
  DesignChange,
  DesignNode,
  DesignValue,
  SourceSpan,
} from '../model.ts'
import { DesignProject } from '../project.ts'

/** Transport-independent language features share the agent/inspector's index. */
export class DesignLanguageService {
  readonly project: DesignProject
  private readonly documents = new Map<string, TextDocument>()
  constructor(project = new DesignProject()) {
    this.project = project
  }
  document(uri: string): TextDocument | undefined {
    const source = this.project.get(uri)
    if (!source) {
      this.documents.delete(uri)
      return undefined
    }
    const previous = this.documents.get(uri)
    if (
      previous?.version === source.version &&
      previous.getText() === source.text
    )
      return previous
    const document = TextDocument.create(
      uri,
      'typescriptreact',
      source.version,
      source.text,
    )
    this.documents.delete(uri)
    if (this.documents.size >= 256)
      this.documents.delete(this.documents.keys().next().value!)
    this.documents.set(uri, document)
    return document
  }
  forget(uri: string) {
    this.documents.delete(uri)
    this.project.remove(uri)
  }
  dispose() {
    this.documents.clear()
    this.project.dispose()
  }
  private range(uri: string, span: SourceSpan) {
    const document = this.document(uri)
    if (!document) throw new Error('Document is not indexed')
    return {
      start: document.positionAt(span.start),
      end: document.positionAt(span.end),
    }
  }
  private tokens(node: DesignNode): readonly DesignNode[] {
    const sheet = this.project
      .lookup(node.owner, node.uri)
      .find((entry) => entry.kind === 'sheet')
    if (!sheet?.system) return []
    const system = this.project
      .lookup(sheet.system, sheet.uri)
      .find((entry) => entry.kind === 'system')
    return system
      ? this.project.query({
          kind: 'token',
          owner: system.owner,
          uri: system.uri,
          limit: 500,
        }).items
      : []
  }
  hover(uri: string, position: Position): Hover | null {
    const document = this.document(uri),
      node = document && this.project.at(uri, document.offsetAt(position))
    if (!node) return null
    const lines = [
      `${node.kind} ${node.owner}${node.path.length ? ` / ${node.path.join(' / ')}` : ''}`,
    ]
    if (node.expression)
      lines.push(`Declaration: ${node.expression.slice(0, 4000)}`)
    if (node.variants) lines.push(`Variants: ${JSON.stringify(node.variants)}`)
    if (node.values)
      lines.push(`Allowed values: ${JSON.stringify(node.values)}`)
    if (node.opaque) lines.push(node.opaque)
    return {
      contents: { kind: 'plaintext', value: lines.join('\n\n') },
      range: this.range(uri, node.selection),
    }
  }
  completions(uri: string, position: Position): CompletionList {
    const document = this.document(uri)
    if (!document) return { isIncomplete: false, items: [] }
    const offset = document.offsetAt(position),
      node = this.project.at(uri, offset)
    if (!node) return { isIncomplete: false, items: [] }
    if (node.path.includes('$style') || node.path.includes('style'))
      return { isIncomplete: false, items: [] }
    const tokens = this.tokens(node)
    const token =
      node.kind === 'declaration'
        ? tokens.find((entry) => entry.name === node.name)
        : undefined
    if (token?.values && node.valueSpan && offset >= node.valueSpan.start) {
      const current = document.getText().slice(node.valueSpan.start, offset)
      const quote = current.startsWith("'")
        ? "'"
        : current.startsWith('"')
          ? '"'
          : undefined
      return {
        isIncomplete: token.values.length > 500,
        items: token.values.slice(0, 500).map((value) => ({
          label: String(value),
          kind: CompletionItemKind.EnumMember,
          detail: `${token.owner}.${token.name}`,
          textEdit: {
            range: this.range(uri, node.valueSpan!),
            newText:
              typeof value === 'string' && quote === "'"
                ? `'${JSON.stringify(value).slice(1, -1).replace(/'/g, "\\'")}'`
                : JSON.stringify(value),
          },
        })),
      }
    }
    return {
      isIncomplete: tokens.length >= 500,
      items: tokens.map((token) => ({
        label: token.name,
        kind: CompletionItemKind.Property,
        detail: `Toned token · ${token.values?.length ?? 'dynamic'} values`,
        documentation: token.values
          ? JSON.stringify(token.values)
          : 'Value domain is not statically enumerable.',
      })),
    }
  }
  definition(uri: string, position: Position): readonly Location[] {
    const document = this.document(uri)
    if (!document) return []
    const offset = document.offsetAt(position),
      source = this.project.get(uri)!
    const reference = source.references.find(
      (entry) => entry.span.start <= offset && offset < entry.span.end,
    )
    const node = this.project.at(uri, offset)
    const candidates = reference
      ? this.project.lookup(reference.name, uri)
      : node?.kind === 'declaration'
        ? this.tokens(node).filter((token) => token.name === node.name)
        : []
    return candidates.map((target) => ({
      uri: target.uri,
      range: this.range(target.uri, target.selection),
    }))
  }
  references(uri: string, position: Position): readonly Location[] {
    const document = this.document(uri)
    if (!document) return []
    const offset = document.offsetAt(position)
    const reference = this.project
      .get(uri)!
      .references.find(
        (entry) => entry.span.start <= offset && offset < entry.span.end,
      )
    const node = reference
      ? this.project.lookup(reference.name, uri)[0]
      : this.project.at(uri, offset)
    if (!node) return []
    const page = this.project.referencesTo(node)
    if (page.next !== undefined)
      throw new Error(
        'Toned references exceed the 500-result limit; use the owning TypeScript service or the paged source index',
      )
    return page.items.map((reference) => ({
      uri: reference.uri,
      range: this.range(reference.uri, reference),
    }))
  }
  symbols(uri: string): readonly DocumentSymbol[] {
    return (this.project.get(uri)?.nodes ?? [])
      .filter((node) => node.kind !== 'declaration')
      .map((node) => ({
        name: node.name,
        detail: `Toned ${node.kind}`,
        kind:
          node.kind === 'sheet' || node.kind === 'system'
            ? SymbolKind.Namespace
            : SymbolKind.Property,
        range: this.range(uri, node.span),
        selectionRange: this.range(uri, node.selection),
      }))
  }
  diagnostics(uri: string): readonly Diagnostic[] {
    const source = this.project.get(uri)
    if (!source) return []
    const diagnostics: Diagnostic[] = source.diagnostics.map((entry) => ({
      range: this.range(uri, entry.span),
      source: 'toned',
      code: entry.code,
      message: entry.message,
      severity:
        entry.severity === 'error'
          ? DiagnosticSeverity.Error
          : entry.severity === 'warning'
            ? DiagnosticSeverity.Warning
            : DiagnosticSeverity.Information,
    }))
    const tokens = new Map<string, readonly DesignNode[]>()
    const domains = new Map<string, Set<string>>()
    for (const node of source.nodes) {
      if (
        node.kind !== 'declaration' ||
        node.path.includes('$style') ||
        node.path.includes('style') ||
        node.value === undefined ||
        node.opaque
      )
        continue
      if (!tokens.has(node.owner)) tokens.set(node.owner, this.tokens(node))
      const token = tokens
        .get(node.owner)!
        .find((entry) => entry.name === node.name)
      if (token?.values && !domains.has(token.id))
        domains.set(
          token.id,
          new Set(token.values.map((value) => JSON.stringify(value))),
        )
      if (
        token?.values &&
        !domains.get(token.id)!.has(JSON.stringify(node.value))
      )
        diagnostics.push({
          range: this.range(uri, node.valueSpan ?? node.selection),
          source: 'toned',
          code: 'token-value',
          severity: DiagnosticSeverity.Warning,
          message: `Value is not in the indexed ${node.name} vocabulary. The TypeScript service remains authoritative for dynamic token types.`,
        })
    }
    return diagnostics
  }
  propose(input: {
    nodeId: string
    value: DesignValue
    expectedVersion: number
    scope: { uri: string; owner: string; path?: readonly string[] }
  }): { change: DesignChange; workspaceEdit: WorkspaceEdit } {
    const change = proposeValueEdit(this.project, input)
    return {
      change,
      workspaceEdit: {
        documentChanges: [
          {
            textDocument: {
              uri: change.edit.uri,
              version: change.edit.version,
            },
            edits: [
              {
                range: this.range(change.edit.uri, change.edit.span),
                newText: change.edit.after,
              },
            ],
          },
        ],
      },
    }
  }
}
