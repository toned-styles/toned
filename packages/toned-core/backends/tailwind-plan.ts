import { fingerprint, systemDefinition } from '../build/manifest.ts'
import type { Predicate, ResolvedOperation } from '../core/plan.ts'
import type { TokenSystem } from '../types/index.ts'
import type { ResolvedProps } from './index.ts'
import { serializeTailwindParameter, type TailwindBackend } from './tailwind.ts'

type Context = { system: TokenSystem<any>; part: string }
const identity = (value: unknown) => JSON.stringify(value)
const key = (value: unknown) => fingerprint(identity(value))

/** A build-bound adapter. Browser facts are precompiled empty/invalid gates;
 * runtime resolution sets only value parameters and the already ordered chain.
 * Boolean algebra stays linear in predicate size and never expands to DNF. */
export function compileTailwindPlan(
  profile: TailwindBackend,
  system: TokenSystem<any>,
  operations: readonly ResolvedOperation[],
  emitCss = true,
) {
  const systemId =
    system.id === undefined
      ? `legacy-${fingerprint(systemDefinition(system.system))}`
      : `id-${system.id}`
  const profileId = profile.id.replace(
    /[^a-z0-9-]/g,
    (char) => `_${char.codePointAt(0)!.toString(16)}_`,
  )
  const prefix = `tw-${systemId.length}-${systemId}-${profileId}`
  const parameter = new Map(
    profile.parameters.map((value) => [value.field, value]),
  )
  const atoms = new Map<
    string,
    { fact: Extract<Predicate, { op: 'atom' }>['fact']; part: string }
  >()
  const origins = new Set(operations.map((operation) => operation.origin.id))
  const names = new Map<string, string>()
  const partNames = new Map<string, string>()
  const variable = (fact: unknown, part: string) => {
    const exact = identity([part, fact])
    const name = `--${prefix}-${key([part, fact])}`
    if (names.has(name) && names.get(name) !== exact)
      throw new Error('Toned Tailwind build: condition identity collision')
    return name
  }
  const scope = (part: string) => {
    const name = `${prefix}-${key(part)}`
    if (partNames.has(name) && partNames.get(name) !== part)
      throw new Error('Toned Tailwind build: part identity collision')
    return name
  }
  const collect = (predicate: Predicate, part: string): boolean => {
    if (predicate.op === 'atom') {
      if (
        predicate.fact.kind === 'variant' ||
        predicate.fact.kind === 'platform' ||
        predicate.fact.kind === 'relation' ||
        (predicate.fact.kind === 'state' && predicate.fact.part !== part)
      )
        return false
      const name = variable(predicate.fact, part)
      names.set(name, identity([part, predicate.fact]))
      atoms.set(name, { fact: predicate.fact, part })
      return true
    }
    if (predicate.op === 'not') return collect(predicate.operand, part)
    return predicate.operands.map((child) => collect(child, part)).some(Boolean)
  }
  for (const operation of operations) {
    partNames.set(scope(operation.origin.part), operation.origin.part)
    const conditional = collect(operation.predicate, operation.origin.part)
    if (conditional && !parameter.has(operation.field))
      throw new Error(
        `Toned Tailwind build: conditional ${operation.field} requires a fixed parameter utility; classes-only utilities cannot preserve arbitrary overlapping conditions`,
      )
    if (emitCss && conditional && operation.value != null)
      serializeTailwindParameter(
        parameter.get(operation.field)!,
        operation.value,
      )
    // Validate every declaration, including values in currently inactive variants
    // and explicitly collected lazy sheets, before publishing an asset.
    if (emitCss)
      profile.resolve({ style: { [operation.field]: operation.value } })
  }
  let css = ''
  for (const [name, { fact, part }] of emitCss ? atoms : []) {
    const selector = `.${scope(part)}`
    const on = `${name}: ;${name}-not:initial;`
    css += `${selector}{${name}:initial;${name}-not: ;}`
    if (fact.kind === 'state') {
      if (fact.part !== part)
        throw new Error(
          `Toned Tailwind build: cross-part state ${fact.part}:${fact.name} needs a declared host relation; ancestry cannot be inferred from named parts`,
        )
      const state =
        (system.system.states as Record<string, string> | undefined)?.[
          fact.name
        ] ?? `:${fact.name}`
      if (!state.startsWith(':') && !state.startsWith('['))
        throw new Error(
          `Toned Tailwind build: state ${fact.name} is a descendant selector; declare an explicit host relation`,
        )
      const rule = `${selector}${state}{${on}}`
      css += fact.name === 'hover' ? `@media (hover:hover){${rule}}` : rule
    } else if (fact.kind === 'media') {
      const value =
        fact.min ??
        (
          system.system.breakpoints?.__breakpoints as
            | Record<string, string | number>
            | undefined
        )?.[fact.name]
      if (value === undefined)
        throw new Error(`Toned Tailwind build: unknown media ${fact.name}`)
      const condition =
        typeof value === 'number'
          ? `(min-width:${value}px)`
          : value.startsWith('(')
            ? value
            : `(min-width:${value})`
      if (condition.includes('var('))
        throw new Error(
          'Toned Tailwind build: media thresholds must be fixed at build time',
        )
      css += `@media ${condition}{${selector}{${on}}}`
    } else if (fact.kind === 'container') {
      const value =
        fact.step === undefined
          ? fact.min
          : (
              system.system.containers as
                | Record<string, Record<string, number | string>>
                | undefined
            )?.[fact.name]?.[fact.step]
      if (value === undefined)
        throw new Error(
          `Toned Tailwind build: unknown container ${fact.name}/${fact.step}`,
        )
      const unit = fact.unit === 'px' ? 1 : Number(system.system.base ?? 4)
      const condition =
        typeof value === 'number'
          ? `(min-width:${value * unit}px)`
          : value.startsWith('(')
            ? value
            : `(min-width:${value})`
      if (condition.includes('var('))
        throw new Error(
          'Toned Tailwind build: container thresholds must be fixed at build time',
        )
      css += `@container ${fact.name} ${condition}{${selector}{${on}}}`
    } else {
      throw new Error(
        `Toned Tailwind build: unsupported browser fact ${identity(fact)}`,
      )
    }
  }
  const guard = (
    predicate: Predicate,
    part: string,
    inverted = false,
  ): string => {
    if (predicate.op === 'not') return guard(predicate.operand, part, !inverted)
    if (predicate.op === 'atom') {
      const name = variable(predicate.fact, part)
      if (!atoms.has(name))
        throw new Error(
          'Toned Tailwind: condition absent from build inventory; rebuild all sheets',
        )
      return `var(${name}${inverted ? '-not' : ''})`
    }
    throw new Error('Toned Tailwind: expected a browser atom')
  }
  return {
    css,
    resolvePlan(
      selected: readonly ResolvedOperation[],
      context: Context,
    ): ResolvedProps {
      if (context.system !== system)
        throw new Error('Toned Tailwind: artifact belongs to another system')
      const style: Record<string, string> = {}
      const fields = new Map<string, ResolvedOperation[]>()
      for (const operation of selected) {
        if (!origins.has(operation.origin.id))
          throw new Error(
            'Toned Tailwind: stylesheet absent from build inventory; rebuild all sheets',
          )
        if (operation.value == null) continue
        const values = fields.get(operation.field) ?? []
        values.push(operation)
        fields.set(operation.field, values)
      }
      let sequence = 0
      const never = () => {
        const name = `--${prefix}-never`
        style[name] = 'initial'
        return `var(${name})`
      }
      const emitGuard = (predicate: Predicate, inverted = false): string => {
        if (predicate.op === 'not')
          return emitGuard(predicate.operand, !inverted)
        if (predicate.op === 'atom')
          return guard(predicate, context.part, inverted)
        const product = (predicate.op === 'all') !== inverted
        const values = predicate.operands.map((child) =>
          emitGuard(child, inverted),
        )
        if (product) return values.join(' ')
        if (!values.length) return never()
        if (values.includes('')) return ''
        let fallback = never()
        for (const value of values) {
          const name = `--${prefix}-boolean-${sequence++}`
          style[name] = value
          fallback = `var(${name},${fallback})`
        }
        return fallback
      }
      const classes = new Set<string>([scope(context.part)])
      for (const [field, values] of fields) {
        const last = values[values.length - 1]!
        const unconditional =
          last.predicate.op === 'all' && last.predicate.operands.length === 0
        if (unconditional) {
          const output = profile.resolve({ style: { [field]: last.value } })
          for (const name of output.className?.split(' ') ?? [])
            if (name) classes.add(name)
          Object.assign(style, output.style)
          continue
        }
        const mapping = parameter.get(field)
        if (!mapping)
          throw new Error(
            `Toned Tailwind: ${field} needs a precompiled parameter utility`,
          )
        let chain = 'initial'
        for (const operation of values) {
          const name = `--${prefix}-value-${sequence++}`
          // Parameters serialize a semantic value once. The browser evaluates
          // only prebuilt facts, while the common plan supplies winner order.
          style[name] =
            `${emitGuard(operation.predicate)} ${serializeTailwindParameter(mapping, operation.value)}`.trim()
          chain = `var(${name},${chain})`
        }
        classes.add(mapping.utility)
        style[mapping.variable] = chain
      }
      return Object.freeze({
        className: [...classes].join(' '),
        style: Object.freeze(style),
      })
    },
  }
}
