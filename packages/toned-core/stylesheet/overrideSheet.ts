import type { QueryBuilder } from '../system/queries.ts'
import type {
  AuthoredElementStyle,
  ElementType,
  ModType,
  TokenStyleDeclaration,
} from '../types/index.ts'
import type { ValidateDeclaration } from '../types/stylesheet.ts'
import { APPLY_OVERRIDE } from './rule-protocol.ts'
import type { VariantSelector } from './variantSelector.ts'

/** Null removes an inherited leaf at this exact declaration path. */
export type NullableOverride<T> = T extends (...args: any[]) => unknown
  ? T
  : T extends readonly unknown[]
    ? T | null
    : T extends object
      ? { [K in keyof T]: NullableOverride<T[K]> }
      : T | null

type Meta<T> = T extends { readonly __toned__?: infer M } ? M : never
type System<T> = Meta<T> extends {
  system: infer S extends TokenStyleDeclaration
}
  ? S
  : TokenStyleDeclaration
type Kinds<T> = Meta<T> extends { elements: infer E }
  ? E
  : Record<string, undefined>
type Mods<T> = Meta<T> extends { mods: infer M extends ModType } ? M : never
type Parts<T> = keyof Kinds<T> & string
export type OverrideSheetRules<T> = Meta<T> extends {
  system: infer S extends TokenStyleDeclaration
  elements: infer E
}
  ? {
      [K in keyof E as K extends string ? K : never]?: NullableOverride<
        AuthoredElementStyle<
          S,
          E[K] extends ElementType | undefined ? E[K] : undefined
        >
      >
    } & {
      [K in
        | `${keyof E & string}:${string}`
        | `${keyof E & string}~:${string}`]?: {
        [P in keyof E as P extends string ? P : never]?: NullableOverride<
          AuthoredElementStyle<
            S,
            E[P] extends ElementType | undefined ? E[P] : undefined
          >
        >
      }
    }
  : Record<string, unknown>
type VariantRules<T> = Meta<T> extends {
  system: infer S extends TokenStyleDeclaration
  elements: infer E
}
  ? {
      $compose?: string | string[]
    } & {
      [K in keyof E as K extends string ? K : never]?: NullableOverride<
        AuthoredElementStyle<
          S,
          E[K] extends ElementType | undefined ? E[K] : undefined
        >
      >
    }
  : Record<string, unknown>

/** Pure authoritative composition, shared by server resolution and React scopes.
 * Construct the derived sheet before build collection when it adds CSS structure. */
export function overrideSheet<
  T extends object,
  const Rules extends OverrideSheetRules<T>,
  const Variants extends Record<string, unknown> = {},
>(
  sheet: T,
  rules:
    | (Rules & ValidateDeclaration<Rules, OverrideSheetRules<T>, System<T>>)
    | ((
        q: QueryBuilder<System<T>, Parts<T>>,
      ) => Rules &
        ValidateDeclaration<Rules, OverrideSheetRules<T>, System<T>>),
  variants?: (
    $: VariantSelector<Mods<T>>,
    q: QueryBuilder<System<T>, Parts<T>>,
  ) => Variants &
    ValidateDeclaration<Variants, Record<string, VariantRules<T>>, System<T>>,
): T
export function overrideSheet(
  sheet: object,
  rules: unknown,
  variants?: unknown,
): object {
  const apply = (sheet as Record<symbol, unknown>)[APPLY_OVERRIDE]
  if (typeof apply !== 'function')
    throw new Error(
      'Toned overrideSheet: expected a Toned stylesheet with override-layer support',
    )
  return apply.call(sheet, rules, variants)
}
