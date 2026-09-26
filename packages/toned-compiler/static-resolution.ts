import type { DesignDocument, DesignNode } from './model.ts'
import type { StaticExpression } from './static-source.ts'

type Value =
  | { kind: 'token'; node: DesignNode }
  | { kind: 'object'; members: Map<string, Value>; complete: boolean }
  | { kind: 'system'; tokens: Value; node?: DesignNode }
  | { kind: 'opaque' }
const opaque: Value = { kind: 'opaque' }
export interface ResolutionHost {
  get(uri: string): DesignDocument | undefined
  node(id: string): DesignNode | undefined
  resolveImport(uri: string, from: string): string | undefined
}
/** Bounded graph evaluation with dependency-invalidated, shared binding results. */
export class StaticResolution {
  private budget = 20_000
  private readonly active = new Set<string>()
  private readonly memo = new Map<
    string,
    { uri: string; value: Value; weight: number }
  >()
  private readonly byUri = new Map<string, Set<string>>()
  private readonly vocabularies = new WeakMap<object, readonly DesignNode[]>()
  private weight = 0
  private incomplete = 0
  private hits = 0
  private evaluations = 0
  get statistics() {
    return {
      entries: this.memo.size,
      weight: this.weight,
      hits: this.hits,
      evaluations: this.evaluations,
    }
  }
  invalidate(uris?: ReadonlySet<string>) {
    if (!uris) {
      this.memo.clear()
      this.byUri.clear()
      this.weight = 0
      return
    }
    for (const uri of uris)
      for (const key of this.byUri.get(uri) ?? []) this.forget(key)
  }
  private forget(key: string) {
    const entry = this.memo.get(key)
    if (!entry) return
    this.weight -= entry.weight
    this.memo.delete(key)
    const keys = this.byUri.get(entry.uri)
    keys?.delete(key)
    if (!keys?.size) this.byUri.delete(entry.uri)
  }
  private remember(key: string, uri: string, value: Value) {
    // Account for retained graphs, including shared subgraphs, conservatively.
    const seen = new Set<Value>(),
      queue = [value]
    let weight = 0
    while (queue.length) {
      const current = queue.pop()!
      if (seen.has(current)) continue
      seen.add(current)
      if (++weight > 20_000) return
      if (current.kind === 'system') queue.push(current.tokens)
      else if (current.kind === 'object') {
        weight += current.members.size
        if (weight > 20_000) return
        queue.push(...current.members.values())
      }
    }
    while (this.memo.size >= 512 || this.weight + weight > 100_000) {
      const oldest = this.memo.keys().next().value!
      this.forget(oldest)
    }
    const keys = this.byUri.get(uri) ?? new Set<string>()
    keys.add(key)
    this.byUri.set(uri, keys)
    this.memo.set(key, { uri, value, weight })
    this.weight += weight
  }
  private exhausted(depth: number) {
    if (--this.budget >= 0 && depth <= 64) return false
    this.incomplete++
    return true
  }
  private readonly host: ResolutionHost
  constructor(host: ResolutionHost) {
    this.host = host
  }
  private member(value: Value, name: string): Value {
    if (value.kind === 'system') {
      if (name === 'stylesheet' || name === 'system')
        return name === 'system' ? value.tokens : value
      return opaque
    }
    return value.kind === 'object'
      ? (value.members.get(name) ?? opaque)
      : opaque
  }
  private expression(
    uri: string,
    expression: StaticExpression,
    depth: number,
  ): Value {
    if (this.exhausted(depth)) return opaque
    switch (expression.kind) {
      case 'opaque':
        return opaque
      case 'ref':
        return this.binding(uri, expression.name, false, depth + 1)
      case 'token': {
        const node = this.host.node(expression.node)
        return node ? { kind: 'token', node } : opaque
      }
      case 'member':
        return this.member(
          this.expression(uri, expression.base, depth + 1),
          expression.name,
        )
      case 'system':
        return {
          kind: 'system',
          tokens: this.expression(uri, expression.tokens, depth + 1),
          node: expression.node ? this.host.node(expression.node) : undefined,
        }
      case 'omit': {
        const base = this.expression(uri, expression.base, depth + 1)
        if (base.kind !== 'object') return opaque
        this.budget -= base.members.size
        if (this.budget < 0) return opaque
        const members = new Map(base.members)
        for (const name of expression.names) members.delete(name)
        return { kind: 'object', members, complete: base.complete }
      }
      case 'object': {
        const members = new Map<string, Value>()
        let complete = true
        for (const entry of expression.entries) {
          if (--this.budget < 0) return opaque
          const value = this.expression(uri, entry.value, depth + 1)
          if (entry.name !== undefined) members.set(entry.name, value)
          else if (value.kind === 'object') {
            if (!value.complete) {
              members.clear()
              complete = false
            }
            for (const [name, child] of value.members) {
              if (--this.budget < 0) return opaque
              members.set(name, child)
            }
          } else {
            members.clear()
            complete = false
          }
        }
        return { kind: 'object', members, complete }
      }
    }
  }
  private namespace(uri: string, depth: number): Value {
    const module = this.host.get(uri)?.module
    if (!module || this.exhausted(depth)) return opaque
    const members = new Map<string, Value>()
    let complete = true
    for (const from of module.stars) {
      const target = this.host.resolveImport(uri, from)
      const value = target ? this.binding(target, '*', true, depth + 1) : opaque
      if (value.kind !== 'object') {
        complete = false
        continue
      }
      complete &&= value.complete
      for (const [name, child] of value.members) {
        if (--this.budget < 0) return opaque
        // Conflicting star exports are ambiguous; an explicit export below wins.
        members.set(name, members.has(name) ? opaque : child)
      }
    }
    for (const name of Object.keys(module.exports)) {
      if (--this.budget < 0) return opaque
      members.set(name, this.binding(uri, name, true, depth + 1))
    }
    return { kind: 'object', members, complete }
  }
  private binding(
    uri: string,
    name: string,
    exported: boolean,
    depth = 0,
  ): Value {
    if (this.exhausted(depth)) return opaque
    const key = `${uri}#${exported ? 'export' : 'local'}:${name}`
    if (this.active.has(key)) {
      this.incomplete++
      return opaque
    }
    const cached = this.memo.get(key)
    if (cached) {
      this.hits++
      return cached.value
    }
    this.evaluations++
    const incomplete = this.incomplete
    this.active.add(key)
    let value: Value = opaque
    const document = this.host.get(uri),
      module = document?.module
    if (name === '*' && exported) value = this.namespace(uri, depth + 1)
    else if (module) {
      if (exported) {
        const entry = module.exports[name]
        if (entry) {
          const target = entry.from
            ? this.host.resolveImport(uri, entry.from)
            : uri
          if (target)
            value = this.binding(
              target,
              entry.local,
              Boolean(entry.from),
              depth + 1,
            )
        } else {
          const namespace = this.namespace(uri, depth + 1)
          value = this.member(namespace, name)
        }
      } else if (module.bindings[name])
        value = this.expression(uri, module.bindings[name], depth + 1)
      else {
        const entry = document.imports.find(
          (entry) => entry.local === name && !entry.typeOnly,
        )
        const target = entry && this.host.resolveImport(uri, entry.from)
        if (target && entry)
          value = this.binding(target, entry.imported, true, depth + 1)
      }
    }
    this.active.delete(key)
    // Results reached through a cycle or exhausted budget are query-context dependent.
    if (this.budget >= 0 && this.incomplete === incomplete)
      this.remember(key, uri, value)
    return value
  }
  resolve(uri: string, name: string): Value {
    this.budget = 20_000
    const [first, ...members] = name.split('.')
    if (!first || members.length > 32) return opaque
    let value = this.binding(uri, first, false)
    for (const member of members) value = this.member(value, member)
    return value
  }
  tokens(uri: string, name: string): readonly DesignNode[] {
    let value = this.resolve(uri, name)
    // `import * as ui` exposes a named stylesheet alias, rather than a system instance.
    if (value.kind === 'object')
      value = value.members.get('stylesheet') ?? opaque
    if (value.kind !== 'system' || value.tokens.kind !== 'object') return []
    const cached = this.vocabularies.get(value.tokens)
    if (cached) return cached
    const tokens = Object.freeze(
      [...value.tokens.members].flatMap(([name, entry]) =>
        entry.kind === 'token' ? [Object.freeze({ ...entry.node, name })] : [],
      ),
    )
    this.vocabularies.set(value.tokens, tokens)
    return tokens
  }
  definition(uri: string, name: string): DesignNode | undefined {
    const value = this.resolve(uri, name)
    return value.kind === 'token' || value.kind === 'system'
      ? value.node
      : undefined
  }
}
