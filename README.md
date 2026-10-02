<p align="center">
  <a href="https://toned.style"><img src="examples/docs/public/brand/toned-logo.svg" width="260" alt="Toned" /></a>
</p>

<h1 align="center">Typed styling for design systems</h1>

<p align="center">
  Define tokens once.
  <br />
  Toned builds them into type-safe styles for the web, React Native, email, PDF, and other targets.
  <br />
  Platform-agnostic and framework-agnostic.
</p>

<p align="center">
  <a href="https://toned.style/getting-started">Get started</a> ·
  <a href="https://toned.style/playground">Playground</a> ·
  <a href="https://toned.style/ui">Components</a> ·
  <a href="https://toned.style/explore">Reference</a> ·
  <a href="https://toned.style/examples">Examples</a>
</p>

---

Toned is a styling system for design systems. You define the values your product
uses as typed tokens, name the parts of a component, and describe how they
change together with variants and conditions. TypeScript checks every
declaration.

Toned is **platform-agnostic**: the same stylesheet resolves to class names
backed by CSS generated at build time, to React Native styles, to inline styles
for HTML email, or to a PDF style profile. It is **framework-agnostic**: the core
(`@toned/core`) has no framework dependency, and its renderers turn a stylesheet
into plain props. `@toned/react` is the binding for React on the web, React
Native and Server Components.

## Why Toned

- **Design system first.** You define the system; components can only use what
  it defines.
- **Token first.** Every value is a named token, from colour and type to layout.
- **Type safe.** Tokens, parts, variants and conditions are typed. A wrong value
  does not compile.
- **Build time.** CSS is generated when you build. Nothing is injected at render.
- **SSR and Server Components.** Server-rendered and static pages need no style
  runtime, and Server Components resolve styles without hooks.
- **Cross-platform.** One stylesheet resolves for the web, React Native, email
  and PDF, with explicit platform blocks where a platform needs its own styles.

## Install

```sh
npm install @toned/core @toned/react
# or: pnpm add, yarn add, bun add
```

`@toned/core` holds the system, stylesheets, renderers and the CSS build.
`@toned/react` binds them to React 18 or 19. Toned's types support
TypeScript 5.9 and later, including TypeScript 7.

## A component, from tokens to output

**1. Define your tokens.** A token is one design decision: its name, the values
it allows, and what each value means. A stylesheet can use these values and
nothing else.

```ts
// system.ts
import { defineSystem, defineToken } from '@toned/core'

const colours = {
  info: { soft: '#eef2ff', line: '#bac8ff', solid: '#284bdd' },
  danger: { soft: '#fdecea', line: '#f3c9c4', solid: '#b3261e' },
} as const

type Tone = keyof typeof colours

export const ui = defineSystem({
  id: 'notice',
  tokens: {
    tint: defineToken({
      values: ['info', 'danger'],
      resolve: (tone: Tone) => ({
        backgroundColor: colours[tone].soft,
        borderColor: colours[tone].line,
        borderWidth: 1,
        borderStyle: 'solid',
      }),
    }),
    fill: defineToken({
      values: ['info', 'danger'],
      resolve: (tone: Tone) => ({ backgroundColor: colours[tone].solid }),
    }),
    space: defineToken({
      values: [12, 20] as const,
      resolve: (padding) => ({ padding, borderRadius: 12 }),
    }),
    text: defineToken({
      values: ['title', 'label'],
      resolve: (style) =>
        style === 'title'
          ? { fontSize: 18, fontWeight: 600 }
          : { fontSize: 12, fontWeight: 600, color: '#ffffff' },
    }),
  },
})

export const { stylesheet } = ui
```

**2. Style the parts.** A stylesheet names a component's parts, gives each part
token values, and describes how they change per variant.

```ts
// styles.ts
import type { Variants } from '@toned/core'

import { stylesheet } from './system.ts'

type NoticeVariants = {
  tone: 'info' | 'danger'
  size: 'regular' | 'compact'
}

export const noticeStyles = stylesheet({
  Root: { tint: 'info', space: 20 },
  Badge: { $kind: 'text', fill: 'info', text: 'label' },
  Title: { $kind: 'text', text: 'title' },
}).variants(($: Variants<NoticeVariants>) => ({
  [$.tone('danger')]: {
    Root: { tint: 'danger' },
    Badge: { fill: 'danger' },
  },
  [$.size('compact')]: {
    Root: { space: 12 },
  },
}))
```

**3. Use it in a component.** `createElements` binds the parts once, at module
scope. The family provider takes the variants and adds no wrapper element.

```tsx
// Notice.tsx
import { createElements } from '@toned/react'
import type { ReactNode } from 'react'

import { noticeStyles } from './styles.ts'

const Parts = createElements(noticeStyles)

export function Notice(props: {
  tone: 'info' | 'danger'
  size: 'regular' | 'compact'
  label: string
  children: ReactNode
}) {
  return (
    <Parts tone={props.tone} size={props.size}>
      <Parts.Root>
        <Parts.Badge as="span">{props.label}</Parts.Badge>
        <Parts.Title as="strong">{props.children}</Parts.Title>
      </Parts.Root>
    </Parts>
  )
}
```

**4. Build the CSS and render.** The Vite plugin generates static CSS and a
matching manifest from every sheet you list. The application creates one
renderer from them and provides it to the tree.

```ts
// vite.config.ts
import toned from '@toned/core/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { noticeStyles } from './styles.ts'
import { ui } from './system.ts'

export default defineConfig({
  plugins: [
    toned({
      system: ui,
      sheets: [noticeStyles],
      inputs: ['system.ts', 'styles.ts'],
    }),
    react(),
  ],
})
```

```tsx
// App.tsx
import 'virtual:toned.css'
import { createWebRenderer } from '@toned/core/server'
import { TonedProvider } from '@toned/react'
import { webHost } from '@toned/react/hosts/web'
import manifest from 'virtual:toned.manifest'

import { Notice } from './Notice.tsx'
import { ui } from './system.ts'

const renderer = createWebRenderer(ui, { manifest, tokens: {} })

export function App() {
  return (
    <TonedProvider renderer={renderer} host={webHost}>
      <Notice tone="danger" size="compact" label="Failed">
        Release 4.12 failed
      </Notice>
    </TonedProvider>
  )
}
```

Without Vite, `buildStyles(ui, { sheets })` from `@toned/core/build` returns the
same CSS and manifest for any build script. The
[getting-started guide](https://toned.style/getting-started) walks through the
complete setup.

**The same sheet, other targets.** Renderers need no React. For HTML email, the
inline renderer resolves the sheet and variants to plain style props:

```ts
import { createInlineRenderer } from '@toned/core/server'

import { noticeStyles } from './styles.ts'
import { ui } from './system.ts'

const email = createInlineRenderer(ui, { tokens: {} })
const { Root, Badge, Title } = email.resolve(noticeStyles, {
  variants: { tone: 'danger', size: 'compact' },
})
```

`createNativeRenderer` does the same for React Native and `createPdfRenderer`
for PDF documents. See the [renderer guide](https://toned.style/learn/renderers).

## Learn more

| Topic                                             | Reference                                                                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A reusable design vocabulary                      | [Systems and tokens](packages/toned-core/README.md#declare-a-system)                                                                                                                 |
| Components with multiple parts and variants       | [React element families](packages/toned-react/README.md#element-families)                                                                                                            |
| Responsive and state-aware styles                 | [Conditions and precedence](packages/toned-core/README.md#conditions-and-precedence)                                                                                                 |
| Server-rendered applications                      | [SSR guide](https://toned.style/guides/ssr)                                                                                                                                          |
| Native host integrations                          | [Native support and acceptance scope](packages/toned-react/NATIVE-HOSTS.md)                                                                                                          |
| Layouts that adapt to content                     | [Adaptive layout](packages/toned-core/adaptive/README.md)                                                                                                                            |
| Timing, springs, interruption, and reduced motion | [Portable motion](packages/toned-core/motion/README.md)                                                                                                                              |
| Email and PDF output                              | [Renderer guide](examples/docs/src/content/renderers.md) · [live output](https://toned.style/examples#renderers)                                                                     |
| Typed grid and named areas                        | [Grid reference](packages/toned-core/README.md#typed-web-grid) · [grid demo](https://toned.style/examples#grid)                                                                      |
| Typed themes, palettes and named fragments        | [Core authoring reference](packages/toned-core/README.md)                                                                                                                            |
| Scoped overrides and multiple systems             | [React reference](packages/toned-react/README.md)                                                                                                                                    |
| Source navigation, completions and rename         | [Compiler and language server](packages/toned-compiler/README.md) · [VS Code](editors/vscode/README.md)                                                                              |
| Source inspection and checked edits               | [Inspector](packages/toned-compiler/inspector/README.md) · [development bridge](packages/toned-compiler/bridge/README.md) · [live inspector](https://toned.style/examples#inspector) |
| Portable design-token interchange                 | [DTCG subset and mapping](packages/toned-compiler/tokens/README.md) · [live exchange](https://toned.style/examples#tokens)                                                           |
| Measured design policies                          | [Contracts and scenario coverage](packages/toned-compiler/contracts/README.md) · [measure a target](https://toned.style/examples#contracts)                                          |
| Safer authoring in CI                             | [ESLint and Oxlint rules](packages/toned-eslint-plugin/README.md)                                                                                                                    |
| Custom hosts and backends                         | [Host adapters](packages/toned-core/hosts/README.md) · [backend boundaries](packages/toned-core/backends/README.md)                                                                  |

Adaptive layout, motion and compiler tooling are opt-in. Native capabilities are
verified per concrete host profile, and **native grid is not supported**; the
[native hosts guide](packages/toned-react/NATIVE-HOSTS.md) lists the exact
boundaries. [Benchmarks](benchmarks/README.md) records measured performance.

## Packages

| Package                                                          | Purpose                                                                             |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`@toned/core`](packages/toned-core/README.md)                   | Typed authoring, matching, pure renderers, backends, and deterministic CSS builds.  |
| [`@toned/react`](packages/toned-react/README.md)                 | React 18/19 element families, prop bags, providers, and web/native host bindings.   |
| [`@toned/systems`](packages/toned-systems/README.md)             | Optional starting vocabularies, including the base system.                          |
| [`@toned/themes`](packages/toned-themes/README.md)               | Optional CSS theme values.                                                          |
| [`@toned/eslint-plugin`](packages/toned-eslint-plugin/README.md) | Optional syntax-aware ESLint and Oxlint rules.                                      |
| [`@toned/compiler`](packages/toned-compiler/README.md)           | Source graph, language server, inspector, measured contracts, and DTCG interchange. |

Import the scoped packages; `toned` itself is a private workspace placeholder,
not an umbrella API.

## Editor mode

Part of Toned's typing exists only for editor completions: the vocabulary that
contextually types a `.variants()` callback, `overrideStyles` / `overrideSheet`
rules and the blocks nested inside them. Diagnostics never depend on it, so a
batch check skips it. The switch is automatic and needs no setup:

- **Editors: on.** A language server loads a referenced project's _source_
  rather than its declarations. That holds for TypeScript 7's native server
  (`tsc --lsp --stdio`) and for the JavaScript `tsserver`.
- **`tsc` / `tsc -b` and CI: off.** A consumer compiles against the emitted
  `.d.ts`, where `EditorModeProbe`'s private member has no type (see
  [`editor-mode.ts`](packages/toned-core/types/editor-mode.ts)). A published
  package is consumed through its declarations too.

Hover `import('@toned/core').EditorMode` to see which mode a program is in. A
program that compiles Toned's sources directly, such as Toned's own packages or
a project that maps `@toned/core` to source without a project reference, runs in
editor mode. Language-service plugins are not used: TypeScript 7's native server
does not load them.

## Development

The repository is a pnpm workspace. [mise](https://mise.jdx.dev) pins pnpm
(`mise install`); package builds and some examples also use [Bun](https://bun.sh).

```sh
pnpm install
pnpm test                  # Vitest
pnpm run ci:typecheck      # project references, then tsc -b
pnpm run lint              # oxlint
pnpm run format            # oxfmt
```

[Examples](examples/README.md) describes the runnable integrations, including
the documentation site. Examples demonstrate usage; they are not a substitute
for the package tests.

## License

MIT; see [LICENSE](LICENSE).
