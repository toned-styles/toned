# `@toned/systems`

Optional reusable token vocabularies built on `@toned/core`. The package has no
root entry: import the base vocabulary through `@toned/systems/base`.

```ts
import { stylesheet } from '@toned/systems/base'

export const cardStyles = stylesheet({
  Card: { $kind: 'view', bgColor: 'elevated', padding: 3 },
  Title: { $kind: 'text', typography: 'heading-3' },
})
```

The base system retains legacy token names and spacing semantics for existing
applications. Its `typo` values use their historical underscore spelling; newer
semantic typography values use kebab-case. These are distinct declarations, not
a global normalization of token values.

Dimension tokens (`width`, `height`, and their minimum/maximum forms) treat
numbers as base-relative spacing steps and names as `space_<name>` aliases.
CSS lengths, percentages and expressions such as `2.25rem`, `50%` and
`calc(100% - 2rem)` pass through as dimensions. Native rendering accepts its
supported numeric/percentage values and explicitly rejects CSS-only units and
expressions; a web length is never silently converted into a missing alias.

The exported `system` is the raw token dictionary, alongside `stylesheet` and the
compatibility `t` helper. New applications that need their own namespace,
conditions, typed themes or authoritative build manifest should retain the full
object returned by `defineSystem` as shown in the
[core guide](../toned-core/README.md). New UI code should use named stylesheet
parts and explicit React bindings rather than adding ambient `t()` calls.

`@toned/systems/defineCssToken` is a compatibility helper for CSS-oriented token
vocabularies; portable systems should use semantic resolvers and explicit backend
capability checks.
