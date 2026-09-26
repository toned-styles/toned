/** Linear attribute validation avoids enumerating every axis combination. */
type Replace<
  S extends string,
  From extends string,
  To extends string,
> = S extends `${infer Head}${From}${infer Tail}`
  ? `${Head}${To}${Replace<Tail, From, To>}`
  : S

// Match unescapeSelectorPart exactly: percent itself is decoded last.
type Unescape<S extends string> = Replace<
  Replace<
    Replace<
      Replace<
        Replace<Replace<Replace<S, '%2A', '*'>, '%2C', ','>, '%7C', '|'>,
        '%3D',
        '='
      >,
      '%5D',
      ']'
    >,
    '%5B',
    '['
  >,
  '%25',
  '%'
>
type ValueMatches<
  Mods,
  Axis extends string,
  Value extends string,
> = Unescape<Axis> extends keyof Mods
  ? Value extends '*'
    ? true
    : Unescape<Value> extends `${Exclude<Mods[Unescape<Axis>], undefined> & (string | number | boolean)}`
      ? true
      : false
  : false

type AttributeMatches<
  Attribute extends string,
  Mods,
> = Attribute extends `${infer Axis}=${infer Value}`
  ? ValueMatches<Mods, Axis, Value>
  : ValueMatches<Mods, Attribute, 'true'>

export type ValidVariantKey<
  Key extends string,
  Mods,
> = Key extends `[${infer Attribute}]${infer Rest}`
  ? AttributeMatches<Attribute, Mods> extends true
    ? Rest extends ''
      ? true
      : ValidVariantKey<Rest, Mods>
    : false
  : false
