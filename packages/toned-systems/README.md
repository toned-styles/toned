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

The exported `system` is the raw token dictionary, alongside `stylesheet` and the
compatibility `t` helper. New applications that need their own namespace,
conditions, typed themes or authoritative build manifest should retain the full
object returned by `defineSystem` as shown in the
[core guide](../toned-core/README.md). New UI code should use named stylesheet
parts and explicit React bindings rather than adding ambient `t()` calls.

`@toned/systems/defineCssToken` is a compatibility helper for CSS-oriented token
vocabularies; portable systems should use semantic resolvers and explicit backend
capability checks.
