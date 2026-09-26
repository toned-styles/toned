# Toned lint rules

Optional, syntax-aware rules for ESLint and Oxlint. The package is independent of
Toned runtime, TypeScript, React, and HQ. `react-toned` is the namespace for
React-specific rules; Oxlint reserves `react/` for its built-in plugin.
Installation does not enable any rule automatically.

```sh
pnpm add -D @toned/eslint-plugin
```

For ESLint flat config, add these entries alongside your existing TypeScript/JSX
parser configuration:

```js
import toned from '@toned/eslint-plugin'
import react from '@toned/eslint-plugin/react'

export default [toned.configs.recommended, react.configs.recommended]
```

For Oxlint 1.69 or newer, configure the JavaScript plugins explicitly:

```json
{
  "jsPlugins": ["@toned/eslint-plugin", "@toned/eslint-plugin/react"],
  "rules": {
    "react-toned/no-create-elements-in-render": "error",
    "react-toned/no-partial-host-bag": "error",
    "toned/prefer-canonical-declarations": "warn"
  }
}
```

| Rule | Checks | Automatic fix |
| --- | --- | --- |
| `react-toned/no-create-elements-in-render` | Proven `createElements` calls inside named components, hooks, React `memo`/`forwardRef` callbacks, and render-time `useMemo`/`useState` callbacks | No: hoisting captured values needs a design decision |
| `react-toned/no-partial-host-bag` | A proven `useStyles` part's `style`, `className`, or `ref` passed alone to an intrinsic or known native host | No: merge caller props with `withProps` deliberately |
| `toned/prefer-canonical-declarations` | Declaration `style`/`$$type` aliases and explicitly generic `.variants<Mods>(...)` | Renames ordinary keys only; skips duplicate keys, spreads, computed keys, and shorthand |
| `toned/no-global-config` | Proven process-global `setConfig` calls | No: install an explicit renderer/provider at the application boundary |
| `toned/prefer-semantic-tokens` | Opt-in static raw style properties with configured semantic alternatives | No: lint cannot prove visual equivalence |

Canonical authoring keeps component identities stable and preserves Toned's host
ref and interaction props:

```tsx
import { createElements, useStyles } from '@toned/react'
import type { Variants } from '@toned/core'

const styles = ui.stylesheet({ Root: { $kind: 'view', $style: { opacity: 1 } } })
  .variants(($: Variants<{ size: 's' | 'l' }>) => ({
    [$.size('s')]: { Root: { padding: 2 } },
  }))
const S = createElements(styles)

function Button({ size }) {
  return <S size={size}><S.Root as="button" /></S>
}
function RawButton() {
  const s = useStyles(styles)
  return <button {...s.Root.withProps({ onClick: handleClick })} />
}
```

A standalone `<S.Root />` intentionally uses the family's defaults. `t()`,
`useStyles(styles, variants)`, dynamic/native style expressions, and extracting
`.style` for a non-host integration such as a date picker's `styles` API remain
supported. Unknown custom components are not assumed to be hosts. These rules do
not duplicate stylesheet type errors or compiler semantic diagnostics.

The two policy rules are not part of the recommended configs. An application can
opt in while a compatibility library continues to support the global API:

```json
{
  "toned/no-global-config": "error",
  "toned/prefer-semantic-tokens": ["warn", {
    "properties": { "color": "textColor", "fontSize": "typography" }
  }]
}
```

Semantic alternatives are hints supplied by the application, not a universal
Toned token vocabulary. Raw values with no equivalent token stay valid; zero,
inherited/current/transparent paint, CSS variables, expressions, and native
transform objects are excluded. Keep the rule scoped to governed components, or
suppress a specific diagnostic with a reason when the raw value is intentional.

## Provenance and bounded analysis

Imports from public Toned entries, namespace imports, immutable local aliases,
and destructuring are resolved through ESLint's lexical scope graph. Shadowed
bindings and unrelated APIs with the same spelling are ignored. Relative
reexports are not loaded or guessed. Supply explicit contracts per rule:

```json
{
  "toned/prefer-canonical-declarations": ["warn", {
    "modules": { "./design-system": { "stylesheet": "stylesheet" } }
  }]
}
```

`createTonedPlugin(options)` and `createReactPlugin(options)` also accept a
configuration object or `(context) => options` for a host-specific wrapper.
Such a wrapper can map known files lexically without evaluating their modules.
Only configure exports whose provenance the application owns.

Alias and declaration traversal stop at 32 levels; declaration walks inspect at
most 4096 objects per call. Caches are per rule/file and weakly keyed by lexical
bindings. No TypeScript program, cross-file cache, filesystem read, or application
execution occurs during lint. Dynamic factories, object mutation, nonliteral
rule fragments, and unconfigured reexports are intentionally outside this syntax
analysis; the compiler and runtime remain responsible for those cases.

`oxlint --format=json` emits stable rule IDs and source locations for agents.
These diagnostics should guide targeted changes, not blind mass replacements.
Tests invoke the real pinned Oxlint CLI with isolated source/config files. Run
`pnpm test` in this package after installing the workspace development dependencies.
