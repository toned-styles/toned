/**
 * Declared width thresholds: the fixed logical-pixel widths a system's sheets
 * may write at the use site (`q.media(dp(600))`, `q.container('card',
 * dp(300))`) without naming them.
 *
 * The build never reads a stylesheet, so a threshold gets CSS only when the
 * system declares it. Named thresholds live in `conditions.media` and
 * `conditions.containers`; unnamed ones are listed here:
 *
 * ```ts
 * conditions: {
 *   containers: { card: {} },
 *   widths: { media: [600, 900], containers: { card: [300] } },
 * }
 * ```
 *
 * A sheet using a width that is not declared is a type error (the query
 * builders and the literal keys are narrowed to this list) and, where types
 * cannot see it, an error when the sheet is created.
 *
 * @module system/widths
 */
import {
  fixedQueryWidth,
  parseConditionKey,
  serializeAtom,
} from '../utils/conditions.ts'

export type DeclaredWidths = Readonly<{
  /** Viewport min-widths in logical pixels: `q.media(dp(n))`. */
  media?: readonly number[]
  /** Per declared container, min-widths in logical pixels:
   *  `q.container(name, dp(n))`. */
  containers?: Readonly<Record<string, readonly number[]>>
}>

const checkWidth = (value: unknown, path: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error(
      `Toned: ${path} must list fixed nonnegative logical-pixel widths (numbers), got ${JSON.stringify(value)}`,
    )
  return value
}

/** Validate and freeze a `widths` declaration against the declared containers. */
export function validateWidths(
  widths: unknown,
  containers: Readonly<Record<string, unknown>> | undefined,
): DeclaredWidths | undefined {
  if (widths === undefined) return undefined
  if (!widths || typeof widths !== 'object' || Array.isArray(widths))
    throw new Error(
      'Toned: conditions.widths must be { media?: number[], containers?: { [name]: number[] } }',
    )
  const {
    media,
    containers: perContainer,
    ...rest
  } = widths as Record<string, unknown>
  for (const key of Object.keys(rest))
    throw new Error(
      `Toned: conditions.widths.${key} is not a width list: write widths.media or widths.containers.<name>`,
    )
  const list = (value: unknown, path: string): readonly number[] => {
    if (!Array.isArray(value))
      throw new Error(`Toned: ${path} must be an array of widths`)
    return Object.freeze(
      value.map((width, index) => checkWidth(width, `${path}[${index}]`)),
    )
  }
  const out: { media?: readonly number[]; containers?: object } = {}
  if (media !== undefined) out.media = list(media, 'conditions.widths.media')
  if (perContainer !== undefined) {
    if (!perContainer || typeof perContainer !== 'object')
      throw new Error(
        'Toned: conditions.widths.containers must map container names to width lists',
      )
    out.containers = Object.freeze(
      Object.fromEntries(
        Object.entries(perContainer).map(([name, value]) => {
          if (!containers || !Object.hasOwn(containers, name))
            throw new Error(
              `Toned: conditions.widths.containers.${name} names no container: declare the container '${name}' in conditions.containers`,
            )
          return [name, list(value, `conditions.widths.containers.${name}`)]
        }),
      ),
    )
  }
  return Object.freeze(out) as DeclaredWidths
}

/** The condition atoms (`>=600px`, `card/>=300px`) a declaration emits, sorted. */
export function declaredWidthAtoms(
  widths: DeclaredWidths | undefined,
): string[] {
  if (!widths) return []
  const atoms = new Set<string>()
  for (const width of widths.media ?? []) atoms.add(`>=${width}px`)
  for (const [name, list] of Object.entries(widths.containers ?? {}))
    for (const width of list) atoms.add(`${name}/>=${width}px`)
  return [...atoms].sort()
}

/** Why an ad-hoc atom is not declared, or undefined when it is. */
export function undeclaredWidth(
  atomKey: string,
  widths: DeclaredWidths | undefined,
  containers: Readonly<Record<string, unknown>> | undefined,
): string | undefined {
  const atom = parseConditionKey(atomKey)?.[0]?.[0]
  if (!atom || atom.step !== null) return undefined
  const written = `'@${serializeAtom({ ...atom, negated: false })}'`
  const emits = 'and the build emits CSS only for declared conditions'
  if (atom.container === null) {
    const width = fixedQueryWidth(`>=${atom.min}`)
    if (width !== undefined && widths?.media?.includes(width)) return undefined
    return `Toned: ${written} is a width the system does not declare, ${emits}: add ${width ?? atom.min} to conditions.widths.media, or name it in conditions.media and write q.media('<name>')`
  }
  const name = atom.container
  if (!containers || !Object.hasOwn(containers, name))
    return `Toned: ${written} names a container the system does not declare: declare '${name}' in conditions.containers`
  const width =
    typeof atom.min === 'string' ? fixedQueryWidth(`>=${atom.min}`) : undefined
  if (width === undefined)
    return `Toned: ${written} is not a fixed width, ${emits}: write q.container('${name}', dp(<px>)) and add the width to conditions.widths.containers.${name}, or name a step in conditions.containers.${name}`
  if (widths?.containers?.[name]?.includes(width)) return undefined
  return `Toned: ${written} is a width the system does not declare, ${emits}: add ${width} to conditions.widths.containers.${name}, or name a step in conditions.containers.${name}`
}

/** Throw for the first ad-hoc atom the system does not declare. */
export function assertDeclaredWidths(
  atoms: Iterable<string>,
  widths: DeclaredWidths | undefined,
  containers: Readonly<Record<string, unknown>> | undefined,
): void {
  for (const atom of atoms) {
    const problem = undeclaredWidth(atom, widths, containers)
    if (problem) throw new Error(problem)
  }
}

/** The declared viewport widths of a system's config or declaration. */
export type MediaWidthOf<C> = C extends {
  widths: { media: readonly (infer N extends number)[] }
}
  ? N
  : never

type ContainerWidthsOf<C> = C extends { widths: { containers: infer W } }
  ? W
  : {}

/** The declared widths of one container. */
export type ContainerWidthOf<C, Name> =
  ContainerWidthsOf<C> extends infer W
    ? Name extends keyof W
      ? W[Name] extends readonly (infer N extends number)[]
        ? N
        : never
      : never
    : never

/** Every declared width as the condition atom it is written as:
 *  `>=600px`, `card/>=300px`. */
export type WidthAtomOf<C> =
  | `>=${MediaWidthOf<C>}px`
  | {
      [
        N in keyof ContainerWidthsOf<C> & string
      ]: `${N}/>=${ContainerWidthOf<C, N>}px`
    }[keyof ContainerWidthsOf<C> & string]
