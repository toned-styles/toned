# @toned/core

Toned declares a typed design vocabulary, named parts, variants and conditions.
The matcher compiles declarations once; output backends resolve them; mounted
hosts own direct updates. React is a separate integration.

## Declare a system

```ts
import { defineSystem, defineToken, type Variants } from '@toned/core'

export const ui = defineSystem({
  id: 'example',
  tokens: {
    bgColor: defineToken({
      values: ['primary', 'primary-hover'],
      resolve: (value) => ({
        backgroundColor: value === 'primary' ? '#2563eb' : '#1d4ed8',
      }),
    }),
    opacity: defineToken({
      values: [0, 0.5, 1],
      resolve: (value) => ({ opacity: value }),
    }),
  },
  conditions: {
    media: { md: 768 },
    containers: { field: { wide: 448 } },
  },
})

type ButtonVariants = { size: 's' | 'm'; variant: 'accent' | 'quiet' }

export const button = ui
  .stylesheet({
    Root: {
      $kind: 'pressable',
      bgColor: 'primary',
      ':hover': { bgColor: 'primary-hover' },
      '@platform web': { $style: { cursor: 'pointer' } },
    },
  })
  .variants(($: Variants<ButtonVariants>) => ({
    [$.size('s').variant('quiet')]: {
      Root: { opacity: 0.5, '@md': { opacity: 1 } },
    },
  }))
```

Keep token properties camelCase and named values kebab-case. A semantic
`typography: 'body-small'` token can resolve several fields; the core does not
force a CSS vocabulary. `$kind` is static metadata (`view` by default), `$style`
is low-level styling, `@` introduces a query, and `:` introduces a state.
Conditional rules inherit the part kind and cannot change it.

`$style` is a portable property/value intersection. Inside `@platform web` it
accepts web CSS types; inside `@platform native` it accepts the declared native
style subset for that part kind. Foreign platform blocks are filtered before
capability validation. Portable raw styles exclude `lineHeight` and numeric `flex`
shorthand because their web/native meanings differ; use semantic typography or
explicit flex fields, or a platform block. Native `textAlign: 'auto'` also stays
in its platform block. Legacy `$$type` and `style` remain compatibility
spellings. New code should use canonical metadata and explicit
platform scopes for platform-specific styles.

A platform block has one spelling, `'@platform web'` (or `'@platform native'`),
which is also what `q.platform('web')` returns (`toned/canonical-condition-key`
rewrites `[q.platform('web')]` to the string). The `'@platform.web'` alias is
deprecated: it still resolves, the lint rule `toned/canonical-platform-key`
rejects it and fixes the key, and writing both spellings in one part is a type
error (and throws), because one block would replace the other.

### Targets

A system can declare the renderers it is rendered by:

```ts
export const site = defineSystem({ id: 'site', targets: ['web'], tokens })
site.stylesheet({ Root: { $style: { cursor: 'pointer', maxWidth: '42rem' } } })
```

`targets` is a list of `'web' | 'native' | 'email' | 'pdf' | 'tailwind'`, and a
part's style type is what every declared target supports:

| Targets                              | `$style` (and `$style` inside conditions) |
| ------------------------------------ | ----------------------------------------- |
| omitted, or `['web', 'native']`      | the portable style, as above              |
| `['web']`, `['tailwind']`            | web CSS, as inside `'@platform web'`      |
| `['web', 'email']`, `['email']`      | inline-safe CSS: no CSS variables         |
| `['native']`                         | the native style subset                   |
| `['pdf']`, any mix of web and native | the portable style                        |

Inside a platform block the type narrows to the targets that read it (web reads
`'@platform web'`; email and Tailwind do too; native and PDF read
`'@platform native'`). A system with a static target (`'email'` or `'pdf'`)
renders one style per part, so a condition key (`':hover'`, `'@md'`, a declared
state, a cross-part key) is a type error that names the static target and
suggests a variant; with an email target, `$webRules`, `$grid` and `$area` are
type errors too. Creating a renderer for a target the system did not declare
throws, naming the declared targets. Without `targets` nothing changes: every
renderer is allowed and the remaining checks happen at render time.

### Keyword values are checked

csstype types most CSS properties as their keywords plus any string, so in web
CSS `cursor: 'pointr'` would compile and do nothing. For the properties whose
values are a closed keyword set (`cursor`, `display`, `overflow`, the box
alignment properties, `fontStyle`, `fontWeight`, `textAlign`, `textTransform`,
`textDecorationLine`, `borderStyle`, `whiteSpace`, `touchAction` and a few more:
the `KeywordGrammars` table in `types/keywords.ts`), a literal string value must
be one of its keywords, compared without case. A property that takes several
keywords takes a space-separated list of them (`display: 'inline flex'`,
`alignItems: 'safe center'`). A CSS-wide keyword (`inherit`, `unset`, …) is
always accepted, and so is any value with a function or quoted text in it
(`var(--x)`, `env(…)`, `url(hand.svg), pointer`). Anything else is a type error
naming the property, the wrong word, the closest keyword and the keywords:

```text
'pointr' is not a 'cursor' keyword. Did you mean 'pointer'? Keywords: 'alias', …
```

A value typed `string` (computed at runtime) is not checked. Properties csstype
types as a closed union (`position`, `visibility`, `pointerEvents`, `boxSizing`,
`objectFit`, …) were checked already, and portable and native styles are closed
unions too. `listStyleType` is not checked: a custom counter style is any name.

### Compose fragments with a `$style` list

```ts
const focusRing = { outlineWidth: 2, outlineStyle: 'solid' } as const
Root: {
  '@platform web': { $style: [focusRing, still && motionless, { maxWidth: '42rem' }] },
}
```

`$style` takes a list wherever it takes an object (parts, conditions and
platform blocks, with the same part-kind typing). Entries merge in order and the
last wins; falsy entries are skipped, so `cond && fragment` works; an entry of
`null`s (`{ zIndex: null }`) unsets what an earlier entry set, and in `extend`
removes the inherited value as a single `null` does. The list is folded once,
when the declaration is normalized. Spreading two fragments into a part instead
(`{ ...focusRing, ...pointer }`) silently keeps only the last `$style`,
platform or condition block: `toned/no-shadowing-spread` reports that, naming
the shadowed key.

### Bridges: `$bridge`

A bridge reaches what an element's own style cannot: a pseudo-element
(`::placeholder`, `::-webkit-scrollbar`) or a descendant (` svg`). The system
declares it once, and a part writes its parameters by bridge and property name:

```ts
conditions: {
  bridges: { scrollbar: { selector: '::-webkit-scrollbar', properties: ['display'] } },
}
// in a sheet:
List: { $bridge: { scrollbar: { display: 'none' } } }
```

`$bridge` goes wherever `$style` goes (a part, a condition, a platform block,
beside `$style`). Core writes the inline custom property the bridge's generated
rule reads, `--toned-b-scrollbar-display`; the name is core's own, so a
namespaced system never renames it, and the rule and the value always agree. An
undeclared bridge or property is a type error listing the declared ones, and
throws when the sheet is created. Writing the variable by hand in `$style` is a
type error when no declared bridge reads it, and `toned/prefer-bridge-key`
rewrites it to `$bridge` otherwise. A token can still resolve to a bridge
parameter (`resolve: (v) => ({ [bridgeVarName('placeholder', 'color')]: … })`)
to give it a semantic scale.

New descriptor systems use fixed logical pixels for both viewport and container
thresholds. Numeric logical lengths are accepted; font-relative, theme-relative,
negative and nonfinite thresholds are rejected. Legacy `defineSystem(tokens,
config)` retains its spacing-scale container behavior for migration.

Logical fields map through an explicit, immutable `layout` context that defaults
to horizontal LTR. CSS output supports the declared direction and writing modes;
native output rejects vertical writing modes because the native host contract has
no vertical text layout. See [portable values and logical layout](core/README.md#portable-values-and-logical-layout).

## Conditions and precedence

A condition is a string key. Write it directly; the compiler checks every name
in it against the system's declarations:

| Condition | Key |
| --- | --- |
| A state (built-in or declared) | `':hover'`, `':open'` |
| Two states together | `':open:hover'` |
| A declared media threshold | `'@md'` |
| A fixed width | `'@>=768px'` |
| A declared container step | `'@field/wide'` |
| Media and container algebra | `'@md&!lg'`, `'@md\|field/wide'`, `'@!md'` |
| A media condition and a state | nest them: `'@md': { ':hover': { … } }` |
| Another part's state, at the sheet root | `'Trigger:open': { Chevron: { … } }` |
| A platform block | `'@platform web'` |

```ts
const emphasis = ui.stylesheet({
  Root: {
    opacity: 1,
    '@md&!lg': { opacity: 0.5 },
    '@md': { ':hover': { opacity: 0 } },
  },
})
```

The system-bound `q` builders (the stylesheet callback's `q`, the variants
callback's second argument, or `ui.q`) remain for what a string cannot express:

- a computed threshold, `q.media(dp(600))` and `q.container(name, dp(300))`;
- a relation between registered parts,
  `q.part('Root').has('Item', 'checked', { scope: 'descendant' })`;
- a disjunction or negation involving a state or a relation,
  `q.not(q.any(q.media('md'), q.state('hover')))`, and a variant selector as an
  operand (`q.all($.size('s'), q.media('md'))`).

A builder call that has a string form (`[q.state('open')]`, `[q.media('md')]`,
`[q.all(q.media('md'), q.state('hover'))]`, `[q.part('Item').state('hover')]`,
`[q.platform('web')]`) is a lint error, and `toned/canonical-condition-key`
rewrites it to the string, or to the nested form for a media condition with a
state. It does the same for the long aliases `'@media md'` (`'@md'`) and
`'@container field wide'` (`'@field/wide'`). A rewrite that would repeat a key
the object already has is reported without a fix: merge the two blocks.

A system's `media` names fixed width thresholds, and may also name a raw web
media condition: a parenthesised query, or one led by a media type
(`all`, `print`, `screen`):
`media: { md: 768, motionless: '(prefers-reduced-motion: reduce)', print: 'print' }`. It is a
condition like any other (`'@motionless': { … }`), toggled by the build. Native
has no such query and refuses it unless the host declares it.

The standalone `bp`, `cq`, `and`, `or` and `not` builders are kept for
compatibility in `@toned/core/compat`. `cq(name).min(number)` values use a
system's spacing scale. When migrating to `q.container(name, dp(number))`,
supply the resolved logical width: 100 legacy units at the default 4px base
become `dp(400)`. A named step is the string `'@field/wide'`.

Compound builders produce self-contained deterministic keys; they do not allocate
registry IDs or normalize Boolean expressions into an exponentially growing DNF.
Pass operands inline or as a readonly tuple so TypeScript retains the expression
and can validate every referenced part. Arbitrary runtime arrays lose that exact
key information and are not accepted by checked declarations. Each expression is
bounded to 512 nodes and 64 KiB and fails explicitly if it exceeds either limit.
A bare `':hover'` (or `q.state(...)`) binds to its enclosing part; sheet-level
groups name the part, `'Root:hover'`. The direct cross-part key selects one
source; use `q.all` or `q.any` for compound cross-part conditions.
An axis builder can be reused as a direct variant key and as an operand in
`q.all`, `q.any` and `q.not`; reading an operand does not declare another rule.
Compound query keys are primitive strings. Repeating the same complete key in
one object follows JavaScript's last-key-wins behavior, including in variants and
overrides; merge its body instead. TypeScript rejects duplicates when their keys
are statically known, but cannot catch every dynamically computed key. The direct
axis-builder duplicate guard cannot detect this after object construction.
Counting query construction would also
reject valid reuse of one condition in separate parts or larger expressions.

Annotate the single `.variants` callback and put compound conditions directly in
its returned objects. Query builders return typed `QueryKey` strings; use those
keys in declarations rather than assembling predicate objects. Explicit-generic
callback and object variant declarations remain compatible.

A key a stylesheet does not accept is a type error whose text names the fix:
its value is checked against `TonedError<"…">` (a type exported from
`@toned/core`), so the compiler prints, for example,
`TonedError<"Unknown state ':opne'. Did you mean ':open'? Declared states: ':open'; built-in: …">`.
Unknown tokens, CSS properties, states, media and condition-expression atoms
(`'@md&!xx'`), parts in cross-part keys, raw selectors (`"[data-state='open']"`
names the declared state to write), web-only CSS and CSS variables in portable
`$style`, and conditions written inside `$style` each have a message. The
runtime errors for the same facts name the key and the declared set too. A
sheet-level `'@<name>'` block is not checked by type (root keys are open); it
fails at construction with the declared media.

In descriptor systems, later matching declarations within a precedence layer win
each resolved field. Legacy systems retain their historical pseudo/breakpoint
order within a layer; a higher override layer still wins over the whole lower layer.
A compound variant has no implicit specificity bonus. Use `.variants(($: Variants<Mods>, q) => ({ … }))` to infer the schema and
check the complete returned declaration, including excess keys in nested rules.
The callback offers part, token, variant-value and system-query completions.
Re-export the type from your design-system module to write `ui.Variants<Mods>`
with a namespace import (`import * as ui from "./ui"`). Reusable type aliases and interfaces both work, including optional axes.
The annotation has no runtime cost. Literal rule keys are checked against declared
axes and values, including combined attributes, named fragments and condition
aliases. A misspelled literal remains an error beside a computed selector.
TypeScript can widen arbitrary dynamically computed keys to a string index; their
spelling cannot then be proved. Use `$.axis(value)` and the query builders for
computed keys so arguments are checked before that widening occurs. Place
platform-specific styles inside the variant's part or condition group: mixing a
separate top-level platform rule with widened computed variant keys loses the
key-to-host association needed to validate its raw styles.
The explicit-generic direct callback and object signatures remain compatible;
the explicit-generic direct callback cannot catch every excess property.
Callbacks without explicit method type arguments use the checked overload,
including callbacks annotated with `VariantSelector`, so excess keys are
rejected. Keep an extracted factory's result literal (for example
`return { ... } as const`) so finite token values do not widen to `number` or
`string`; inline callbacks receive that context automatically. Overload errors
can mention `VariantsInput`, the final compatibility signature; check the
callback's declarations and literal values first.
Variant keys are canonical
literal strings at runtime and in TypeScript, including multi-value selections.
The matcher keeps a fast unsigned single-word path and uses multiple words beyond
32 allocated values. Equality uses exact rule membership and output operations,
not a lossy XOR hash. Caches are bounded and compiled plans are shared.

### Declared states and their relations

A system declares the states its markup sets, by selector:
`states: { open: "[data-state='open']", disabled: ':disabled' }`. A part reads
its own state with `':open'`. On the web the toggle is a
non-inheriting registered custom property (`@property … { inherits: false }`),
so a state on an ancestor never reaches a descendant; this needs a browser with
`@property` (Chrome 85, Safari 16.4, Firefox 128). A state whose selector
contains `:hover` is gated in `@media (hover: hover)`, as `:hover` is.

Another part reads a state only through a relation the state declares:

```ts
states: {
  open: { selector: "[data-state='open']", relations: ['ancestor'] },
  'size-sm': { selector: "[data-size='sm']", relations: ['sibling'] },
  checked: "[data-state='checked']", // its own part only
}
```

- `ancestor`: `'Trigger:open'` styles the
  parts inside the nearest `Trigger` in the state.
- `sibling`: `'Trigger~:size-sm'` styles the parts that follow `Trigger` as
  siblings.

Each relation is CSS that every styled element pays for in style
recalculation; the sibling one grows with the square of a list's length. A
key reading a state through an undeclared relation is a type error and throws
when the sheet is built, naming the declaration to add. `:hover` and
`:focus-within` keep their built-in relations. The selector of a state that
declares a relation must be an attribute or pseudo-class selector.

Upgrading from 1.0: a string state no longer offers the `ancestor` or `sibling`
channel. For each state your sheets read as `'Part:state'` or `'Part~:state'`,
rewrite `name: selector` to `name: { selector, relations: [...] }`; the type
errors list every such key.

### Context markers: style a part by an ancestor component

`'Trigger:open'` relates parts of one sheet. To style a part by the state or
kind of an ancestor in another component (a title inside a hovered card, a
paragraph inside an FAQ answer), the system declares the context and what it
offers, a provider part declares it, and the part keys on it:

```ts
const ui = defineSystem({
  id: 'site',
  tokens,
  conditions: {
    contexts: {
      card: { states: ['hover'] },
      prose: { values: ['faq', 'callout'] },
    },
  },
})

const card = ui.stylesheet({ Root: { $context: 'card', padding: 4 } })
const prose = ui
  .stylesheet({ Root: { $context: 'prose' } })
  .variants(($: Variants<{ kind: 'faq' | 'callout' }>) => ({
    [$.kind('faq')]: { Root: { $context: 'prose=faq' } },
    [$.kind('callout')]: { Root: { $context: 'prose=callout' } },
  }))

const title = ui.stylesheet({
  Root: {
    textColor: 'muted',
    '@within card:hover': { textColor: 'accent' },
    '@within prose=faq': { fontSize: 'sm' },
  },
})
```

- `'@within card'` applies inside a `card` provider, `'@within prose=faq'`
  inside one whose value is `faq`, `'@within card:hover'` while it is hovered.
  The nearest provider of a context answers.
- `$context` is static: set it on the part, or in a variant block to follow a
  variant. It takes one marker, or a list when a part provides two contexts.
- A context's `states` are its relation channel, as a state's `relations`
  are: built-in states (`hover`, `focus`, `focus-visible`, `focus-within`,
  `active`) or declared states whose selector attaches to the provider. A
  hover state is gated in `@media (hover: hover)`.
- `'@within …'` nests with other conditions (`'@md': { '@within prose': … }`).
  It cannot be negated: style the default outside and override inside.
- An undeclared context, value or state is a type error and throws when the
  sheet is built, naming the declaration to add. So is `$context` inside a
  condition.

On the web the provider carries marker classes (`site--_cx_card`, and
`site--_cx_prose_faq` for a value) and the system's CSS carries one
`:where()` rule per declared context, value and state, generated from the
declaration alone: no sheet is read. Each rule sets an inherited custom
property on the provider, and a descendant reads it through its ordinary
condition chain, so specificity is zero everywhere and the rule's subject is
the provider, not every descendant. A context costs 43 bytes, a value 76 and
a hover state 112 (`bun scorecard/scorecard.ts`, `css.bytesPerContext*`);
style recalculation does not grow with the number of declared contexts
(`benchmarks/README.md`).

On native, a provider rendered as a toned element (`createElements`, `<s.Root>`)
gives its markers to the React tree below it, and `useStyles` reads them, so
`'@within card'` and `'@within prose=faq'` work the same way. A provider
spread as props (`{...s.Root}`) cannot wrap its children and provides
nothing. Native has no provider state across components: in a system whose
`targets` include `'native'`, `'@within card:hover'` is a type error outside
`'@platform web'`, and the native renderer throws for one it meets.

### Shorthands and CSS-wide keywords under conditions

On the web a part's conditions compile into one inline style, where each
conditional field reads `var(--rule, <value at rest>)`. Two consequences:

- A shorthand and one of its longhands in different blocks of one part
  (`transition` at rest, `transitionProperty` under `':open'`) is a type error:
  write the longhands, or set the whole shorthand in each condition. Sheets the
  types cannot see whole (`extend`, variants, untyped callers) are handled at
  resolve time: the shorthand is split into its longhands (`transition`,
  `overflow`, `outline`, `border` and its sides, `borderRadius`, `padding`,
  `margin`, `inset`, `gap`, `flex`, `flexFlow`, the `place*` pairs, and a
  single-colour `background`), so each longhand has one chain. A value that
  cannot be split without the browser (a `var()`, an `animation`, a layered
  `background`) throws, naming both fields and the fix; when every field
  involved is unconditional it is left as written. Chromium's computed styles
  for the split forms are checked by `node benchmarks/cascade-browser.mjs`.
- A CSS-wide keyword (`inherit`, `initial`, `unset`, `revert`, `revert-layer`)
  under a condition is a type error and throws at resolve time: a keyword that
  reaches a property through a custom property computes as `unset`. At rest it
  is the chain's fallback, where it works. Set the value the state should take,
  or write a selector rule with `$webRules`.

### Responsive atoms: declared pairs

A legacy-form system can compile a token's values under a named condition to
classes (`@md:maxW_32`) instead of an inline chain, so a caller's own utility
class still overrides the responsive default. Declare which conditions each
token responds to:

```ts
defineSystem(tokens, {
  breakpoints,
  responsiveTokens: { maxW: ['sm', 'md'], textStep: ['md'] },
})
```

Only the declared token and condition pairs emit atoms. Setting `maxW` directly
under `'@lg'` is a type error naming the declared conditions, and throws at
resolve where types cannot see the sheet (`extend`, variants). A condition nested
under another (`':hover': { '@lg': … }`) keeps its chain. A name that is not a
token or a declared condition is refused when the system is defined. The pairs
come from the declaration only: the build never reads a stylesheet to find them.

The list form, `responsiveTokens: ['maxW']`, is kept for compatibility and emits
the token under every declared condition, including non-width ones such as
`(pointer: coarse)`. To migrate, replace the list with the record, listing for
each token the conditions its sheets use; the type errors name any you miss.
In a responsive atom, four equal sides of `margin`, `padding`, `inset`,
`borderWidth`, `borderStyle`, `borderColor` or `borderRadius` are written as
the one shorthand.

## Reuse named fragments and part declarations

Declare a named fragment with `[$('interactive')]` inside the same variant
callback and apply it with `$compose: 'interactive'` at rule level. The annotated
callback infers the exact names for completion and rejects unknown names, including
references inside other named fragments. Arrays compose from left to right; the
rule's own declarations apply last. Named fragments do not create variant matches.

Inside a part declaration, `$compose: 'Label'` instead refers to a declared part.
The source comes from the same rule when present, otherwise from the sheet's base
part declarations. Derived sheets use their effective declared defaults, including
prior overrides and null removals, when copying base parts. Explicitly typed parts can compose only from the same kind,
so composition cannot move text-only styles or kind-restricted tokens into views.
Legacy unspecified kinds retain their previous permissive behavior. Composition
copies styles, not the source part's `$kind`.

Declared part names (and their `$Part` aliases) are also reserved as nested target
keys by the legacy declaration grammar. A token cannot share one of those names
at that position; its object payload would be interpreted as a target declaration.

Part and named-fragment references resolve transitively. Unknown references and
cycles throw during stylesheet construction, including in unused named fragments;
untyped callers cannot silently lose styles. A composed source remains an ordinary
part that can be rendered independently. The same composition rules apply inside
media, container, cross-part, compound-query and platform groups. Put the condition
around a part map when composing under that condition; `$compose` nested inside an
individual part's condition block is rejected. Root query groups must name their
source part (`'Root:hover'`); a local `':hover'` belongs inside
that part's declarations.

## Build CSS before rendering

```ts
// Build script; include lazy stylesheet declarations explicitly.
import { buildStyles } from '@toned/core/build'
const { css, manifest } = buildStyles(ui, {
  sheets: [button, emphasis],
  layer: 'components',
})
// Write css to an application asset and manifest to a generated module.
```

Deliver the asset before first paint. Namespaced systems prefix generated classes,
condition variables and keyframes with their ID. Bridge parameters
(`--toned-b-*`) are the exception: core writes and reads them under one name in
every system. Theme variables consumed by such
a system must use the same namespace. Declared `themes` are namespaced by the
build; for a separately generated palette, `namespaceCss` from
`@toned/core/system` applies the same prefix. A system consuming an existing application palette can
declare `externalCssVariables: ['--brand', '--font-body']` beside its `id` and
`tokens`. These exact custom-property names remain unchanged in generated CSS and
runtime output; classes, condition toggles and undeclared variables remain isolated.
The immutable, validated list is part of the manifest contract. External variables
must be supplied by the application; Toned does not discover or emit their values.

In a namespaced system, every `var(--x)` written in `$style` must name a variable
the system owns or a listed one. The system owns a custom property a sheet sets
(`$style: { '--bar': '3rem' }` on any of its parts, conditions or variants, or in
the base sheet it extends) and core's own `--toned-*` / `--toned_*` parameters,
bridge variables included, which never need listing. Any other name would be
renamed to `--<id>-x` and resolve to nothing, its fallback hiding the mistake, so:

- where the value is a literal and the list is a literal tuple, it is a type error
  naming the variable, the listed ones and the fix;
- in development, creating the sheet throws the same message. The check reads each
  `$style` once per sheet, never per resolve, and runs where toned's development
  warnings run: `process` exists and `NODE_ENV` is not `production` (Node, Bun,
  SSR and tests; a browser bundle without `process` skips it). A list computed at
  runtime (`names.map(…)`) is `string[]` to the compiler, so only this check sees it.

A variable set by a different sheet, or by the application outside toned, belongs
in `externalCssVariables`. Text in quotes or `url()` is not a reference.
Resolver implementation
changes still require rebuilding the CSS asset; schema validation is not a source-code hash.
The build manifest records ad-hoc conditions and the exact static system schema,
including named query thresholds, alpha channels/steps, token applicability and pseudo-rule presence. A pure web renderer rejects a changed schema
or an undeclared condition with a regeneration instruction; it never injects a rule.
Token names are canonicalized in that schema, so a bundler changing module-export
enumeration order does not invalidate an otherwise identical system. This does
not reorder emitted CSS or weaken its byte-level artifact fingerprint.

`@toned/core/build` contains generators only. `@toned/core/dev/inject` is an
explicit optional development tool. The `@toned/core/dom` entry remains for compatibility.
The Vite plugin serves `virtual:toned.css`; import it explicitly, supply watched
`inputs`, and pass the complete system ref with a `sheets` collector, e.g.
`toned({ system: ui, sheets: () => [button], inputs: ['./button.ts'] })`.
It delegates to the same build path and exposes the paired manifest through
`virtual:toned.manifest` (a default export). Both modules share one collection per
build or watched invalidation. Passing a raw `system.system` token dictionary
remains compatible, but requires an explicit namespace `id` and condition
collector; it cannot collect sheets or check their runtime namespace.
The plugin does not insert a style node into HTML; the application imports the
CSS module.

### Named outputs: nothing generated is committed

When a host has several systems, extra generated stylesheets, or consumers that
do not run Vite (tests, Metro), write **output files** instead of generated
files. Each `<name>.toned.ts` default-exports a build artifact, or `{ css, data }`,
finishing its work while it is imported (top-level `await`). `defineOutput` types
the export, so a misspelled key, data that is not JSON or an unawaited promise is
a type error:

```ts
// src/toned/ui.toned.ts
import { buildStyles } from '@toned/core/build'
import { defineOutput } from '@toned/core/outputs'
export default defineOutput(buildStyles(ui, { sheets: [button], layer: 'components' }))

// src/toned/ui-palette.toned.ts
const notes = new URL('./palette.md', import.meta.url)
export default defineOutput({
  css: paletteCss(readFileSync(notes, 'utf8')),
  data: { swatches },
  inputs: [notes], // read outside the imports: rebuild when it changes
})
```

The file name is the output name. A stylesheet imports the CSS at any depth,
keeping its own cascade order: `@import 'toned:ui' layer(components);`. Code
imports `toned:ui/manifest` (or any `data` key), and `toned:ui/css` is the CSS as
a string. An output file may import another output, which is how a usage
inventory can feed the system it narrows; outputs that import each other are an
error naming the cycle.

The package that owns the outputs declares them once, in its package.json:

```json
{ "name": "@acme/ui", "toned": { "outputs": ["src/toned/*.toned.ts"] } }
```

Every consumer then finds them from its own root through the dependency graph:
the root package's dependencies of every kind, then, for each workspace package
or dependency that has a `toned` field, its `dependencies`, `optionalDependencies`
and `peerDependencies`. A published package that ships outputs declares a `toned`
field (even `{}` to pass a dependency's outputs on). Explicit `outputs` globs,
relative to the consumer's root, replace the declarations.

| Consumer             | Entry                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Vite                 | `tonedOutputs()` from `@toned/core/vite`                                                   |
| Bun (tests, scripts) | `bun --preload @toned/core/bun/register`, or `Bun.plugin(tonedBunPlugin())` from `@toned/core/bun` |
| Metro                | `withTonedOutputs(config)` or `withTonedOutputsSync(config)` from `@toned/core/metro`      |
| Anything else        | `loadOutput(name, { root })` from `@toned/core/outputs/runner`                             |

All four use one loader (Vite 6 or later): each output is evaluated by Vite's
module runner in its own module graph, never in the process that imports it, so
an output never depends on what its host already loaded. Loads that overlap
share one runner, so a module two outputs import runs once. The same shape
checks, error messages (`toned:nope is not a Toned output; the outputs are: …`,
`toned:ui has no "tokens"; it has: css, manifest`) and data keys apply to every
consumer; `outputs/contract.test.ts` runs one suite against all four. JSX
compiles with the automatic runtime; pass `runner` for other Vite config the
files need.

The Vite plugin builds the outputs when the build or dev server starts, once for
every environment of a build (it is `sharedDuringBuild`). In dev it watches every
file an output read and its `inputs`; an edit rebuilds that output and the
outputs importing it, a new or deleted output file is picked up without a
restart, and a failed build shows in the error overlay while the other outputs
keep serving. CSS `@import` resolves through aliases rather than plugin hooks,
so the CSS is written to `<vite cacheDir>/toned/<name>.css`, outside the source
tree. An unknown name, from CSS or code, fails the build with
`toned:<name> is not a Toned output; the outputs are: …`.

Bun builds an output only when one of its specifiers is first loaded, and serves
every data key, including by dynamic `import()`. With `cacheDir`, the processes
of a run (such as `--isolate`d test files) share builds: an entry is keyed by the
root and globs and records a hash of every file the output read, so it is
rebuilt when one changes and never served to another project. The register
preload keeps that cache in `node_modules/.cache/toned/bun` (or
`TONED_OUTPUTS_CACHE`). The first build in a process costs the module runner
(about 250 ms for 75 component modules); a cached one costs hashing its files.

Metro reads the same cache layout from `node_modules/.cache/toned`; restart it
after changing declarations. Add `@toned/core/vite/client` to `types` (or a
triple-slash reference) for the `toned:` module declarations.

Publish CSS and its manifest together. `assertBuildArtifact({ css, manifest })`
checks the original generated asset's fingerprint before publication; after
minification, hash the final delivery bytes in the application's asset pipeline.
The pure renderer does not fetch or inspect served stylesheets, and a manifest
alone cannot prove which asset a browser loaded. The fingerprint is a content
identifier for accidental drift, not a security digest. Changes inside `resolve`
or `pseudoRules` functions require rebuilding assets; schema checks track function
presence, not function source or captured values.

## Pure server and alternative output

```ts
import { createWebRenderer } from '@toned/core/server'
const web = createWebRenderer(ui, { manifest })
const props = web.resolve(button, {
  variants: { size: 's', variant: 'accent' },
})
// <button {...props.Root} /> works in an RSC/server entry: no hooks or refs.
```

Web renderers default to CSS custom-property references (`var(--name)`). Explicit
`tokens` override those defaults. Each renderer exposes `t` for lightweight token
composition using that renderer's backend and immutable tokens:

```ts
const props = web.t({ padding: 2 }, { $style: { opacity: 0.8 } })
```

When a token helper must exist before CSS generation (for example in a declaration
module imported by the CSS inventory), use the standalone explicit constructor:

```ts
import { createTokenStyles, cssVariableTokens } from '@toned/core/server'
export const t = createTokenStyles(ui, {
  tokens: cssVariableTokens(),
  platform: 'web',
  useClassName: true,
})
```

It requires no manifest and reads no installed global config. It does not generate
or deliver CSS; the application's build still owns the classes it requests.
`cssVariableTokens()` returns a frozen null-prototype token proxy preserved through
immutable snapshots. Use concrete token values for native output. `renderer.t` is
an ergonomic shortcut using the renderer's selected backend; it validates required
build conditions. Both helpers retain the same typed composition and symbol protocol
as legacy `system.t`, which remains available for consumers using installed config.
Helpers are explicit snapshots and do not subscribe to provider theme changes.
For recursively immutable declaration/token data, `style` and `className` share
one lazy resolved output, including when spread into props. Opaque class instances
and function values retain their identity and disable this caching, so valid
mutable payloads remain observable. Legacy `system.t` continues reading its live
installed context on each getter access.

`createInlineRenderer(ui, { tokens })` produces concrete web style props for email
and static HTML without a manifest, global configuration, hooks, or CSS assets.
Spread the complete result of `renderer.resolve(sheet).Part` into the email
component. Explicit variants and platform branches work; media, state, container,
relation conditions and CSS extensions are rejected before branch selection.
CSS variables, class names, non-finite numbers and structured CSS values are also
rejected. Email-client property support remains the template author's responsibility;
this backend does not add Outlook fallbacks or rewrite unsupported CSS.
All pure renderer constructors return the exported `PureRenderer<S>` contract,
so applications can export renderer instances from declaration-emitting packages.

`createPdfRenderer(ui, { tokens })` resolves static report styles in a finite
profile shared by React PDF and Forme. Numeric measurements are points. It keeps
percentage dimensions and PDF `textDecoration`, and rejects browser conditions,
CSS variables, web units, native-only fields, transforms and grid. The profile
uses native platform branches but has its own field/value validation; it does not
pretend that React Native and PDF hosts have identical style contracts. See the
email and PDF examples for full-props spreading into their host components.

`createNativeRenderer` evaluates the same declarations with explicit host facts
and rejects fields outside its documented finite native profile. Unsupported CSS
properties and values fail visibly instead of reaching a native host silently.
`createRenderer` accepts an output backend. Define exact field/value mappings and
fixed parameter utilities with `createTailwindBackend` from `@toned/core/backends`.
Then call `buildTailwind(ui, profile, { sheets, tokens, source, compile })` from
`@toned/core/build`, passing the application's actual Tailwind `compile` function
and configured CSS source. Deliver its CSS and JSON manifest together. Runtime
code uses `createTailwindRuntime(ui, profile, manifest)` to restore the backend
without importing Tailwind or generating CSS. The build validates every collected declaration
and declared theme, compiles complete candidates (including lazy sheets), and checks
that each utility writes exactly its promised property and value.

The built adapter preserves local states, media/container queries and boolean
conditions using precompiled helper gates and fixed utility parameters. It consumes
the shared ordered field plan, so class-attribute order cannot change a winner.
Cross-part facts use the mounted host registry. Runtime token/theme values use
explicit parameter serializers; rendering never compiles or injects CSS. A finite
class list cannot in general represent arbitrary dynamic values or overlapping
browser predicates with Toned's ordering; fixed, precompiled parameter utilities
cover those cases. A strict `classesOnly: true` profile accepts finite runtime
choices and rejects parameter channels and browser-conditional fields that need
one. Unprovable CSS expression equivalence is rejected rather than inferred from
utility names: `gap-3` on a rem scale is not established to mean twelve pixels.
See [the backend contract](backends/README.md) for capabilities and validation.
An unbuilt profile is a low-level mapping/formatting helper. Pure renderers and
mounted hosts reject it until `buildTailwind`/`createTailwindRuntime` binds its
validated asset; supplying an unrelated CSS manifest cannot bypass this gate.

`ui.style(declaration)` is a pure immutable declaration helper. `ui.t(...)` is the
supported shorthand for lightweight token-to-style resolution and composition:

```ts
const base = ui.t({ padding: 's', $style: { opacity: 0.8 } })
const compact = ui.t(base, { $style: { minHeight: 24 } })
// compact.style and compact.className resolve when read.
```

Later arguments override earlier token values; raw `$style` fields merge across
arguments. The legacy `style` spelling and composed `t` results remain
accepted. `t()` normalizes its inputs immediately and snapshots raw style fields;
mutating a caller style object later does not change a retained result. Invalid
metadata (such as a conditional `$kind` or conflicting kind aliases) throws
when `t()` is called, including during module initialization. Direct `exec` still
observes its input values on each call. Getters read the installed configuration's current tokens, platform and
class mode. They call no hooks, create no subscriptions and do not read a React
provider: merely retaining a bag does not update a mounted host when tokens change.
Web CSS-variable values can follow CSS theme changes; native literal values must
be resolved again and applied when the theme changes. Use `useStyles` or
`createElements` for mounted lifecycle ownership, states and related parts.

No global installation is needed for explicit resolution. The existing
`ui.exec({ tokens, platform: 'native', useClassName: false }, declaration)` accepts
per-call tokens for a single declaration. For sheet defaults, variants, host facts,
manifest validation and alternative backends, use the pure renderer above with
`ui.stylesheet({ Root: declaration })`. These paths do not consult the installed
configuration; avoid changing global configuration for each server request.

## Typed web grid

```ts
import { defineGrid, dp, fr } from '@toned/core'
const message = defineGrid('message', {
  columns: [dp(48), fr(1)],
  areas: [
    ['avatar', 'title'],
    ['.', 'body'],
  ],
})
const sheet = ui.stylesheet({
  Root: { '@platform web': { $grid: message } },
  Avatar: { '@platform web': { $area: message.area('avatar') } },
  Title: { '@platform web': { $area: message.area('title') } },
  Body: { '@platform web': { $area: message.area('body') } },
})
```

Areas infer their names, exclude `.`, retain definition identity, and compile to
local CSS area names. Numeric placements remain available as area metadata. Construction checks rectangular regions, track counts,
and finite lengths. Hosts validate direct layout parentage and isolate repeated
grid instances. Multiple occupants intentionally overlap in source order. Grid
is enabled on web; native use throws a capability error. A web-scoped grid can
have an ordinary shared/native fallback. Native grid is unavailable: a host can
assign named areas, but not grid's intrinsic track sizing, span resolution,
baseline alignment and layout integration. No measured JavaScript grid solver is
installed; native grid requires a real integrated layout engine that passes host
conformance.

Create complete responsive plans with `message.variant(...)`:

```ts
const compact = message.variant({
  columns: [fr(1)],
  areas: [['avatar'], ['title'], ['body']],
})
const responsive = ui.stylesheet({
  Root: {
    '@platform web': {
      $grid: compact,
      [ui.q.media(dp(600))]: { $grid: message },
    },
  },
  Avatar: { '@platform web': { $area: message.area('avatar') } },
  Title: { '@platform web': { $area: message.area('title') } },
  Body: { '@platform web': { $area: message.area('body') } },
})
```

The alternative matrix must contain exactly the original named areas; missing
or invented names fail both typing and runtime validation. Tracks and area
positions may change, including through container queries or component variants.
Area references from either plan work throughout the same family. Generated CSS
moves the existing children before hydration, so resize needs no JavaScript
measurement, host write, React render, or reparenting. Repeated grids independently
follow their own container. Every plan emits its complete geometry: omitted rows
use `auto`, and an omitted gap resets to `0`. A spacing token declared after
`$grid` can override that plan's gap through ordinary declaration order.

Each part needs an unconditional `$grid`/`$area` registration. Conditional geometry
must belong to that same family: a query cannot introduce a different ownership
boundary. Declare one base plan and vary it with `.variant(...)`; for visibility,
keep its areas and apply conditional `display`. This keeps ownership validation
stable even when the browser alone evaluates a condition. It deliberately rejects
a condition-only grid registration instead of silently skipping host checks.

## Source map

- `system/`: definitions, normalization, predicate lowering, namespaces.
- `stylesheet/matcher/`: bitsets, ordered rules, selector and predicate compilation.
- `stylesheet/StyleSheet.ts`: immutable plan construction and mounted controllers.
- `stylesheet/applyStyles.ts`: ownership-aware host patching and stale-field reset.
- `backends/`, `server/`, `build/`: output, pure resolution and build delivery.
- `grid/`: geometry compilation and host identity checks.
- `scorecard/`: the measured gates behind toned's quality numbers (below).

Tests cover bit boundaries, reference evaluation, zero/conditional properties,
selector types, suspended React work, ref cleanup, theme updates and owned native
patches. A fixture is not certification of a React Native/Fabric device integration.

## Scorecard

`bun scorecard/scorecard.ts` (in this package) runs four gates that need no
agent and prints a markdown table, then JSON; `--json` prints only the JSON
`{ library, version, metrics, details }`, whose metric names are stable.

- **Mistake corpus** (`scorecard/corpus/cases/`, one file per mistake): the
  stage each mistake is caught at (compile, lint, build, runtime or silent)
  and whether the report names the fix, computed with the same `tsc`, one
  oxlint run of `@toned/eslint-plugin`'s recommended rules over the case
  files, and the runtime. A case whose mistake only a lint rule sees records
  `baseline: { stage: 'lint', … }`; lint ranks after compile because it only
  runs where an application enables it.
  A case's own `build` step (building a named output, say) counts as build.
- **Intent table** ([`INTENTS.md`](scorecard/intents/INTENTS.md)): each intent,
  its canonical spelling and every alias in use; spellings per intent.
- **Build purity**: which outputs change when a fixture sheet is added,
  edited or deleted.
- **Target conformance**: each feature on the web, native, inline and PDF
  renderers: works, rejected at runtime, or a type error. A second matrix
  writes each feature for a system that declares only that target
  (`targets: [t]`), where a feature the target cannot render should be a type
  error (`conformance.declared.*`).

Each gate's test fails only when a number gets worse than its recorded
baseline. When one improves, update the baseline beside the case.

## Variant defaults and alpha

The fully checked factory takes defaults without widening axis values:
`.variants(($: Variants<Mods>) => ({ … }), { defaults: { size: 'm' } })`. Defaulted axes are
optional at consumption; explicit `undefined` selects the default. Other axes
stay required. Defaults survive derived sheets and override layers and resolve
identically through the pure renderer and mounted hooks.

Use `alpha('primary', 0.2)` for a token declaring `alphaChannel`. It retains the
base name in its type, validates a finite fraction in the inclusive `[0, 1]`
range, and lowers to the existing slash representation. The `'primary/20'`
spelling remains compatible. Zero multiplies the source alpha by zero; one
preserves it, including already translucent literals. Named values on tokens
without an alpha channel do not accept the helper's result.

`definePalette` requires complete per-theme maps or an explicit `fallbackTheme`.
The fallback must name a declared theme and supply every otherwise missing value.
The default theme selects the initial CSS scope; it is not an implicit fallback.
Invalid coverage fails at declaration, and palette snapshots are immutable.

### Logical relationships and web selectors

`q.part('Root').has('Item', 'checked', { scope: 'descendant' })` is a semantic
condition key accepted directly in declaration objects and boolean query composition. The default scope
is `descendant`; `child` means the immediate **registered part** parent, not every
intermediate host wrapper. Each mounted controller family owns its part graph.
Targets in another stylesheet instance never contribute facts. Web ancestry uses
registered DOM ancestry; portals without an ancestor in that graph do not match.
Native integrations explicitly supply topology and semantic state capabilities.

Mounts, unmounts, moves and state transitions update the graph and matching facts
without a styling render. Web observers are shared per document and released when
the final subscriber leaves. Native relations require `parentOf` and
`subscribeTopology`; semantic states beyond hover, active and focus additionally
require `readState`. Unsupported host capabilities throw named errors.

Use `$webRules: webRules({ '&::before': { content: '"*"' } })` inside an explicit
`'@platform web'` block for CSS selectors or pseudo-elements. Styles use checked
CSS property types. Each entry has one `&`-anchored selector; comma lists and
at-rules are rejected as selector keys. Exact DOM child syntax such as
`& > input:checked` and arbitrary `:has()` expressions belong here, distinct from
the portable registered-part relationship. The generated CSS belongs to the
normal build artifact, and native resolution never interprets it as native style.

`webRules` is a CSS extension, not portable condition algebra. Put state and
descendant selectors inside its `&`-anchored rules: a portable condition around
a `$webRules` block is diagnosed. Use registered-part relations for semantics that
must hold on every platform. Native, inline, PDF and Tailwind profiles reject
CSS extensions.

For browser-only media semantics, including rem breakpoints and reduced-motion
preferences, pass explicit media groups. These do not change the fixed-pixel
contract of portable conditions:

```ts
webRules(
  {},
  {
    media: {
      '(min-width: 64rem)': webRules({ '&': { display: 'flex' } }),
      '(prefers-reduced-motion: reduce)': webRules({
        '&': { animation: 'none' },
      }),
    },
  },
)
```

Groups retain declaration order and the owning selector/scope. They are immutable,
participate in the extension's content identity, and must be inventoried before
rendering. Selector-only extension identities remain unchanged. Media query
support belongs to the browser; the builder rejects empty queries, block delimiters
and comments. This is a CSS-only extension, unavailable to document/native backends.
For exported inferred sheets, `import type { WEB_RULES } from '@toned/core'`
lets TypeScript name the opaque brand during declaration emit.

## Deriving a sheet with `extend`

`sheet.extend(rules, variants?)` is the one way to derive a stylesheet. It
returns a new immutable sheet without React, provider context or token reads,
and keeps the sheet's part kinds, axes and defaults. Its rules sit in a layer
above the sheet's variants, so what the extension says wins even where a
variant of the original matches. `rules` is an object or a callback over the
sheet's query builder. The optional second argument adds variant rules over
the axes the sheet already has, and those win over everything.

```ts
const compact = button.extend({ Root: { padding: null } }, ($) => ({
  [$.size('s')]: { Root: { padding: 4 } },
}))
const artifact = buildStyles(ui, { sheets: [button, compact] })
const web = createWebRenderer(ui, { manifest: artifact.manifest })
const props = web.resolve(compact, { variants: { size: 's' } })
```

Collect derived sheets before building when they introduce conditions or other
CSS structure. Pure/native renderers resolve these layers directly; React hooks
and element families consume the derived sheet, and React's `StyleOverrides`
takes the same derived sheet. `null` removes an inherited leaf at that exact
path before matching; it does not erase a separate variant declaration.
`extend` restyles the parts a sheet has: naming a part it lacks is a type error
and a runtime error, and a part's `$kind` cannot change.

### Theme schemas in token authoring

Bind a theme schema once with `defineTokenFor<Theme>()`; finite values and dynamic
channels retain their ordinary inference. Resolver callbacks can only read fields
in that schema. A descriptor system checks every declared theme against the
combined requirements of its typed tokens, including tokens from several libraries.

```ts
type Theme = { colors: { primary: string }; spacing: number }
const token = defineTokenFor<Theme>()
const gap = token({
  values: [0, 1, 2],
  dynamic: 'number',
  resolve: (value, theme) => ({ gap: value * theme.spacing }),
})
const ui = defineSystem({
  id: 'typed-theme',
  tokens: { gap },
  themes: { daylight: { colors: { primary: '#246' }, spacing: 4 } },
})
```

On the web the build delivers declared themes. A resolver's `theme.field` becomes
`var(--<system id>-field)` in the generated class, and `buildStyles` (and the Vite
plugin) writes the values: the first declared theme on `:root`, and every theme
under `[data-theme='<name>']`, so a subtree can select any theme by attribute.
Switching is CSS only: changing the attribute rerenders nothing, and classes and
inline styles stay as they were.

```ts
const artifact = buildStyles(ui, { sheets }) // themes included
buildStyles(ui, { sheets, themes: { default: 'night' } }) // another default
buildStyles(ui, { sheets, themes: false }) // deliver them yourself
```

A class sets each side of a box separately, so a field read by a four-sided
property (`borderWidth`, `padding`, `margin`, `inset`) must hold a single value;
the build refuses a value such as `3px 0 0 0` there. Use one field per side.

Only top-level string and number fields are written. A nested group, such as
`colors` above, cannot be read through one CSS variable; give those values to a
renderer as explicit `tokens`. `generateThemes(system, options)` from
`@toned/core/build` returns the same CSS on its own.

This is static schema checking, not validation of untrusted JSON. Applications
validate external theme data before passing it to a renderer. Existing untyped
`defineToken` remains compatible; adopting the typed factory is incremental.

Fixed query thresholds can also be colocated at the use site:

```ts
import { defineSystem, defineToken, dp } from '@toned/core'

const layout = defineSystem({
  id: 'local-queries',
  tokens: {
    opacity: defineToken({
      values: [0.8, 1],
      resolve: (value) => ({ opacity: value }),
    }),
  },
  conditions: { containers: { card: {} } },
})
layout.stylesheet((q) => ({
  Root: {
    [q.media(dp(600))]: { opacity: 0.8 },
    [q.container('card', dp(300))]: { opacity: 1 },
  },
}))
```

The container name must be declared in the system; its threshold may be local.
These keys retain exact literal types (`@>=600px`, `@card/>=300px`) and compose
with `q.all`, `q.any`, and `q.not`. Mix variants into these expressions through
checked selectors such as `$.size('s')`; unchecked raw `'[size=s]'` operands are
rejected by the query helper types. Both host evaluators and generated query
preludes use the same fixed pixel number. Percentage, font-relative, and
custom-property thresholds are rejected. Include sheets containing these
queries in the normal build inventory, including lazy or overridden sheets.
Typed-theme systems also check renderer construction and per-resolution
`tokens` against their declared schema.

Build validation rejects named conditions that collide with another condition's
generated toggle identity, including a named container step such as `gte300px`
beside a local `dp(300)` query. Rename that step instead of publishing ambiguous
CSS. Fixed viewport toggles use a separate namespace from named breakpoints.

`defineTokenFor` defaults to `PortableTokenStyle` for resolver output. Both field
names and values are checked, including extra keys beside valid fields. Structured
lengths belong to dimensional fields, structured colors to color fields, and
`themeRef<Theme>()` retains the referenced value type. An opacity cannot receive
`dp(1)` or a reference to a string-valued theme entry.

Platform-specific resolvers state their output contract explicitly:

```ts
const webToken = defineTokenFor<Theme, WebInlineStyle>()
const sticky = webToken({
  values: ['top'],
  resolve: () => ({ position: 'sticky', top: 0 }),
})
```

`NativeInlineStyle<'view'>` is another valid explicit contract and retains kind
restrictions. An explicit output type describes the selected host vocabulary;
backend capability validation still applies. Legacy `defineToken` retains its
broad output contract for incremental migration.

### Portable motion

`@toned/core/motion` adds timing and spring transitions to committed Toned host
outputs, sharing the existing differential writer and ownership rules. It supports
numeric native targets, computed pixel/numeric web targets, interruption, reduced
motion, entry and retained-host exit. See the [motion contract](motion/README.md)
for the finite property vocabulary, lifecycle rules and native JS-thread boundary.
React's committed ref adapter is `useMotion` from `@toned/react/motion`.
