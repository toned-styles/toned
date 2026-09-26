import type { QueryBuilder } from '../system/queries.ts'
import type {
  ElementType,
  ModType,
  TokenStyleDeclaration,
} from '../types/index.ts'
import type {
  ExtractNamedStyles,
  StylesheetInput,
  ValidateDeclaration,
  VariantStyleDef,
} from '../types/stylesheet.ts'
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

type OverrideDeclaration<
  T,
  Parts extends string,
  Local extends boolean = false,
> = T extends (...args: any[]) => unknown
  ? T
  : T extends readonly unknown[]
    ? T | null
    : T extends object
      ? {
          [K in keyof T as Local extends true
            ? K extends '$kind' | '$$type'
              ? never
              : K
            : K]: K extends '$compose'
            ? T[K]
            : Local extends true
              ? K extends
                  | `@${string}`
                  | `${string}:${string}`
                  | `[${string}`
                  | Parts
                  | `$${Parts}`
                ? OverrideDeclaration<T[K], Parts, true>
                : NullableOverride<T[K]>
              : OverrideDeclaration<T[K], Parts, K extends Parts ? true : false>
        }
      : T | null

type Meta<T> = T extends { readonly __toned__?: infer M } ? M : never
type System<T> = Meta<T> extends {
  system: infer S extends TokenStyleDeclaration
}
  ? S
  : TokenStyleDeclaration
type Kinds<T> = Meta<T> extends {
  elements: infer E extends Record<string, ElementType | undefined>
}
  ? E
  : Record<string, undefined>
type Mods<T> = Meta<T> extends { mods: infer M extends ModType } ? M : never
type Parts<T> = keyof Kinds<T> & string

/** The authored sheet vocabulary, with nullable inherited style leaves. */
export type OverrideSheetRules<T> = Meta<T> extends {
  system: TokenStyleDeclaration
  elements: Record<string, ElementType | undefined>
}
  ? OverrideDeclaration<
      StylesheetInput<System<T>, Record<string, unknown>, Parts<T>, Kinds<T>>,
      Parts<T>
    >
  : Record<string, unknown>

/** Shared by pure override sheets and React's ambient override entries. */
export type OverrideSheetVariantRules<
  T,
  Named extends string = never,
> = Meta<T> extends {
  system: TokenStyleDeclaration
  elements: Record<string, ElementType | undefined>
}
  ? OverrideDeclaration<
      VariantStyleDef<System<T>, Parts<T>, Named, Kinds<T>>,
      Parts<T>
    >
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
    | (Rules &
        ValidateDeclaration<Rules, OverrideSheetRules<T>, System<T>, Parts<T>>)
    | ((
        q: QueryBuilder<System<T>, Parts<T>>,
      ) => Rules &
        ValidateDeclaration<Rules, OverrideSheetRules<T>, System<T>, Parts<T>>),
  variants?: (
    $: VariantSelector<Mods<T>>,
    q: QueryBuilder<System<T>, Parts<T>>,
  ) => Variants &
    Record<
      string,
      OverrideSheetVariantRules<T, ExtractNamedStyles<NoInfer<Variants>>>
    > &
    ValidateDeclaration<
      NoInfer<Variants>,
      Record<
        string,
        OverrideSheetVariantRules<T, ExtractNamedStyles<NoInfer<Variants>>>
      >,
      System<T>,
      Parts<T>
    >,
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
