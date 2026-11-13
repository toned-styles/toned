/** Content keys for memoising pure resolution over plain declaration data. */

/** A key that is equal exactly when two values hold the same plain data, in
 * the same key order, or undefined when any member is not plain data (class
 * instances, functions, symbols, symbol-keyed metadata, cycles). Distinct
 * numbers stay distinct: NaN, null, -0 and 0 each have their own spelling. */
export function plainKey(value: unknown): string | undefined {
  const seen: object[] = []
  const visit = (member: unknown): string | undefined => {
    switch (typeof member) {
      case 'string':
        return JSON.stringify(member)
      case 'number':
        return Object.is(member, -0) ? 'n-0' : `n${member}`
      case 'boolean':
        return member ? 't' : 'f'
      case 'undefined':
        return 'u'
      case 'object': {
        if (member === null) return 'N'
        if (seen.includes(member)) return undefined
        const proto = Object.getPrototypeOf(member)
        const array = Array.isArray(member)
        if (
          array
            ? proto !== Array.prototype
            : proto !== Object.prototype && proto !== null
        )
          return undefined
        if (Object.getOwnPropertySymbols(member).length) return undefined
        seen.push(member)
        let key = array ? '[' : '{'
        for (const name of Object.keys(member)) {
          const child = visit((member as Record<string, unknown>)[name])
          if (child === undefined) return undefined
          key += array ? `${child},` : `${JSON.stringify(name)}:${child},`
        }
        seen.pop()
        return `${key}${array ? ']' : '}'}`
      }
      default:
        return undefined
    }
  }
  return visit(value)
}

/** A bounded most-recently-used map. */
export class BoundedMemo<V> {
  private readonly entries = new Map<string, V>()
  constructor(private readonly limit: number) {}
  get(key: string): V | undefined {
    const value = this.entries.get(key)
    if (value !== undefined) {
      this.entries.delete(key)
      this.entries.set(key, value)
    }
    return value
  }
  set(key: string, value: V): void {
    this.entries.delete(key)
    if (this.entries.size >= this.limit)
      this.entries.delete(this.entries.keys().next().value!)
    this.entries.set(key, value)
  }
}
