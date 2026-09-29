<p align="center">
  <a href="https://toned.style"><img src="examples/docs/public/brand/toned-logo.svg" width="260" alt="Toned" /></a>
</p>

<h1 align="center">Make it yours. Keep it together.</h1>

<p align="center">The typed styling library for React and React Native.<br />Your tokens. Expressive variants. Beautifully connected components.</p>

<p align="center">
  <a href="https://toned.style/getting-started">Get started</a> ·
  <a href="https://toned.style/playground">Try the playground</a> ·
  <a href="https://toned.style/ui">Component gallery</a> ·
  <a href="packages/toned-react/README.md">React API</a>
</p>

---

Toned turns a design vocabulary into a component system. Define the values your
product uses, name the parts of a component, and describe how they change together.
TypeScript checks the declarations. Toned builds the web CSS ahead of time and
connects the styles to your mounted components.

## Why Toned?

- **Your design language, typed.** Define semantic tokens for colour, spacing,
  typography, or your own concepts. Invalid token values are type errors.
- **One component, named parts.** Style a card's root, label, and action together.
  `createElements` binds those parts to React with stable component identities.
- **Variants that compose.** Express size, tone, density, and their intersections
  with typed selector chains. Each mounted family owns its selection.
- **Conditions in the same language.** Combine media queries, containers,
  interaction states, and cross-part relationships with the system's query builder.
- **CSS ready before render.** A deterministic build produces CSS and a matching
  manifest. Rendering never injects a missing stylesheet.
- **Platform boundaries you can see.** Share declarations across web and native
  integrations; use explicit platform blocks for platform-specific behavior.

[Play with a real component](https://toned.style/playground): change its tone,
shape, density, and theme, then inspect the stylesheet and tokens behind it.

## A small taste

A token gives a value meaning. A stylesheet gives it a home.

```ts
// button-styles.ts
import { defineSystem, defineToken, type Variants } from '@toned/core'

export const ui = defineSystem({
  id: 'my-ui',
  tokens: {
    surface: defineToken({
      values: ['accent', 'quiet'] as const,
      resolve: value => ({
        backgroundColor: value === 'accent' ? '#284bdd' : '#e8edff',
      }),
    }),
  },
})

export const buttonStyles = ui.stylesheet({
  Root: { $kind: 'pressable', surface: 'accent', $style: { padding: 12 } },
  Label: { $kind: 'text', $style: { color: '#fff', fontSize: 14 } },
}).variants(($: Variants<{ tone: 'accent' | 'quiet' }>) => ({
  [$.tone('quiet')]: {
    Root: { surface: 'quiet' },
    Label: { $style: { color: '#284bdd' } },
  },
}))
```

Bind the parts once, at module scope. The family provider adds no wrapper element.

```tsx
import { createElements } from '@toned/react'
import { buttonStyles } from './button-styles'

const Button = createElements(buttonStyles)

export function SaveButton() {
  return (
    <Button tone="quiet">
      <Button.Root as="button" type="button">
        <Button.Label as="span">Save your idea</Button.Label>
      </Button.Root>
    </Button>
  )
}
```

This is the component declaration. To run it, generate its CSS and manifest and
mount it under `TonedProvider`. The [getting-started guide](https://toned.style/getting-started)
walks through the complete Vite setup; the [React guide](packages/toned-react/README.md)
shows the explicit build and renderer APIs.

```sh
npm install @toned/core @toned/react
```

Start with your own vocabulary, or add the optional `@toned/systems` and
`@toned/themes` packages. Import the scoped packages: `toned` itself is a private
workspace placeholder, not an umbrella API.

## Go beyond the first component

| What you want to build | Where to explore |
| --- | --- |
| A reusable design vocabulary | [Systems and tokens](packages/toned-core/README.md#declare-a-system) |
| Components with multiple parts and variants | [React element families](packages/toned-react/README.md#element-families) |
| Responsive and state-aware styles | [Conditions and precedence](packages/toned-core/README.md#conditions-and-precedence) |
| Server-rendered applications | [SSR guide](https://toned.style/guides/ssr) |
| Native host integrations | [Native support and acceptance scope](packages/toned-react/NATIVE-HOSTS.md) |
| Layouts that adapt to content | [Adaptive layout](packages/toned-core/adaptive/README.md) |
| Timing, springs, interruption, and reduced motion | [Portable motion](packages/toned-core/motion/README.md) |
| Source-aware navigation, inspection, and token interchange | [Design tooling](packages/toned-compiler/README.md) |

Adaptive layout, motion, and compiler tooling are opt-in. Native capabilities are
verified per concrete host profile; **native grid is not supported**. See the
[implementation status](SPEC-COMPLETION.md) for the precise boundaries and the
[benchmarks](benchmarks/README.md) for measured results, including regressions.

## Packages

| Package | Purpose |
| --- | --- |
| [`@toned/core`](packages/toned-core/README.md) | Typed authoring, matching, pure renderers, backends, and deterministic CSS builds. |
| [`@toned/react`](packages/toned-react/README.md) | React 18/19 element families, prop bags, providers, and web/native host bindings. |
| [`@toned/systems`](packages/toned-systems/README.md) | Optional starting vocabularies, including the base system. |
| [`@toned/themes`](packages/toned-themes/README.md) | Optional CSS theme values. |
| [`@toned/compiler`](packages/toned-compiler/README.md) | Source graph, language server, inspector, measured contracts, and DTCG interchange. |

## Editor mode

Part of Toned's typing exists only for editor completions: the vocabulary a
`.variants()` callback, `overrideStyles` / `overrideSheet` rules and the blocks
nested inside them are contextually typed by. Diagnostics never depend on it,
so a batch check skips it. The switch is automatic and needs no setup:

- **Editors: on.** A language server loads a referenced project's _source_
  rather than its declarations. That holds for TypeScript 7's native server
  (`tsc --lsp --stdio`: VS Code's TypeScript Native extension with the
  workspace `typescript.tsdk`, or nvim's `tsgo` / `tsc --lsp` config) and for
  the JS `tsserver` (VS Code's built-in extension, nvim's `ts_ls` / `vtsls`).
- **`tsc` / `tsc -b` and CI: off.** A consumer compiles against the referenced
  project's emitted `.d.ts`, where `EditorModeProbe`'s private member has no
  type (see `packages/toned-core/types/editor-mode.ts`). A published package is
  consumed through its declarations too.

Hover `import('@toned/core').EditorMode` to see which mode a program is in. A
program that compiles Toned's sources directly — Toned's own packages, a
project mapping `@toned/core` to source without a project reference, or a tool
that loads references from source (HQ's `oxlint --type-aware` pass) — runs in
editor mode. Language-service plugins are not used: TypeScript 7's native
server does not load them.

## Contracts and verification

- [Implementation status](SPEC-COMPLETION.md) records supported contracts and
  architectural boundaries. A pinned [Android Fabric profile](packages/toned-react/NATIVE-HOSTS.md)
  has real native acceptance evidence; native grid remains unsupported.
- [Examples](examples/README.md) distinguish runnable integrations from historical
  host sketches; they are not a substitute for package conformance tests.
- [Benchmarks](benchmarks/README.md) report measured improvements and regressions.
- Embedded in HQ, use the root dependency installation and guarded
  `bun scripts/build/test-toned.ts` and `bun scripts/build/test-toned-react-versions.ts`
  runners. `bun scripts/build/test-toned-docs.ts` checks the documentation and
  gallery production build and browser hydration; see the examples guide for
  browser installation. Do not install a second React tree in this submodule.

MIT; see [LICENSE](LICENSE).
