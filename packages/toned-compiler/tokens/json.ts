export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }
export type JsonObject = { readonly [key: string]: JsonValue }
export const object = (value: unknown): value is Record<string, JsonValue> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
/** Validate before copying: bounded depth/node count, no cycles or executable data. */
export function snapshot(value: unknown): JsonValue {
  let nodes = 0,
    characters = 0
  const active = new Set<object>()
  const walk = (input: unknown, depth: number): JsonValue => {
    if (++nodes > 100000 || depth > 64)
      throw new Error('Toned DTCG: JSON node/depth budget exceeded')
    if (typeof input === 'string') {
      characters += input.length
      if (characters > 2000000)
        throw new Error('Toned DTCG: text budget exceeded')
      return input
    }
    if (
      input === null ||
      typeof input === 'boolean' ||
      (typeof input === 'number' && Number.isFinite(input))
    )
      return input
    if (
      typeof input !== 'object' ||
      (Object.getPrototypeOf(input) !== Object.prototype &&
        Object.getPrototypeOf(input) !== null &&
        !Array.isArray(input))
    )
      throw new Error('Toned DTCG: expected plain JSON values')
    if (active.has(input)) throw new Error('Toned DTCG: cyclic JSON input')
    active.add(input)
    let result: JsonValue
    if (Array.isArray(input)) {
      if (input.length > 100000)
        throw new Error('Toned DTCG: JSON node budget exceeded')
      const items: JsonValue[] = []
      for (let i = 0; i < input.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(input, String(i))
        if (!descriptor || descriptor.get || descriptor.set)
          throw new Error('Toned DTCG: sparse/accessor arrays are not JSON')
        items.push(walk(descriptor.value, depth + 1))
      }
      result = Object.freeze(items)
    } else {
      const out: Record<string, JsonValue> = Object.create(null)
      const keys = Object.keys(input)
      if (keys.length > 100000)
        throw new Error('Toned DTCG: JSON node budget exceeded')
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key)!
        if (descriptor.get || descriptor.set)
          throw new Error('Toned DTCG: accessors are not JSON')
        characters += key.length
        if (characters > 2000000)
          throw new Error('Toned DTCG: text budget exceeded')
        out[key] = walk(descriptor.value, depth + 1)
      }
      result = Object.freeze(out)
    }
    active.delete(input)
    return result
  }
  return walk(value, 0)
}
