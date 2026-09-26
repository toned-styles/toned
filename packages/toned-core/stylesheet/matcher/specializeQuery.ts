import type { QueryPredicate } from '../../system/queries.ts'

const TRUE: QueryPredicate = Object.freeze({
  op: 'all',
  operands: Object.freeze([]),
})
const FALSE: QueryPredicate = Object.freeze({
  op: 'any',
  operands: Object.freeze([]),
})

/** Platform is immutable for a controller. Remove dead branches before their
 * states/relations become host subscription or capability requirements. */
export function specializeQuery(
  query: QueryPredicate,
  platform: 'web' | 'native',
  onPlatform?: () => void,
): QueryPredicate {
  if (query.op === 'relation') return query
  if (query.op === 'atom') {
    if (!query.key.startsWith('@platform.')) return query
    onPlatform?.()
    const name = query.key.slice(10)
    if (name !== 'web' && name !== 'native')
      throw new Error(`Toned: unknown platform ${name}`)
    return name === platform ? TRUE : FALSE
  }
  if (query.op === 'not') {
    const operand = specializeQuery(query.operand, platform, onPlatform)
    return operand === TRUE
      ? FALSE
      : operand === FALSE
        ? TRUE
        : { op: 'not', operand }
  }
  const operands = query.operands.map((operand) =>
    specializeQuery(operand, platform, onPlatform),
  )
  const decisive = query.op === 'all' ? FALSE : TRUE
  const neutral = query.op === 'all' ? TRUE : FALSE
  if (operands.includes(decisive)) return decisive
  const remaining = operands.filter((operand) => operand !== neutral)
  return remaining.length === 0
    ? neutral
    : remaining.length === 1
      ? remaining[0]!
      : { op: query.op, operands: remaining }
}
