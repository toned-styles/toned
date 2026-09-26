/** Preserve explicit named keys alongside the selector's string index signature.
 * Mapping values and then indexing by keyof Input loses these explicit members. */
type NamedKeys<Input> = keyof {
  [Key in keyof Input as Key extends `$named$_${string}`
    ? Key
    : never]: Input[Key]
}

type UnwrapName<Key> = Key extends `$named$_${infer Name}` ? Name : never

/** Names declared by $('name') in this exact callback result. */
export type ExtractNamedStyles<Input> = UnwrapName<NamedKeys<Input>>

/** Cross-kind composition could smuggle kind-restricted tokens/raw styles.
 * Unspecified legacy kinds retain their historical permissive behavior. */
export type ComposableParts<Kinds, Target extends keyof Kinds> = {
  [Source in keyof Kinds]: undefined extends Kinds[Target]
    ? Source
    : undefined extends Kinds[Source]
      ? Source
      : [Kinds[Source]] extends [Kinds[Target]]
        ? Source
        : never
}[keyof Kinds] &
  string
