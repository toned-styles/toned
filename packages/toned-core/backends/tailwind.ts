import { serializeCssValue } from '../utils/css-value.ts'
import type { OutputBackend, ResolvedProps } from './index.ts'

export type UtilityMapping = Readonly<{
  field: string
  value: string | number
  /** A complete utility, whose configured CSS must mean exactly field:value. */
  utility: string
}>
export type ParameterMapping = Readonly<{
  field: string
  utility: string
  variable: `--${string}`
  /** Explicit conversion prevents assuming the Tailwind spacing scale matches. */
  serialize: (value: unknown) => string
}>

export function serializeTailwindParameter(
  mapping: ParameterMapping,
  value: unknown,
): string {
  const serialized = mapping.serialize(value)
  const expected = serializeCssValue(mapping.field, value)
  if (typeof serialized !== 'string' || serialized !== expected)
    throw new Error(
      `Toned Tailwind: parameter serializer changes ${mapping.field}=${expected} to ${String(serialized)}; normalized dimensions are pixels`,
    )
  return serialized
}

/**
 * An explicit Tailwind profile: no inferred scale equivalence, class parser or
 * runtime compiler. Finite utilities and dynamic parameter utilities are all
 * supplied to Tailwind's build, including those used only by lazy sheets.
 */
export function createTailwindBackend(options: {
  id: string
  mappings: readonly UtilityMapping[]
  parameters?: readonly ParameterMapping[]
  classesOnly?: boolean
}) {
  const finite = new Map<string, Map<unknown, string>>()
  const parameters = new Map<string, ParameterMapping>()
  const candidates = new Set<string>()
  if (!options.id || ['css-vars', 'native'].includes(options.id))
    throw new Error(
      'Toned Tailwind: profile id must be distinct from the built-in backend ids',
    )
  const claimed = new Map<string, string>()
  const claimedVariables = new Set<string>()
  const candidate = (utility: string, identity: string) => {
    if (!utility || /\s|["\\{}]/.test(utility))
      throw new Error(
        'Toned Tailwind: utility must be one complete source-safe candidate',
      )
    const previous = claimed.get(utility)
    if (previous && previous !== identity)
      throw new Error(
        `Toned Tailwind: ${utility} is mapped to distinct declarations; each candidate must have one exact meaning`,
      )
    claimed.set(utility, identity)
    candidates.add(utility)
  }
  for (const mapping of options.mappings) {
    candidate(mapping.utility, JSON.stringify([mapping.field, mapping.value]))
    let values = finite.get(mapping.field)
    if (!values) {
      values = new Map()
      finite.set(mapping.field, values)
    }
    if (values.has(mapping.value))
      throw new Error(
        `Toned Tailwind: duplicate mapping for ${mapping.field}=${mapping.value}`,
      )
    values.set(mapping.value, mapping.utility)
  }
  for (const parameter of options.parameters ?? []) {
    if (options.classesOnly)
      throw new Error(
        'Toned Tailwind: classes-only profiles cannot declare dynamic parameter channels',
      )
    candidate(parameter.utility, `parameter:${parameter.field}`)
    if (!/^--[a-zA-Z_][\w-]*$/.test(parameter.variable))
      throw new Error('Toned Tailwind: invalid parameter custom property name')
    if (claimedVariables.has(parameter.variable))
      throw new Error(
        `Toned Tailwind: parameter ${parameter.variable} is shared by multiple fields`,
      )
    claimedVariables.add(parameter.variable)
    if (parameters.has(parameter.field))
      throw new Error(
        `Toned Tailwind: duplicate parameter for ${parameter.field}`,
      )
    parameters.set(parameter.field, Object.freeze({ ...parameter }))
  }
  const inventory = Object.freeze([...candidates].sort())
  const mappings = Object.freeze(
    options.mappings.map((mapping) => Object.freeze({ ...mapping })),
  )
  const parameterMappings = Object.freeze(
    [...(options.parameters ?? [])].map((mapping) =>
      Object.freeze({ ...mapping }),
    ),
  )
  const backend: OutputBackend = Object.freeze({
    id: options.id,
    platform: 'web',
    // Initial profile accepts runtime facts. CSS condition chains must be
    // rejected, never accidentally emitted as arbitrary utility parameters.
    browserConditions: false,
    resolve(input: ResolvedProps): ResolvedProps {
      if (input.className)
        throw new Error(
          'Toned Tailwind: resolve normalized fields before utility emission',
        )
      const classes: string[] = []
      const style: Record<string, string> = {}
      for (const [field, value] of Object.entries(input.style)) {
        if (value == null) continue
        if (
          field.startsWith('--') ||
          (typeof value === 'string' &&
            /var\(--(?:[\w-]+-)?(?:toned[_-]|media-|cq-)/.test(value))
        )
          throw new Error(
            `Toned Tailwind capability: browser condition chains are outside profile ${options.id}`,
          )
        const utility = finite.get(field)?.get(value)
        if (utility) {
          classes.push(utility)
          continue
        }
        const parameter = parameters.get(field)
        if (!parameter)
          throw new Error(
            `Toned Tailwind capability: no exact mapping for ${field}=${String(value)} in ${options.id}`,
          )
        classes.push(parameter.utility)
        style[parameter.variable] = serializeTailwindParameter(parameter, value)
      }
      return Object.freeze({
        className: [...new Set(classes)].join(' '),
        style: Object.freeze(style),
      })
    },
  })
  return Object.freeze({
    ...backend,
    requiresBuild: true,
    candidates: inventory,
    mappings,
    parameters: parameterMappings,
    classesOnly: options.classesOnly ?? false,
    /** Feed this file to Tailwind v4; the application owns @import/layer order. */
    source:
      inventory.map((value) => `@source inline("${value}");`).join('\n') + '\n',
  })
}

export type TailwindBackend = ReturnType<typeof createTailwindBackend>
