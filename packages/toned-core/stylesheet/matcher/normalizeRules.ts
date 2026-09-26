import type { QueryPredicate } from '../../system/queries.ts'
import {
  bindQueryPart,
  isQueryKey,
  queryExpression,
  type QueryKey,
} from '../../system/query-key.ts'
import { mergeStyle } from '../../utils/mergeStyle.ts'
import { warnOnce } from '../../utils/warn.ts'
import { resolveCrossHoverCss } from '../crossHover.ts'
import { relationFactKey } from '../relations.ts'
import { declarationLayers } from '../removals.ts'
import {
  type RuleObject,
  TOKEN_OPERATIONS,
  type TokenOperation,
} from '../rule-protocol.ts'
import { unescapeSelectorPart } from '../variantSelector.ts'
import { specializeQuery } from './specializeQuery.ts'

export {
  CONDITIONAL_RULES,
  type ConditionalRule,
  RULE_LAYERS,
  type RuleObject,
  TOKEN_OPERATIONS,
  type TokenOperation,
} from '../rule-protocol.ts'

export type Conditions = ReadonlyMap<string, readonly string[]>
export interface NormalizedRule {
  readonly conditions: Conditions
  readonly original: string
  readonly rule: RuleObject
  readonly predicate?: QueryPredicate
}

function escapePart(value: string): string {
  return value
    .replace(/%/g, '%25')
    .replace(/=/g, '%3D')
    .replace(/\|/g, '%7C')
    .replace(/,/g, '%2C')
}

function identity(conditions: Conditions): string {
  return [...conditions]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(
      ([key, values]) =>
        `${escapePart(key)}=${values.map(escapePart).sort().join(',')}`,
    )
    .join('|')
}

/** Repeated axes in a single key are OR; nesting intersects constraints. */
export function parseVariantSelector(selector: string): Map<string, string[]> {
  const result = new Map<string, string[]>()
  const wildcards = new Set<string>()
  let consumed = 0
  for (const match of selector.matchAll(/\[([^=\]]+)(?:=([^\]]*))?\]/g)) {
    if (match.index !== consumed)
      throw new Error(`Invalid Toned variant selector: ${selector}`)
    consumed += match[0].length
    const key = unescapeSelectorPart(match[1]!)
    if (match[2] === '*') {
      wildcards.add(key)
      result.set(key, [])
      continue
    }
    if (wildcards.has(key)) continue
    const value = unescapeSelectorPart(match[2] ?? 'true')
    const values = result.get(key) ?? []
    if (!values.includes(value)) values.push(value)
    result.set(key, values)
  }
  if (result.size === 0 || consumed !== selector.length)
    throw new Error(`Invalid Toned variant selector: ${selector}`)
  return result
}

function constrain(
  base: Conditions,
  extra: Conditions,
): Conditions | undefined {
  const next = new Map(base)
  for (const [key, incoming] of extra) {
    if (!incoming.length) continue
    const previous = next.get(key)
    const values = previous
      ? incoming.filter((value) => previous.includes(value))
      : incoming
    if (!values.length) return undefined
    next.set(key, values)
  }
  return next
}

export function applyOperations(
  out: RuleObject,
  incoming: readonly TokenOperation[],
): void {
  let operations: TokenOperation[] = out[TOKEN_OPERATIONS as unknown as string]
  if (!operations) {
    operations = []
    for (const key in out) operations.push({ key, value: out[key], layer: 0 })
    Object.defineProperty(out, TOKEN_OPERATIONS, { value: operations })
  }
  for (const operation of incoming) {
    if (operation.conditional) {
      operations.push(operation)
      continue
    }
    const { key } = operation
    const value =
      key === 'style' || key === '$style'
        ? mergeStyle(out[key], operation.value)
        : operation.value
    // Later token occurrences also execute later when their output fields overlap.
    delete out[key]
    if (key === '__proto__')
      Object.defineProperty(out, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      })
    else out[key] = value
    operations.push(operation)
  }
}

function appendOperations(
  target: RuleObject,
  element: string,
  incoming: readonly TokenOperation[],
): void {
  let out = Object.hasOwn(target, element) ? target[element] : undefined
  if (!out) {
    out = Object.create(null)
    Object.defineProperty(target, element, {
      value: out,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  applyOperations(out, incoming)
}

/**
 * Source-ordered rule occurrences, separate from their canonical predicate.
 * Repeated predicates retain each occurrence instead of changing the first
 * declaration's position in an object map. Base fields remain defaults.
 */
export function normalizeRules(
  rules: RuleObject,
  options: {
    cssMediaMode: boolean
    cssPseudoMode: boolean
    stateAliases?: readonly string[]
    sourceOrder?: boolean
    platform?: 'web' | 'native'
  },
) {
  const elementSet = new Set<string>()
  const scheme: Record<string, Set<string>> = Object.create(null)
  const interactions: Record<string, Record<string, boolean>> = Object.create(
    null,
  )
  const list: Record<string, { rule: RuleObject }> = Object.create(null)
  const ordered: NormalizedRule[] = []
  let hasMediaRules = false
  let hasPlatformQueries = false
  const recordPlatformQuery = () => {
    hasPlatformQueries = true
  }
  let conditionDepth = 0
  let predicate: QueryPredicate | undefined
  let deferred: Array<() => void> = []
  let predicateIdentity = ''
  const conditionIdentities = new WeakMap<object, string>()
  const layers: RuleObject[] = declarationLayers(rules)
  let layer = 0
  let layerBase: RuleObject = {}

  const isElement = (key: string) =>
    !['[', '@', ':', '$'].includes(key[0]!) &&
    !key.includes(':') &&
    key !== 'prototype'
  const isCross = (key: string) =>
    key.includes(':') && !['[', '@', ':', '$'].includes(key[0]!)

  const collectElements = (node: RuleObject) => {
    for (const key in node) {
      if (isElement(key)) elementSet.add(key)
      else if (key.startsWith('$') && !key.startsWith('$$'))
        elementSet.add(key.slice(1))
      else if (key[0] === '[' || key[0] === '@' || isCross(key)) {
        collectElements(node[key])
      }
    }
  }
  for (const declaration of layers) {
    collectElements(declaration)
  }

  const emit = (
    conditions: Conditions,
    element: string,
    key: string,
    value: unknown,
  ) => {
    if (key.endsWith('$webRules') && (key !== '$webRules' || predicate))
      throw new Error(
        'Toned: $webRules is a separate selector extension; express selector conditions in its &-anchored rules',
      )
    let conditionIdentity = conditionIdentities.get(conditions)
    if (conditionIdentity === undefined) {
      conditionIdentity = identity(conditions)
      conditionIdentities.set(conditions, conditionIdentity)
    }
    const base = !conditions.size && !conditionDepth && !predicate
    const original =
      base && layer === 0
        ? ''
        : JSON.stringify([
            layer,
            conditionIdentity || (conditionDepth ? '*' : ''),
            predicateIdentity,
          ])
    const incoming = [{ key, value, layer }]
    list[original] ??= { rule: {} }
    const entry = list[original]
    appendOperations(entry.rule, element, incoming)
    if (!conditions.size && !conditionDepth && !predicate) {
      if (layer) appendOperations(layerBase, element, incoming)
      return
    }
    const previous = ordered[ordered.length - 1]
    if (previous?.original === original)
      appendOperations(previous.rule, element, incoming)
    else {
      const rule = {}
      appendOperations(rule, element, incoming)
      ordered.push({
        conditions,
        original,
        rule,
        ...(predicate ? { predicate } : {}),
      })
    }
  }

  const withConditions = (
    base: Conditions,
    extra: Conditions,
    apply: (next: Conditions) => void,
  ) => {
    for (const [key, values] of extra) {
      scheme[key] ??= new Set()
      const known = scheme[key]
      for (const value of values) known.add(value)
    }
    const next = constrain(base, extra)
    if (next) {
      const declarationLayer = layer
      const visit = () => {
        const previousLayer = layer
        layer = declarationLayer
        conditionDepth++
        apply(next)
        conditionDepth--
        layer = previousLayer
      }
      // Legacy declarations specialize their complete parent rule, including
      // later sibling parts. Only nested traversal is deferred: overlapping
      // sibling variants still execute in declaration order, without a global
      // specificity sort. Explicit descriptors and query keys use occurrence order.
      if (!options.sourceOrder && !predicate) deferred.push(visit)
      else visit()
    }
  }

  const localMap = (element: string, node: RuleObject): RuleObject => {
    const result: RuleObject = Object.create(null)
    for (const key in node) {
      if (
        (key[0] === '$' &&
          !key.startsWith('$$') &&
          !['$style', '$kind', '$grid', '$area', '$compose'].includes(key)) ||
        elementSet.has(key)
      ) {
        result[key.replace(/^\$/, '')] = node[key]
      } else {
        result[element] ??= {}
        result[element][key] = node[key]
      }
    }
    return result
  }

  const withQuery = (
    input: QueryPredicate | QueryKey,
    part: string | undefined,
    apply: () => void,
  ) => {
    const bound = bindQueryPart(queryExpression(input), part)
    const query = options.platform
      ? specializeQuery(bound, options.platform, recordPlatformQuery)
      : bound
    if (query.op === 'any' && query.operands.length === 0) return
    registerPredicate(query)
    const declarationLayer = layer
    const visit = () => {
      const savedPredicate = predicate
      const savedIdentity = predicateIdentity
      const savedLayer = layer
      layer = declarationLayer
      predicate = savedPredicate
        ? { op: 'all', operands: [savedPredicate, query] }
        : query
      predicateIdentity = `?${JSON.stringify(predicate)}`
      apply()
      predicate = savedPredicate
      predicateIdentity = savedIdentity
      layer = savedLayer
    }
    if (!options.sourceOrder && !predicate) deferred.push(visit)
    else visit()
  }

  const walkElement = (
    conditions: Conditions,
    element: string,
    node: RuleObject,
    prefix: string,
  ) => {
    elementSet.add(element)
    // Direct legacy exec supplies an occurrence stream after its one-time
    // spelling adapter. Consume it through this same declaration traversal.
    const occurrences: readonly TokenOperation[] | undefined =
      node[TOKEN_OPERATIONS as unknown as string]
    if (occurrences) {
      const savedLayer = layer
      for (const occurrence of occurrences) {
        layer = occurrence.layer
        conditionDepth++
        if (occurrence.conditional) {
          const savedPredicate = predicate
          const savedIdentity = predicateIdentity
          const bound = bindQueryPart(
            queryExpression(occurrence.conditional.predicate),
            element,
          )
          const query = options.platform
            ? specializeQuery(bound, options.platform, recordPlatformQuery)
            : bound
          registerPredicate(query)
          predicate = savedPredicate
            ? { op: 'all', operands: [savedPredicate, query] }
            : query
          predicateIdentity = `?${JSON.stringify(predicate)}`
          walkElement(conditions, element, occurrence.conditional.style, prefix)
          predicate = savedPredicate
          predicateIdentity = savedIdentity
        } else
          walkElement(
            conditions,
            element,
            { [occurrence.key]: occurrence.value },
            prefix,
          )
        conditionDepth--
      }
      layer = savedLayer
      return
    }
    for (const key in node) {
      if (isQueryKey(key)) {
        withQuery(key, element, () =>
          walk(conditions, localMap(element, node[key]), prefix),
        )
      } else if (key[0] === ':' && key.includes('_')) {
        emit(conditions, element, prefix + key, node[key])
      } else if (key[0] === ':' || key[0] === '@') {
        const pseudo = key[0] === ':'
        if (!pseudo) hasMediaRules = true
        const css = pseudo ? options.cssPseudoMode : options.cssMediaMode
        if (css) {
          // Preserve nesting in the lowered property path, including media →
          // state and state → media, rather than mistaking a block for a token.
          walkElement(conditions, element, node[key], `${prefix}${key}_`)
        } else {
          const facts = new Map<string, string[]>()
          if (pseudo) {
            interactions[element] ??= {}
            for (const state of key.slice(1).split(':')) {
              interactions[element][`:${state}`] = true
              facts.set(`${element}:${state}`, ['true'])
            }
          } else facts.set(key, ['true'])
          withConditions(conditions, facts, (next) =>
            walk(next, localMap(element, node[key]), prefix),
          )
        }
      } else if (key[0] === '[') {
        withConditions(conditions, parseVariantSelector(key), (next) =>
          walk(next, localMap(element, node[key]), prefix),
        )
      } else if (
        elementSet.has(key) ||
        (key[0] === '$' && elementSet.has(key.slice(1)))
      ) {
        // Explicit target references occur in the legacy local pseudo grammar.
        walkElement(conditions, key.replace(/^\$/, ''), node[key], prefix)
      } else {
        emit(conditions, element, prefix + key, node[key])
      }
    }
  }

  const walk = (conditions: Conditions, node: RuleObject, prefix = '') => {
    const parentDeferred = deferred
    deferred = []
    for (const key in node) {
      if (isQueryKey(key)) {
        withQuery(key, undefined, () => walk(conditions, node[key], prefix))
      } else if (key[0] === '[') {
        withConditions(conditions, parseVariantSelector(key), (next) =>
          walk(next, node[key], prefix),
        )
      } else if (key[0] === '@') {
        hasMediaRules = true
        if (options.cssMediaMode)
          walk(conditions, node[key], `${prefix}${key}_`)
        else
          withConditions(conditions, new Map([[key, ['true']]]), (next) =>
            walk(next, node[key], prefix),
          )
      } else if (isCross(key)) {
        if (options.cssPseudoMode)
          warnOnce(
            'cross-element-pseudo-css-mode',
            `'${key}' is a cross-element pseudo selector and runs through runtime event handlers; self pseudos and base-level hover sources remain CSS.`,
          )
        const [source, ...states] = key.split(':')
        const element = source?.replace(/~$/, '')
        if (!element || !elementSet.has(element)) continue
        interactions[element] ??= {}
        const extra = new Map<string, string[]>()
        for (const state of states) {
          interactions[element][`:${state}`] = true
          extra.set(`${source}:${state}`, ['true'])
        }
        withConditions(conditions, extra, (next) =>
          walk(next, node[key], prefix),
        )
      } else {
        walkElement(conditions, key.replace(/^\$/, ''), node[key], prefix)
      }
    }
    for (const visit of deferred) visit()
    deferred = parentDeferred
  }

  const registerPredicate = (query: QueryPredicate): void => {
    if (query.op === 'relation') {
      const relation = query.relation
      for (const part of [relation.sourcePart, relation.part])
        if (!elementSet.has(part))
          throw new Error(`Unknown relation part: ${part}`)
      if (!['child', 'descendant'].includes(relation.scope))
        throw new Error(`Unknown relation scope: ${relation.scope}`)
      scheme[relationFactKey(relation)] = new Set(['true'])
      interactions[relation.part] ??= {}
      interactions[relation.part]![`:${relation.state}`] = true
      return
    }
    if (query.op === 'not') {
      registerPredicate(query.operand)
      return
    }
    if (query.op !== 'atom') {
      for (const child of query.operands) registerPredicate(child)
      return
    }
    const key = query.key
    if (key[0] === ':')
      throw new Error(
        'A sheet-level query state needs q.part(name).state(name)',
      )
    if (key.startsWith('@platform.')) {
      if (key !== '@platform.web' && key !== '@platform.native')
        throw new Error(`Toned: unknown platform ${key}`)
      return
    }
    if (key[0] === '[') {
      for (const [axis, values] of parseVariantSelector(key)) {
        scheme[axis] ??= new Set()
        const known = scheme[axis]
        for (const value of values) known.add(value)
      }
    } else if (key[0] === '@') {
      hasMediaRules = true
      if (!options.cssMediaMode) {
        scheme[key] ??= new Set()
        scheme[key].add('true')
      }
    } else if (isCross(key)) {
      const [part, state] = key.split(':')
      if (!part || !state || !elementSet.has(part))
        throw new Error(`Unknown query part/state: ${key}`)
      // Cross-part state is a controller fact even in CSS mode. The compiler
      // keeps a same-part condition symbolic, but a named sibling/descendant
      // relationship must not silently become the nearest `_s` CSS source.
      scheme[key] ??= new Set()
      const values = scheme[key]
      values.add('true')
      interactions[part] ??= {}
      interactions[part][`:${state}`] = true
    } else throw new Error(`Unsupported query atom: ${key}`)
  }
  for (const authored of layers) {
    const start = ordered.length
    layerBase = {}
    predicate = undefined
    predicateIdentity = ''
    const declaration = options.cssPseudoMode
      ? resolveCrossHoverCss(authored, options.stateAliases ?? [], elementSet)
      : authored
    walk(new Map(), declaration)
    if (layer && Object.keys(layerBase).length) {
      ordered.splice(start, 0, {
        conditions: new Map(),
        original: `layer${layer}/base`,
        rule: layerBase,
      })
    }
    layer++
  }
  return {
    scheme,
    list,
    ordered,
    interactions,
    elementSet,
    hasMediaRules,
    hasPlatformQueries,
    layers,
  }
}
