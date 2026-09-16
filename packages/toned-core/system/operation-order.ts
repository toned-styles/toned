import type { TokenOperation } from '../stylesheet/matcher/normalizeRules.ts'

const OPERATIONS = Symbol.for('@toned/operations')
type Style = Record<string, unknown>
type Resolve = (declaration: Record<string, unknown>) => Style

/** Apply only contested fields; uncontested tokens keep their atomic classes.
 * Layer boundaries are authoritative even when a legacy system retains its
 * historical pseudo order inside each layer. */
export function applyOperationOrder(
  operations: readonly TokenOperation[],
  output: Style,
  strict: boolean,
  resolve: Resolve,
): void {
  const layers = new Set(operations.map((operation) => operation.layer ?? 0))
  const layered = layers.size > 1
  const writes = new Map<string, Set<string>>()
  const resolved: Array<TokenOperation & { style: Style }> = []
  for (const operation of operations) {
    const { key, value } = operation
    if (key.startsWith('$') || key === 'className' || value == null) continue
    const conditional = key.startsWith(':') || key.startsWith('@')
    if (conditional && !strict && !layered) continue
    const style = resolve({ [key]: value })
    resolved.push({ ...operation, style })
    for (const property of Object.keys(style)) {
      if (property.startsWith('--')) continue
      const owners = writes.get(property) ?? new Set<string>()
      owners.add(key)
      writes.set(property, owners)
    }
  }
  const conflicts = [...writes]
    .filter(([, owners]) => owners.size > 1)
    .map(([property]) => property)
  if (!conflicts.length) return
  let ordered: Style = {}
  if (layered && !strict) {
    for (const layer of layers) {
      const group = operations.filter(
        (operation) => (operation.layer ?? 0) === layer,
      )
      const declaration: Record<string | symbol, unknown> = { style: ordered }
      for (const { key, value } of group) {
        if (key === 'style')
          declaration[key] = {
            ...(declaration[key] as object),
            ...(value as object),
          }
        else {
          delete declaration[key]
          declaration[key] = value
        }
      }
      Object.defineProperty(declaration, OPERATIONS, { value: group })
      ordered = resolve(declaration as Record<string, unknown>)
    }
  } else {
    for (const operation of resolved) {
      if (operation.key.startsWith(':') || operation.key.startsWith('@'))
        ordered = resolve({ style: ordered, [operation.key]: operation.value })
      else Object.assign(ordered, operation.style)
    }
  }
  for (const property of conflicts) {
    if (
      !strict &&
      !layered &&
      typeof output[property] === 'string' &&
      String(output[property]).includes('var(--toned_')
    )
      continue
    if (ordered[property] !== undefined) output[property] = ordered[property]
  }
  if (strict || layered)
    for (const [key, value] of Object.entries(ordered))
      if (key.startsWith('--')) output[key] = value
}

/** Advanced browser predicates belong to the same occurrence stream as tokens.
 * Flush a static segment at each guard and layer boundary so later unconditional
 * fields replace earlier guarded fields, while unrelated guarded fields survive. */
export function applyConditionalOrder(
  operations: readonly TokenOperation[],
  resolve: Resolve,
  applyConditional: (
    style: Style,
    record: NonNullable<TokenOperation['conditional']>,
  ) => void,
): Style {
  let output: Style = {}
  let pending: TokenOperation[] = []
  const flush = () => {
    if (!pending.length) return
    const declaration: Record<string | symbol, unknown> = { style: output }
    for (const { key, value } of pending) {
      if (key === 'style')
        declaration[key] = {
          ...(declaration[key] as object),
          ...(value as object),
        }
      else {
        delete declaration[key]
        declaration[key] = value
      }
    }
    // Include the prior resolved fields in ordering: a later token must beat a
    // prior guard even if it writes through another token or raw-style alias.
    const prior: TokenOperation = {
      key: 'style',
      value: output,
      layer: pending[0]!.layer - 1,
    }
    Object.defineProperty(declaration, OPERATIONS, {
      value: [prior, ...pending],
    })
    output = resolve(declaration as Record<string, unknown>)
    pending = []
  }
  for (const operation of operations) {
    if (operation.conditional) {
      flush()
      applyConditional(output, operation.conditional)
    } else {
      if (pending.length && pending[0]!.layer !== operation.layer) flush()
      pending.push(operation)
    }
  }
  flush()
  return output
}
