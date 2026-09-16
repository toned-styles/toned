import {
  type CompiledPlan,
  type DeclarationOperation,
  type Facts,
  type Predicate,
  type ResolvedOperation,
  resolvePlan,
} from '../../core/plan.ts'
import { evaluatePredicate, FALSE } from '../../core/predicates.ts'
import { resolveAlphaChannels } from '../../core/resolve.ts'
import { namespaceOutput } from '../../system/namespace.ts'
import type { TokenSystem, Tokens } from '../../types/index.ts'
import {
  alphaVarName,
  alphaWrappable,
  DEFAULT_ALPHA_STEPS,
  splitAlphaValue,
  withAlphaExpr,
} from '../../utils/alpha.ts'
import { atomSlug, lengthToPx } from '../../utils/conditions.ts'
import { serializeCssValue } from '../../utils/css-value.ts'
import { PSEUDO_CASCADE_ORDER } from '../../utils/pseudo.ts'
import { warnOnce } from '../../utils/warn.ts'
import { compileWebRules, isWebRules } from '../../web/rules.ts'
import type { ResolvedProps } from '../index.ts'

const EXTENSIONS = [
  '$grid',
  '$area',
  '$webRules',
  '$pseudoRules',
  'className',
] as const
const extensionIndexes = new WeakMap<
  CompiledPlan,
  {
    sources: ReadonlySet<string>
    extensions: ReadonlyMap<string, readonly DeclarationOperation[]>
  }
>()
function extensionIndex(plan: CompiledPlan) {
  let index = extensionIndexes.get(plan)
  if (!index) {
    const sources = new Set<string>()
    const extensions = new Map<string, DeclarationOperation[]>()
    for (const operation of [...plan.operations, ...plan.extensions]) {
      if (operation.origin.legacyChannel)
        sources.add(operation.origin.legacyChannel.source)
    }
    for (const extension of plan.extensions) {
      const part = extension.origin.part
      const entries = extensions.get(part) ?? []
      entries.push(extension)
      extensions.set(part, entries)
    }
    index = { sources, extensions }
    extensionIndexes.set(plan, index)
  }
  return index
}

const unconditional = (predicate: Predicate) =>
  predicate.op === 'all' && predicate.operands.length === 0

/** Compatibility is an adapter policy, not a second declaration compiler. The
 * old root source grammar retains its nearest-source CSS channel. Explicit
 * relation queries continue to use host topology facts on every backend. */
function browserPredicate(operation: DeclarationOperation): Predicate {
  const channel = operation.origin.legacyChannel
  if (!channel) return operation.predicate
  const map = (predicate: Predicate): Predicate => {
    if (predicate.op === 'atom') {
      const fact = predicate.fact
      return fact.kind === 'state' &&
        fact.part.replace(/~$/, '') === channel.source &&
        fact.name === channel.state
        ? {
            op: 'atom',
            fact: {
              kind: 'state',
              part: operation.origin.part,
              name: `${channel.scope === 'sibling' ? 'sib' : 'src'}-${channel.state}`,
            },
          }
        : predicate
    }
    return predicate.op === 'not'
      ? { op: 'not', operand: map(predicate.operand) }
      : { op: predicate.op, operands: predicate.operands.map(map) }
  }
  return map(operation.predicate)
}

/** Linear Boolean guard lowering over semantic facts. No selector keys are
 * decoded here: declaration spelling was consumed once by compilePlan. */
export function compileCssPredicateGuard(
  predicate: Predicate,
  part: string,
  prefix: string,
  parameters: Record<string, unknown>,
): string {
  let counter = 0
  const visit = (node: Predicate, negate = false): string => {
    if (node.op === 'not') return visit(node.operand, !negate)
    if (node.op === 'atom') {
      const fact = node.fact
      if (fact.kind === 'state' && fact.part === part) {
        const names = fact.name.split(':')
        if (names.length > 1)
          return visit(
            {
              op: 'all',
              operands: names.map((name) => ({
                op: 'atom',
                fact: { ...fact, name },
              })),
            },
            negate,
          )
        return `var(--toned_${fact.name}${negate ? '-not' : ''})`
      }
      if (fact.kind === 'media' || fact.kind === 'container') {
        const slug = atomSlug(
          fact.kind === 'media'
            ? {
                container: null,
                step: fact.min === undefined ? fact.name : null,
                min: fact.min === undefined ? null : `${fact.min}px`,
                negated: false,
              }
            : {
                container: fact.name,
                step: fact.step ?? null,
                min: fact.min ?? null,
                negated: false,
              },
        )
        return `var(--${slug}${negate ? '-not' : ''})`
      }
      throw new Error(
        `Toned CSS: unresolved ${fact.kind} fact requires the host state registry`,
      )
    }
    const op = negate ? (node.op === 'all' ? 'any' : 'all') : node.op
    const operands = node.operands.map((child) => visit(child, negate))
    if (op === 'all' && operands.length === 1) return operands[0]!
    const name = `--toned-predicate-${prefix}-${counter++}`
    if (op === 'all') parameters[name] = operands.join(' ') || ' '
    else {
      parameters['--toned-predicate-false'] = 'initial'
      let fallback = 'var(--toned-predicate-false)'
      for (let index = operands.length - 1; index >= 0; index--) {
        const branch = `${name}-${index}`
        parameters[branch] = operands[index]
        fallback = `var(${branch}, ${fallback})`
      }
      parameters[name] = fallback
    }
    return `var(${name})`
  }
  return visit(predicate)
}

function atoms(
  predicate: Predicate,
): readonly Extract<Predicate, { op: 'atom' }>['fact'][] | undefined {
  if (predicate.op === 'atom') return [predicate.fact]
  if (predicate.op !== 'all') return undefined
  const children = predicate.operands.map(atoms)
  return children.some((child) => !child)
    ? undefined
    : (children.flat() as Extract<Predicate, { op: 'atom' }>['fact'][])
}

/** The unnamespaced checkpoint deliberately retains its fixed media/state
 * ladder inside each layer. New descriptors use source order on every backend.
 * Advanced .when boundaries always retain occurrence order, including legacy. */
function legacyOrder(
  operations: readonly ResolvedOperation[],
  system: TokenSystem<any>,
): ResolvedOperation[] {
  const config = system.system
  const states = Object.keys(config.states ?? {})
  const stateOrder = [
    ...states.map((name) => `:sib-${name}`),
    ...states.map((name) => `:src-${name}`),
    ...PSEUDO_CASCADE_ORDER,
    ...states.map((name) => `:${name}`),
  ]
  const rank = (operation: ResolvedOperation): number[] => {
    if (unconditional(operation.predicate)) return [0]
    const facts = atoms(operation.predicate)
    if (facts?.length && facts.every((fact) => fact.kind === 'state')) {
      const names = facts.map((fact) =>
        fact.kind === 'state' ? fact.name : '',
      )
      return [
        3,
        operation.origin.token === 'style' ? 1 : 0,
        names.length > 1 ? 1 : 0,
        names.length > 1 ? names.length : stateOrder.indexOf(`:${names[0]}`),
      ]
    }
    const fact = facts?.length === 1 ? facts[0] : undefined
    if (fact?.kind === 'media')
      return [
        1,
        0,
        lengthToPx(
          fact.min ?? config.breakpoints?.__breakpoints[fact.name] ?? 0,
        ),
      ]
    if (fact?.kind === 'container')
      return [
        1,
        1,
        Object.keys(config.containers ?? {}).indexOf(fact.name),
        lengthToPx(
          fact.step
            ? (config.containers?.[fact.name]?.[fact.step] ?? 0)
            : (fact.min ?? 0),
          config.base ?? 4,
        ),
      ]
    return [2]
  }
  const output: ResolvedOperation[] = []
  let segment: ResolvedOperation[] = []
  const flush = () => {
    output.push(
      ...segment.sort((left, right) => {
        const a = rank(left),
          b = rank(right)
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          const difference = (a[i] ?? 0) - (b[i] ?? 0)
          if (difference) return difference
        }
        return left.origin.order - right.origin.order
      }),
    )
    segment = []
  }
  for (const operation of operations) {
    if (operation.origin.path.includes('when')) {
      flush()
      output.push(operation)
      continue
    }
    if (segment.length && segment[0]!.origin.layer !== operation.origin.layer)
      flush()
    segment.push(operation)
  }
  flush()
  return output
}

/** Remove only generated rule/Boolean slots unreachable from final output.
 * Alpha parameters are consumed by atomic classes, and authored custom properties
 * are roots even if their spelling overlaps the generated namespace. */
function pruneParameters(
  style: Record<string, unknown>,
  parameters: Record<string, unknown>,
  authored: ReadonlyMap<string, unknown>,
): void {
  const candidates = Object.keys(parameters).filter(
    (name) =>
      (name.startsWith('--toned-rule-') ||
        name.startsWith('--toned-predicate-')) &&
      !authored.has(name),
  )
  if (!candidates.length) return
  const owned = new Set(candidates)
  const reachable = new Set<string>()
  const pending: string[] = []
  const visit = (value: unknown) => {
    if (typeof value !== 'string') return
    for (const match of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
      const name = match[1]!
      if (owned.has(name) && !reachable.has(name)) {
        reachable.add(name)
        pending.push(name)
      }
    }
  }
  for (const [field, value] of Object.entries(style))
    if (!owned.has(field)) visit(value)
  for (let index = 0; index < pending.length; index++)
    visit(style[pending[index]!])
  for (const name of candidates) if (!reachable.has(name)) delete style[name]
}

/** Lower the shared, already-resolved field stream to legacy atomic classes and
 * bounded custom-property chains. Token resolvers are never invoked by lowering. */
export function lowerCssOperations(
  input: readonly ResolvedOperation[],
  system: TokenSystem<any>,
  part: string,
  useClassName = true,
  namespace = true,
): ResolvedProps {
  const operations = system.id ? input : legacyOrder(input, system)
  const config = system.system
  const parameters: Record<string, unknown> = {}
  const classes = new Set<string>(['_'])
  const fields = new Map<
    string,
    { value: unknown; atomic: boolean; owner: string }
  >()
  const owners = new Map<string, Set<string>>()
  const groups = new Map<string, ResolvedOperation[]>()
  for (const operation of operations) {
    const group = groups.get(operation.origin.id) ?? []
    group.push(operation)
    groups.set(operation.origin.id, group)
    const set = owners.get(operation.field) ?? new Set<string>()
    set.add(operation.origin.token)
    owners.set(operation.field, set)
  }
  const lastStatic = new Map<string, string>()
  for (const operation of operations)
    if (unconditional(operation.predicate))
      lastStatic.set(operation.origin.token, operation.origin.id)
  const responsive = new Set<string>()
  if (!system.id && useClassName) {
    for (const token of config.responsiveTokens ?? []) {
      const conditional = operations.filter(
        (operation) =>
          operation.origin.token === token &&
          !unconditional(operation.predicate),
      )
      if (
        conditional.length &&
        conditional.every(
          (operation) =>
            operation.predicate.op === 'atom' &&
            operation.predicate.fact.kind === 'media' &&
            operation.predicate.fact.min === undefined &&
            config[token]?.values?.includes(operation.tokenValue),
        )
      )
        responsive.add(token)
    }
  }
  const atomicGroups = new Set<string>()
  for (const [id, group] of groups) {
    const operation = group[0]!
    const token = operation.origin.token
    const tokenConfig = config[token]
    if (!useClassName || !tokenConfig?.values) continue
    if (
      responsive.has(token) &&
      operation.predicate.op === 'atom' &&
      operation.predicate.fact.kind === 'media'
    ) {
      classes.add(
        `@${operation.predicate.fact.name}:${token}_${String(operation.tokenValue)}`,
      )
      atomicGroups.add(id)
    } else if (
      unconditional(operation.predicate) &&
      lastStatic.get(token) === id
    ) {
      const alpha = tokenConfig.alphaChannel
        ? splitAlphaValue(operation.tokenValue)
        : null
      const value = alpha?.base ?? operation.tokenValue
      if (!tokenConfig.values.includes(value)) continue
      classes.add(`${token}_${String(value)}`)
      atomicGroups.add(id)
      if (alpha) {
        if (
          (tokenConfig.alphaSteps ?? DEFAULT_ALPHA_STEPS).includes(alpha.alpha)
        )
          classes.add(`${token}$${alpha.alpha}`)
        else
          for (const field of resolveAlphaChannels(tokenConfig.alphaChannel, {
            ...config.layoutContext,
            canonicalFields: !!system.id,
          }))
            parameters[alphaVarName(field)] = String(alpha.alpha / 100)
      }
    }
  }
  const chainValue = (operation: ResolvedOperation): unknown => {
    const tokenConfig = config[operation.origin.token]
    return tokenConfig?.alphaChannel &&
      resolveAlphaChannels(tokenConfig.alphaChannel, {
        ...config.layoutContext,
        canonicalFields: !!system.id,
      }).includes(operation.field) &&
      alphaWrappable(operation.value) &&
      !String(operation.value).startsWith('rgb(from ')
      ? withAlphaExpr(
          String(operation.value),
          `var(${alphaVarName(operation.field)}, 1)`,
        )
      : operation.value
  }
  const priorOperations = new Map<string, ResolvedOperation>()
  for (const operation of operations) {
    if (operation.value == null) continue
    const previous = fields.get(operation.field)
    if (unconditional(operation.predicate)) {
      fields.set(operation.field, {
        value: operation.value,
        atomic: atomicGroups.has(operation.origin.id),
        owner: operation.origin.token,
      })
    } else if (
      responsive.has(operation.origin.token) &&
      atomicGroups.has(operation.origin.id)
    ) {
      // These finite responsive values are already owned by generated CSS.
      continue
    } else {
      const prefix = String(operation.origin.order)
      const parameter = `--toned-rule-${prefix}-${operation.field.replace(/[^a-zA-Z0-9-]/g, '-')}`
      parameters[parameter] =
        `${compileCssPredicateGuard(operation.predicate, part, prefix, parameters)} ${serializeCssValue(operation.field, chainValue(operation))}`
      const prior = priorOperations.get(operation.field)
      const fallback = previous
        ? serializeCssValue(
            operation.field,
            previous.atomic && prior ? chainValue(prior) : previous.value,
          )
        : !system.id &&
            !operation.origin.path.includes('when') &&
            atoms(operation.predicate)?.every((fact) => fact.kind === 'state')
          ? undefined
          : 'revert-layer'
      fields.set(operation.field, {
        value:
          fallback === undefined
            ? `var(${parameter})`
            : `var(${parameter}, ${fallback})`,
        atomic: false,
        owner: operation.origin.token,
      })
    }
    priorOperations.set(operation.field, operation)
  }
  const style: Record<string, unknown> = { ...parameters }
  for (const [field, result] of fields)
    if (!result.atomic || owners.get(field)!.size > 1)
      style[field] = result.value
  pruneParameters(style, parameters, fields)
  const output = { className: [...classes].join(' '), style }
  return namespace && system.id ? namespaceOutput(output, system.id) : output
}

/** Entry shared by pure SSR and mounted CSS hosts. All selection and token
 * evaluation is the same plan pipeline used by native and Tailwind adapters. */
export function resolveCssPlan(
  plan: CompiledPlan,
  system: TokenSystem<any>,
  tokens: Tokens,
  facts: Facts = {},
  options: {
    part?: string
    useClassName?: boolean
    namespace?: boolean
    mediaMode?: 'css' | 'runtime' | false
    pseudoMode?: 'css' | 'runtime' | false
  } = {},
): Record<string, ResolvedProps> {
  const mediaCss = (options.mediaMode ?? 'css') === 'css'
  const pseudoCss = (options.pseudoMode ?? 'css') === 'css'
  const selectPredicate = (operation: DeclarationOperation): Predicate => {
    let invalid = false
    const specialize = (predicate: Predicate): Predicate => {
      if (predicate.op === 'atom') {
        const fact = predicate.fact
        const kind = fact.kind
        const known =
          kind === 'media'
            ? (fact as { min?: number }).min !== undefined ||
              Object.hasOwn(
                system.system.breakpoints?.__breakpoints ?? {},
                fact.name,
              )
            : kind !== 'container' ||
              (Object.hasOwn(system.system.containers ?? {}, fact.name) &&
                (fact.step === undefined ||
                  Object.hasOwn(
                    system.system.containers[fact.name],
                    fact.step,
                  )))
        if (!known && mediaCss) {
          invalid = true
          warnOnce(
            `condition:${JSON.stringify(fact)}`,
            'an undeclared breakpoint or container condition is dropped',
          )
          return FALSE
        }
        if (
          (kind === 'state' && !pseudoCss) ||
          ((kind === 'media' || kind === 'container') && !mediaCss)
        )
          return evaluatePredicate(predicate, facts, 'web')
        return predicate
      }
      return predicate.op === 'not'
        ? { op: 'not', operand: specialize(predicate.operand) }
        : { op: predicate.op, operands: predicate.operands.map(specialize) }
    }
    const selected = specialize(
      pseudoCss ? browserPredicate(operation) : operation.predicate,
    )
    return invalid ? FALSE : selected
  }
  const selected = resolvePlan(plan, system, tokens, facts, {
    preserveConditions: true,
    part: options.part,
    extensions: EXTENSIONS,
    predicate: selectPredicate,
  })
  const output: Record<string, ResolvedProps> = {}
  for (const [part, operations] of Object.entries(selected))
    output[part] = lowerCssOperations(
      operations,
      system,
      part,
      options.useClassName,
      options.namespace,
    )
  const index = extensionIndex(plan)
  if (pseudoCss)
    for (const [name, current] of Object.entries(output)) {
      if (index.sources.has(name))
        output[name] = {
          ...current,
          className: [
            ...new Set(`${current.className ?? ''} _s`.split(' ')),
          ].join(' '),
        }
    }
  const extensions =
    options.part === undefined
      ? plan.extensions
      : (index.extensions.get(options.part) ?? [])
  for (const extension of extensions) {
    const part = output[extension.origin.part]
    if (!part) continue
    const predicate = evaluatePredicate(
      selectPredicate(extension),
      facts,
      'web',
      true,
      extension.origin.part,
    )
    if (predicate === FALSE) continue
    if (extension.token === '$grid' || extension.token === '$area') continue // platform compiler already materialized its layout fields
    if (!unconditional(predicate))
      throw new Error(
        `Toned CSS: ${extension.token} cannot be conditional on a browser fact`,
      )
    if (extension.token === '$pseudoRules') {
      const effect = extension.value as { token: string; value: unknown }
      const vocabulary: readonly unknown[] =
        system.system[effect.token]?.values ?? []
      if (options.useClassName === false || !vocabulary.includes(effect.value))
        throw new Error(
          `Toned CSS: pseudoRules token ${effect.token} requires a finite generated class`,
        )
      const namespace =
        system.id && options.namespace !== false ? `${system.id}--` : ''
      const family = new Set(
        vocabulary.map(
          (value) => `${namespace}${effect.token}_${String(value)}`,
        ),
      )
      const classes = (part.className ?? '')
        .split(/\s+/)
        .filter((name) => name && !family.has(name))
      classes.push(`${namespace}${effect.token}_${String(effect.value)}`)
      output[extension.origin.part] = {
        ...part,
        className: [...new Set(classes)].join(' '),
      }
    }
    if (extension.token === 'className')
      output[extension.origin.part] = {
        ...part,
        className: `${part.className ?? ''} ${String(extension.value)}`.trim(),
      }
    if (extension.token === '$webRules') {
      if (!isWebRules(extension.value))
        throw new Error('Toned CSS: $webRules requires a webRules declaration')
      output[extension.origin.part] = {
        ...part,
        className:
          `${part.className ?? ''} ${compileWebRules(extension.value, system.id ?? 'legacy').className}`.trim(),
      }
    }
  }
  return output
}
