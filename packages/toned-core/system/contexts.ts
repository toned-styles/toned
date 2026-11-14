/**
 * Context markers: a part styled by an ancestor component's state or kind.
 *
 * The system declares each context and what it offers:
 *
 * ```ts
 * contexts: {
 *   card: { states: ['hover'] },
 *   prose: { values: ['faq', 'callout'] },
 * }
 * ```
 *
 * A provider part declares the context it opens (`$context: 'card'`, or
 * `$context: 'prose=faq'` for a valued context, usually in a variant block),
 * and a part in any sheet keys on it: `'@within card'`, `'@within
 * card:hover'`, `'@within prose=faq'`. The NEAREST provider of a context
 * answers, as React context does on native.
 *
 * A context's `states` are its relation channel, the cross-component twin of
 * a state's `relations` (system/states.ts): each costs CSS, so a context
 * offers only the states it declares. A state is a built-in pseudo state or a
 * declared state whose selector attaches to the provider element.
 *
 * Web: the provider carries a marker class (`_cx_<name>`, plus
 * `_cx_<name>_<value>`), and the system's CSS sets an inherited custom
 * property on it, one zero-specificity `:where()` rule per declared pair.
 * Descendants read the property through the ordinary condition chain, so
 * their own selectors never change and the rule's subject is the provider,
 * not every descendant.
 *
 * @module system/contexts
 */
import {
  isElementSelector,
  needsHover,
  type StateDeclaration,
  stateSelector,
} from './states.ts'

export type ContextDeclaration = {
  /** The kinds a provider can be (`'@within prose=faq'`). */
  readonly values?: readonly string[]
  /** The provider states descendants may read (`'@within card:hover'`). */
  readonly states?: readonly string[]
}

export type Contexts = Readonly<Record<string, ContextDeclaration>>

/** One `'@within …'` key, parsed. */
export type WithinCondition = {
  readonly name: string
  readonly value?: string
  readonly state?: string
}

/** The built-in states a context may offer, with their selectors. */
const BUILT_IN_STATES = [
  'hover',
  'focus',
  'focus-visible',
  'focus-within',
  'active',
] as const

const NAME = /^[a-z][a-z0-9-]*$/
const WITHIN =
  /^@within ([a-z][a-z0-9-]*)(?:=([a-z][a-z0-9-]*)|:([a-z][a-z0-9-]*))?$/

const quoted = (names: readonly string[]) =>
  names.length ? names.map((name) => `'${name}'`).join(', ') : 'none'
const list = (names: readonly string[]) =>
  `[${names.map((name) => `'${name}'`).join(', ')}]`

export const isWithinKey = (key: string): boolean =>
  key.startsWith('@within ') || key === '@within'

/** Parses `'@within card'`, `'@within card:hover'`, `'@within prose=faq'`. */
export function parseWithinKey(key: string): WithinCondition | undefined {
  const match = WITHIN.exec(key)
  if (!match) return undefined
  return {
    name: match[1]!,
    ...(match[2] !== undefined ? { value: match[2] } : {}),
    ...(match[3] !== undefined ? { state: match[3] } : {}),
  }
}

/** The fact key a condition is read as: its canonical spelling. */
export const withinFactKey = (condition: WithinCondition): string =>
  `@within ${condition.name}${condition.value !== undefined ? `=${condition.value}` : ''}${condition.state !== undefined ? `:${condition.state}` : ''}`

/** The toggle variable (before namespacing) a condition reads. */
export const withinVariable = (condition: WithinCondition): string =>
  `--toned_cx_${condition.name}${condition.value !== undefined ? `_${condition.value}` : condition.state !== undefined ? `_${condition.state}` : ''}`

/** The marker classes (before namespacing) a provider marker sets. */
export function markerClasses(marker: string): readonly string[] {
  const [name, value] = marker.split('=')
  return value === undefined
    ? [`_cx_${name}`]
    : [`_cx_${name}`, `_cx_${name}_${value}`]
}

/** Throws for a context declaration toned cannot emit. */
export function validateContexts(
  contexts: Contexts | undefined,
  states: Readonly<Record<string, StateDeclaration>> | undefined,
): void {
  for (const [name, declaration] of Object.entries(contexts ?? {})) {
    if (!NAME.test(name))
      throw new Error(
        `Toned: context name '${name}' must be a lowercase kebab-case identifier`,
      )
    const values = declaration.values ?? []
    for (const value of values)
      if (!NAME.test(value))
        throw new Error(
          `Toned: context '${name}' value '${value}' must be a lowercase kebab-case identifier`,
        )
    for (const state of declaration.states ?? []) {
      if (values.includes(state))
        throw new Error(
          `Toned: context '${name}' declares '${state}' as both a value and a state; rename one`,
        )
      if ((BUILT_IN_STATES as readonly string[]).includes(state)) continue
      const declared = states?.[state]
      if (declared === undefined)
        throw new Error(
          `Toned: context '${name}' offers state '${state}', which is neither built in (${quoted(BUILT_IN_STATES)}) nor declared in states`,
        )
      const selector = stateSelector(declared)
      if (!isElementSelector(selector))
        throw new Error(
          `Toned: context '${name}' offers state '${state}', which needs an attribute or pseudo-class selector ("[data-…]" or ":…") on the provider element; ${JSON.stringify(selector)} selects a descendant`,
        )
    }
  }
}

/**
 * The error for a `'@within …'` key (`where` is the key) or a `$context`
 * marker (`where` is `'$context'`) the declared contexts do not have, or
 * undefined when it is declared.
 */
export function withinError(
  condition: WithinCondition | undefined,
  written: string,
  where: string,
  contexts: Contexts | undefined,
): string | undefined {
  const declared = contexts ?? {}
  const names = Object.keys(declared)
  if (!condition)
    return `Toned: '${written}' is not a context condition. Write '@within <context>', '@within <context>=<value>' or '@within <context>:<state>'. Declared contexts: ${quoted(names)}`
  const context = declared[condition.name]
  if (!context)
    return `Toned: unknown context '${condition.name}' in ${where}. Declared contexts: ${quoted(names)}`
  const values = context.values ?? []
  const states = context.states ?? []
  if (condition.value !== undefined && !values.includes(condition.value))
    return `Toned: context '${condition.name}' has no value '${condition.value}' in ${where}. Its values: ${quoted(values)}. Declare it: contexts: { ${condition.name}: { values: ${list([...values, condition.value])} } }`
  if (condition.state !== undefined && !states.includes(condition.state))
    return `Toned: context '${condition.name}' does not offer state '${condition.state}' in ${where}. Declare it: contexts: { ${condition.name}: { states: ${list([...states, condition.state])} } }`
  return undefined
}

/** Checks a `$context` value and returns its markers, in order. */
export function contextMarkers(
  value: unknown,
  contexts: Contexts | undefined,
): readonly string[] {
  const markers = Array.isArray(value) ? value : [value]
  for (const marker of markers) {
    if (typeof marker !== 'string')
      throw new Error(
        "Toned: $context takes a declared context ('card') or a context and value ('prose=faq')",
      )
    const condition = marker.includes(':')
      ? undefined
      : parseWithinKey(`@within ${marker}`)
    const error = condition
      ? withinError(condition, marker, '$context', contexts)
      : `Toned: $context '${marker}' is not a marker: write a declared context ('card') or a context and value ('prose=faq'); a state is the provider's own, never set`
    if (error) throw new Error(error)
  }
  return markers as string[]
}

/** Selector a context state attaches to the provider with. */
function stateSuffix(
  state: string,
  states: Readonly<Record<string, StateDeclaration>> | undefined,
): string {
  return (BUILT_IN_STATES as readonly string[]).includes(state)
    ? `:${state}`
    : stateSelector(states![state]!)
}

/**
 * The context CSS: per context, one resting rule on the provider (inside
 * the context, none of its states or values), then one rule per declared
 * state or value. The properties are unregistered, so they inherit to every
 * descendant; a nested provider's resting rule answers for its own subtree,
 * so the nearest provider wins. A hover state is gated like `:hover`.
 */
export function contextCss(
  contexts: Contexts | undefined,
  states: Readonly<Record<string, StateDeclaration>> | undefined,
  scope: string,
): string {
  let css = ''
  for (const [name, declaration] of Object.entries(contexts ?? {})) {
    const values = declaration.values ?? []
    const offered = declaration.states ?? []
    const base = `_cx_${name}`
    const on = (condition: WithinCondition) => `${withinVariable(condition)}: ;`
    const off = (condition: WithinCondition) =>
      `${withinVariable(condition)}: initial;`
    css += `${scope}:where(.${base}) {${on({ name })}${[
      ...values.map((value) => off({ name, value })),
      ...offered.map((state) => off({ name, state })),
    ].join('')}}`
    for (const value of values)
      css += `${scope}:where(.${base}_${value}) {${on({ name, value })}}`
    for (const state of offered) {
      const selector = stateSuffix(state, states)
      const rule = `${scope}:where(.${base}${selector}) {${on({ name, state })}}`
      css += needsHover(selector) ? `@media (hover: hover) {${rule}}` : rule
    }
  }
  return css
}
