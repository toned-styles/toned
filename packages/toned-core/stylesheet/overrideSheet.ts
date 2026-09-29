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
  VariantEditorDef,
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
                ? // Below a part the sheet's part names are never keys, so
                  // they are not carried down: an element's override shape
                  // is then the same type for every sheet of the system,
                  // instead of being re-derived (~300 keys a level) for each.
                  OverrideDeclaration<T[K], never, true>
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

/**
 * What an override's rules are CONTEXTUALLY typed by (completions, literal
 * typing): the sheet's parts over element shapes shared by every sheet of the
 * system. Validation is separate — ValidateDeclaration against
 * OverrideSheetRules. Using OverrideSheetRules as the contextual type (or the
 * constraint) re-derived the whole nullable rules tree against each call's
 * literal: ~10k instantiations per `overrideStyles` call on a dialog sheet.
 */
export type OverrideRulesContext<T> = Meta<T> extends {
  system: TokenStyleDeclaration
  elements: Record<string, ElementType | undefined>
}
  ? VariantEditorDef<System<T>, Parts<T>, never, Kinds<T>>
  : Record<string, unknown>

/** The contextual vocabulary of one override variant rule; see OverrideRulesContext. */
export type OverrideVariantContext<
  T,
  Named extends string = never,
> = Meta<T> extends {
  system: TokenStyleDeclaration
  elements: Record<string, ElementType | undefined>
}
  ? VariantEditorDef<System<T>, Parts<T>, Named, Kinds<T>>
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
  const Rules extends Record<string, unknown>,
  const Variants extends Record<string, unknown> = {},
>(
  sheet: T,
  rules:
    | ((Rules | OverrideRulesContext<T>) &
        ValidateDeclaration<Rules, OverrideSheetRules<T>, System<T>, Parts<T>>)
    | ((
        q: QueryBuilder<System<T>, Parts<T>>,
      ) => (Rules | OverrideRulesContext<T>) &
        ValidateDeclaration<Rules, OverrideSheetRules<T>, System<T>, Parts<T>>),
  variants?: (
    $: VariantSelector<Mods<T>>,
    q: QueryBuilder<System<T>, Parts<T>>,
  ) => (
    | Variants
    | Record<
        string,
        OverrideVariantContext<T, ExtractNamedStyles<NoInfer<Variants>>>
      >
  ) &
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
