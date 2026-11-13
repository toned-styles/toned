/**
 * Declared states and the relation channels each one offers.
 *
 * A state is declared by its selector alone (`open: "[data-state='open']"`),
 * which styles the element in that state and nothing else, or with the
 * relations other parts may read it through:
 *
 * ```ts
 * states: {
 *   open: { selector: "[data-state='open']", relations: ['ancestor'] },
 * }
 * ```
 *
 * - `ancestor`: a part styles itself while its nearest source ancestor is in
 *   the state (`'Trigger:open': { Chevron: … }`).
 * - `sibling`: a part styles itself while an earlier sibling source is in the
 *   state (`'Trigger~:open': { Badge: … }`).
 *
 * Each relation costs CSS that every styled element pays for in style
 * recalculation (the sibling channel grows with the square of a list's
 * length), so a state offers only the relations it declares.
 *
 * @module system/states
 */

export const STATE_RELATIONS = ['ancestor', 'sibling'] as const
export type StateRelation = (typeof STATE_RELATIONS)[number]

export type StateDeclaration =
  | string
  | {
      readonly selector: string
      readonly relations?: readonly StateRelation[]
    }

export const stateSelector = (declaration: StateDeclaration): string =>
  typeof declaration === 'string' ? declaration : declaration.selector

export const stateRelations = (
  declaration: StateDeclaration | undefined,
): readonly StateRelation[] =>
  declaration && typeof declaration !== 'string'
    ? (declaration.relations ?? [])
    : []

/** An attribute or pseudo-class selector attaches to the element itself. */
export const isElementSelector = (selector: string): boolean =>
  selector.startsWith(':') || selector.startsWith('[')

/**
 * Whether the state can only hold on a device that can hover. A touch tap
 * would otherwise leave the element in the state until the next tap elsewhere,
 * which is why core gates `:hover` the same way.
 */
export const needsHover = (selector: string): boolean =>
  /:hover(?![\w-])/.test(selector)

/** Throws for a relation name toned does not know or cannot emit. */
export function validateStates(
  states: Readonly<Record<string, StateDeclaration>> | undefined,
): void {
  for (const [alias, declaration] of Object.entries(states ?? {})) {
    const selector = stateSelector(declaration)
    if (typeof selector !== 'string' || !selector)
      throw new Error(
        `Toned: state "${alias}" needs a selector string, e.g. { selector: "[data-state='open']" }`,
      )
    for (const relation of stateRelations(declaration)) {
      if (!(STATE_RELATIONS as readonly string[]).includes(relation))
        throw new Error(
          `Toned: state "${alias}" declares relation "${relation}"; a state relation is one of ${STATE_RELATIONS.map((name) => `"${name}"`).join(', ')}`,
        )
      if (!isElementSelector(selector))
        throw new Error(
          `Toned: state "${alias}" declares relation "${relation}", which needs an attribute or pseudo-class selector ("[data-…]" or ":…") on the source element; "${selector}" selects a descendant`,
        )
    }
  }
}

/** Aliases of the states that offer `relation`. */
export function statesWith(
  states: Readonly<Record<string, StateDeclaration>> | undefined,
  relation: StateRelation,
): string[] {
  return Object.entries(states ?? {})
    .filter(([, declaration]) => stateRelations(declaration).includes(relation))
    .map(([alias]) => alias)
}

/** The message for a relation key whose state does not offer the relation. */
export function undeclaredRelationMessage(
  key: string,
  alias: string,
  relation: StateRelation,
  declaration: StateDeclaration,
): string {
  const relations = [...new Set([...stateRelations(declaration), relation])]
  return `Toned: '${key}' reads state "${alias}" through its ${relation} channel, which the system does not declare. Declare it: states: { '${alias}': { selector: ${JSON.stringify(stateSelector(declaration))}, relations: [${relations.map((name) => `'${name}'`).join(', ')}] } }`
}
