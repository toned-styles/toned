import type { DesignChange, DesignEdit, DesignValue } from './model.ts'
import type { DesignProject } from './project.ts'
import { parseDesignDocument, sourceRevision } from './source.ts'

export interface EditScope {
  readonly uri: string
  readonly owner: string
  readonly path?: readonly string[]
}
function serialize(
  value: DesignValue,
  depth = 0,
  budget = { remaining: 100_000, characters: 100_000 },
): string {
  if (--budget.remaining < 0)
    throw new Error('Toned edit exceeds literal node budget')
  if (depth > 24) throw new Error('Toned edit exceeds literal depth budget')
  const fragment = (text: string) => {
    budget.characters -= text.length
    if (budget.characters < 0)
      throw new Error('Toned edit exceeds replacement budget')
    return text
  }
  const quoted = (text: string) => {
    if (text.length > budget.characters)
      throw new Error('Toned edit exceeds replacement budget')
    return fragment(JSON.stringify(text))
  }
  if (typeof value === 'number' && !Number.isFinite(value))
    throw new Error('Toned edit needs a finite number')
  if (typeof value === 'string') return quoted(value)
  if (value === null || typeof value === 'number' || typeof value === 'boolean')
    return fragment(Object.is(value, -0) ? '-0' : JSON.stringify(value))
  if (Array.isArray(value)) {
    if (value.length > budget.remaining)
      throw new Error('Toned edit exceeds literal node budget')
    fragment('[]' + ', '.repeat(Math.max(0, value.length - 1)))
    return `[${Array.from({ length: value.length }, (_, index) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, index)
      if (!descriptor || !('value' in descriptor))
        throw new Error('Toned edits accept dense plain arrays only')
      return serialize(descriptor.value, depth + 1, budget)
    }).join(', ')}]`
  }
  if (
    !value ||
    typeof value !== 'object' ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  )
    throw new Error('Toned edits accept plain data only')
  const properties = Object.getOwnPropertyDescriptors(value)
  const keys = Object.keys(properties).filter(
    (key) => properties[key]!.enumerable,
  )
  if (keys.length > budget.remaining)
    throw new Error('Toned edit exceeds literal node budget')
  fragment('{ }' + ', '.repeat(Math.max(0, keys.length - 1)))
  return `{ ${keys
    .map((key) => {
      const descriptor = properties[key]!
      if (!('value' in descriptor))
        throw new Error('Toned edits accept data properties only')
      const name =
        key === '__proto__'
          ? fragment('[') + quoted(key) + fragment(']')
          : quoted(key)
      return `${name}${fragment(': ')}${serialize(descriptor.value, depth + 1, budget)}`
    })
    .join(', ')} }`
}
/** Produce one precise literal edit; never execute or flatten an opaque expression. */
export function proposeValueEdit(
  project: DesignProject,
  input: {
    nodeId: string
    value: DesignValue
    scope: EditScope
    expectedVersion: number
  },
): DesignChange {
  const node = project.node(input.nodeId)
  if (!node) throw new Error('Unknown Toned source node')
  const document = project.get(node.uri)!
  if (document.version !== input.expectedVersion)
    throw new Error('Stale Toned edit: document version changed')
  if (
    node.uri !== input.scope.uri ||
    node.owner !== input.scope.owner ||
    (input.scope.path &&
      !input.scope.path.every((part, index) => node.path[index] === part))
  )
    throw new Error('Toned edit is outside its declared scope')
  if (!node.valueSpan || node.opaque)
    throw new Error(node.opaque ?? 'Select an editable declaration value')
  let after = serialize(input.value)
  // The model targets the inner literal so assertions, satisfies clauses and
  // parentheses remain unchanged around this replacement.
  const before = document.text.slice(node.valueSpan.start, node.valueSpan.end)
  if (typeof input.value === 'string' && before.startsWith("'"))
    after = `'${input.value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')}'`
  if (after.length > 100_000)
    throw new Error('Toned edit exceeds replacement budget')
  return {
    edit: {
      uri: node.uri,
      version: document.version,
      revision: document.revision,
      nodeId: node.id,
      span: node.valueSpan,
      before,
      after,
    },
    affected: project.dependents(node.uri),
    impact: 'declared-dependencies',
    limitations: [
      'Dependencies follow indexed relative imports; dynamic imports, package aliases and runtime consumers require integration evidence.',
      'A literal edit still needs the owning TypeScript and renderer checks before acceptance.',
    ],
  }
}
export function applyDesignEdit(
  text: string,
  version: number,
  edit: DesignEdit,
): string {
  if (
    version !== edit.version ||
    sourceRevision(text) !== edit.revision ||
    text.slice(edit.span.start, edit.span.end) !== edit.before
  )
    throw new Error('Stale Toned edit: source changed')
  if (
    !Number.isInteger(edit.span.start) ||
    !Number.isInteger(edit.span.end) ||
    edit.span.start < 0 ||
    edit.span.end < edit.span.start ||
    edit.span.end > text.length
  )
    throw new Error('Invalid edit span')
  const original = parseDesignDocument(edit.uri, text, version)
  const selected = original.nodes.find((node) => node.id === edit.nodeId)
  if (
    !selected?.valueSpan ||
    selected.opaque ||
    selected.valueSpan.start !== edit.span.start ||
    selected.valueSpan.end !== edit.span.end
  )
    throw new Error('Toned edit span does not match an editable source node')
  // Revalidate public/serialized edits as one literal expression; a forged edit
  // must not smuggle another property or executable statement into the source.
  const probe = parseDesignDocument(
    'file:///__toned_edit__.ts',
    `const edit = ui.stylesheet({ Root: { value: ${edit.after} } })`,
    0,
    { maxCharacters: 100_100 },
  )
  const literal = probe.nodes.find(
    (node) => node.kind === 'declaration' && node.name === 'value',
  )
  if (
    !literal ||
    literal.opaque ||
    literal.expression !== edit.after ||
    probe.diagnostics.some((item) => item.severity === 'error')
  )
    throw new Error('Toned edit replacement must be one literal expression')
  const next =
    text.slice(0, edit.span.start) + edit.after + text.slice(edit.span.end)
  // Parse the proposed document through the same bounded source model. No writes.
  const document = parseDesignDocument(edit.uri, next, version + 1)
  if (
    document.diagnostics.some(
      (diagnostic) => diagnostic.code === 'syntax-error',
    )
  )
    throw new Error('Toned edit produces invalid syntax')
  return next
}
