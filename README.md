<p align="center">
  <a href="https://toned.style"><img src="examples/docs/public/brand/toned-logo.svg" width="260" alt="Toned" /></a>
</p>

<h1 align="center">Typed styling, independent of platform and framework</h1>

<p align="center">A typed vocabulary of design tokens, named component parts and variants, compiled for each target.</p>

<p align="center">
  <a href="https://toned.style/getting-started">Get started</a> ·
  <a href="https://toned.style/playground">Playground</a> ·
  <a href="https://toned.style/ui">Components</a> ·
  <a href="https://toned.style/explore">All capabilities</a> ·
  <a href="https://toned.style/examples">Interactive examples</a>
</p>

---

Toned is a styling system. You define the values your product uses, name the
parts of a component, and describe how they change together.
TypeScript checks the declarations. The core (`@toned/core`) has no framework
dependency: its renderers resolve a stylesheet to plain props for web CSS built
ahead of time, React Native, inline styles for HTML email, or a PDF style
profile. `@toned/react` is the framework binding that exists today, for React on
the web, React Native and Server Components.

## What it provides

- **Typed tokens.** Define semantic tokens for colour, spacing,
  typography, or your own concepts. Invalid token values are type errors.
- **Named parts.** Style a card's root, label, and action together.
  `createElements` binds those parts to React with stable component identities.
- **Composable variants.** Express size, tone, density, and their intersections
  with typed selector chains. Each mounted family owns its selection.
- **Typed conditions.** Combine media queries, containers,
  interaction states, and cross-part relationships with the system's query builder.
- **Build-time CSS.** A deterministic build produces CSS and a matching
  manifest. Rendering never injects a missing stylesheet.
- **SSR and React Server Components.** Server-rendered and static pages need no
  style injection, and a Server Component resolves part props with
  `renderer.resolve(sheet)`: no hooks, context or client JavaScript.
- **Explicit platform boundaries.** Share declarations across web and native
  integrations; use explicit platform blocks for platform-specific behavior.

The [playground](https://toned.style/playground) is an editor: write a
stylesheet and a component, with type checking and completion, and see it render.

The [component gallery](https://toned.style/ui) has 56 components. Each page
shows the component's source and props, and lets you try scoped token overrides.

## Where to start

- **New to Toned:** follow [Getting Started](https://toned.style/getting-started), then try the [playground](https://toned.style/playground).
- **Evaluating it:** read component sources in the [gallery](https://toned.style/ui) and try scoped overrides.
- **Beyond web styling:** the [interactive examples](https://toned.style/examples) run adaptive layout, springs, grid, document renderers, DTCG exchange, measured contracts and the source inspector.
- **An exact API or limitation:** the [reference directory](https://toned.style/explore) renders each package's documentation.
- **What changed:** the [changelog](https://toned.style/changelog) lists each release, per package.

## Install

```sh
npm install @toned/core @toned/react
# or: pnpm add, yarn add, bun add
```

`@toned/core` holds the system, stylesheets and the CSS build; `@toned/react`
binds them to React 18 or 19. `@toned/systems` and `@toned/themes` are an
optional ready-made vocabulary and its theme values. `@toned/eslint-plugin` and
`@toned/compiler` are optional development tools. Import the scoped packages:
`toned` itself is a private workspace placeholder, not an umbrella API.

## Example

A stylesheet names a component's parts, gives each part token values, and
describes how they change per variant.

```ts
// styles.ts
import type { Variants } from '@toned/core'
import { stylesheet } from './system'

export const buttonStyles = stylesheet({
  Root: { $kind: 'pressable', surface: 'accent', padding: 3 },
  Label: { $kind: 'text', text: 'label', ink: 'on-accent' },
}).variants(($: Variants<{ tone: 'accent' | 'quiet' }>) => ({
  [$.tone('quiet')]: {
    Root: { surface: 'quiet' },
    Label: { ink: 'accent' },
  },
}))
```

Bind the parts once, at module scope. The family provider adds no wrapper element.

```tsx
// SaveButton.tsx
import { createElements } from '@toned/react'
import { buttonStyles } from './styles'

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

The tokens come from a system, defined once and shared by every stylesheet.

```ts
// system.ts
import { defineSystem, defineToken } from '@toned/core'

export const ui = defineSystem({
  id: 'my-ui',
  tokens: {
    surface: defineToken({
      values: ['accent', 'quiet'] as const,
      resolve: value => ({
        backgroundColor: value === 'accent' ? '#284bdd' : '#e8edff',
      }),
    }),
    ink: defineToken({
      values: ['on-accent', 'accent'] as const,
      resolve: value => ({ color: value === 'accent' ? '#284bdd' : '#fff' }),
    }),
    padding: defineToken({
      values: [2, 3] as const,
      resolve: step => ({ padding: step * 4 }),
    }),
    text: defineToken({
      values: ['label'] as const,
      resolve: () => ({ fontSize: 14 }),
    }),
  },
})

export const { stylesheet } = ui
```

These are the declarations. To run them, generate the CSS and manifest and
mount the component under `TonedProvider`. The [getting-started guide](https://toned.style/getting-started)
walks through the complete Vite setup; the [React guide](packages/toned-react/README.md)
shows the explicit build and renderer APIs.

Start with your own vocabulary, or add the optional `@toned/systems` and
`@toned/themes` packages.

## Further capabilities

| Topic | Reference |
| --- | --- |
| A reusable design vocabulary | [Systems and tokens](packages/toned-core/README.md#declare-a-system) |
| Components with multiple parts and variants | [React element families](packages/toned-react/README.md#element-families) |
| Responsive and state-aware styles | [Conditions and precedence](packages/toned-core/README.md#conditions-and-precedence) |
| Server-rendered applications | [SSR guide](https://toned.style/guides/ssr) |
| Native host integrations | [Native support and acceptance scope](packages/toned-react/NATIVE-HOSTS.md) |
| Layouts that adapt to content | [Adaptive layout](packages/toned-core/adaptive/README.md) |
| Timing, springs, interruption, and reduced motion | [Portable motion](packages/toned-core/motion/README.md) |
| Email and PDF output | [Renderer guide](examples/docs/src/content/renderers.md) · [live output](https://toned.style/examples#renderers) |
| Typed grid and named areas | [Grid reference](packages/toned-core/README.md#typed-web-grid) · [grid demo](https://toned.style/examples#grid) |
| Typed themes, palettes and named fragments | [Core authoring reference](packages/toned-core/README.md) |
| Scoped overrides and multiple systems | [React reference](packages/toned-react/README.md) |
| Source navigation, completions and rename | [Compiler and language server](packages/toned-compiler/README.md) · [VS Code](editors/vscode/README.md) |
| Source inspection and checked edits | [Inspector](packages/toned-compiler/inspector/README.md) · [development bridge](packages/toned-compiler/bridge/README.md) · [live inspector](https://toned.style/examples#inspector) |
| Portable design-token interchange | [DTCG subset and mapping](packages/toned-compiler/tokens/README.md) · [live exchange](https://toned.style/examples#tokens) |
| Measured design policies | [Contracts and scenario coverage](packages/toned-compiler/contracts/README.md) · [measure a target](https://toned.style/examples#contracts) |
| Safer authoring in CI | [ESLint and Oxlint rules](packages/toned-eslint-plugin/README.md) |
| Custom hosts and backends | [Host adapters](packages/toned-core/hosts/README.md) · [backend boundaries](packages/toned-core/backends/README.md) |

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
| [`@toned/eslint-plugin`](packages/toned-eslint-plugin/README.md) | Optional syntax-aware ESLint and Oxlint rules. |
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
