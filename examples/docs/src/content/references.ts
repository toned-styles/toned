/** The branch that source links point at. */
export const sourceRef = 'main'
export const sourceBase = `https://github.com/toned-styles/toned/blob/${sourceRef}/`

export const references = [
  {
    slug: 'core',
    title: 'Systems, tokens & queries',
    group: 'Authoring',
    summary:
      'The complete public vocabulary: typed themes, palettes, units, conditions, fragments and grid.',
    path: 'packages/toned-core/README.md',
    load: () =>
      import('../../../../packages/toned-core/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'react',
    title: 'React & scoped overrides',
    group: 'Authoring',
    summary:
      'Element families, multiple systems, complete host props and scoped customization.',
    path: 'packages/toned-react/README.md',
    load: () =>
      import('../../../../packages/toned-react/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'stylesheets',
    title: 'Stylesheet composition',
    group: 'Authoring',
    summary: 'Parts, variants, extension, slicing and exact-path removals.',
    path: 'packages/toned-core/stylesheet/README.md',
    load: () =>
      import('../../../../packages/toned-core/stylesheet/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'systems',
    title: 'Ready-made systems',
    group: 'Authoring',
    summary: 'Use the base vocabulary or build an owned design system.',
    path: 'packages/toned-systems/README.md',
    load: () =>
      import('../../../../packages/toned-systems/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'themes',
    title: 'Themes & palettes',
    group: 'Authoring',
    summary:
      'Theme files, semantic roles, appearance and system configuration.',
    path: 'packages/toned-themes/README.md',
    load: () =>
      import('../../../../packages/toned-themes/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'adaptive',
    title: 'Adaptive layouts',
    group: 'Interaction',
    summary:
      'Choose a portable layout from available space, text scale and explicit measurements.',
    path: 'packages/toned-core/adaptive/README.md',
    load: () =>
      import('../../../../packages/toned-core/adaptive/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'motion',
    title: 'Motion & presence',
    group: 'Interaction',
    summary:
      'Interruptible springs, committed host transitions, retained exits and reduced motion.',
    path: 'packages/toned-core/motion/README.md',
    load: () =>
      import('../../../../packages/toned-core/motion/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'renderers',
    title: 'Web, email & PDF',
    group: 'Platforms',
    summary:
      'Select a renderer for browser CSS, concrete email styles or a finite document profile.',
    path: 'examples/docs/src/content/renderers.md',
    load: () => import('./renderers.md?raw').then((m) => m.default),
  },
  {
    slug: 'native',
    title: 'React Native hosts',
    group: 'Platforms',
    summary:
      'Host registration, Fabric evidence, text boundaries and platform limitations.',
    path: 'packages/toned-react/NATIVE-HOSTS.md',
    load: () =>
      import('../../../../packages/toned-react/NATIVE-HOSTS.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'hosts',
    title: 'Host adapters',
    group: 'Platforms',
    summary: 'Differential patches, attachment ownership and custom hosts.',
    path: 'packages/toned-core/hosts/README.md',
    load: () =>
      import('../../../../packages/toned-core/hosts/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'backends',
    title: 'Backend integrations',
    group: 'Platforms',
    summary:
      'CSS, native, inline, PDF and optional Tailwind integration boundaries.',
    path: 'packages/toned-core/backends/README.md',
    load: () =>
      import('../../../../packages/toned-core/backends/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'compiler',
    title: 'Compiler & language server',
    group: 'Tooling',
    summary:
      'Diagnostics, completions, definitions, references and rename over indexed source.',
    path: 'packages/toned-compiler/README.md',
    load: () =>
      import('../../../../packages/toned-compiler/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'source',
    title: 'Source intelligence',
    group: 'Tooling',
    summary:
      'Bounded workspace queries and version-checked source edit proposals.',
    path: 'packages/toned-compiler/SOURCE.md',
    load: () =>
      import('../../../../packages/toned-compiler/SOURCE.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'inspector',
    title: 'Design inspector',
    group: 'Tooling',
    summary:
      'Select a part, inspect declarations and preview a checked source change.',
    path: 'packages/toned-compiler/inspector/README.md',
    load: () =>
      import('../../../../packages/toned-compiler/inspector/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'bridge',
    title: 'Development source bridge',
    group: 'Tooling',
    summary:
      'Wire the inspector to an allowlisted workspace with atomic revision checks.',
    path: 'packages/toned-compiler/bridge/README.md',
    load: () =>
      import('../../../../packages/toned-compiler/bridge/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'vscode',
    title: 'VS Code extension',
    group: 'Tooling',
    summary:
      'Run the owned language server and inspect design declarations in the editor.',
    path: 'editors/vscode/README.md',
    load: () =>
      import('../../../../editors/vscode/README.md?raw').then((m) => m.default),
  },
  {
    slug: 'lint',
    title: 'ESLint & Oxlint',
    group: 'Tooling',
    summary:
      'Detect unstable element families, incomplete host props and legacy declarations.',
    path: 'packages/toned-eslint-plugin/README.md',
    load: () =>
      import('../../../../packages/toned-eslint-plugin/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'tokens',
    title: 'DTCG token exchange',
    group: 'Verification',
    summary:
      'Import, resolve, map and export the supported DTCG subset with diagnostics.',
    path: 'packages/toned-compiler/tokens/README.md',
    load: () =>
      import('../../../../packages/toned-compiler/tokens/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'contracts',
    title: 'Design contracts',
    group: 'Verification',
    summary:
      'Build bounded scenarios and evaluate real measurements with explicit inconclusive results.',
    path: 'packages/toned-compiler/contracts/README.md',
    load: () =>
      import('../../../../packages/toned-compiler/contracts/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'engine',
    title: 'How resolution works',
    group: 'Verification',
    summary:
      'Understand the shared compiler, cascade and runtime without inventing a second engine.',
    path: 'packages/toned-core/core/README.md',
    load: () =>
      import('../../../../packages/toned-core/core/README.md?raw').then(
        (m) => m.default,
      ),
  },
  {
    slug: 'benchmarks',
    title: 'Benchmarks & limits',
    group: 'Verification',
    summary:
      'What the benchmark runners measure, the latest recorded figures and their limits.',
    path: 'examples/docs/src/content/benchmarks.md',
    load: () => import('./benchmarks.md?raw').then((m) => m.default),
  },
  {
    slug: 'examples',
    title: 'Example applications',
    group: 'Verification',
    summary:
      'Find the maintained docs, component library and renderer integration examples.',
    path: 'examples/README.md',
    load: () => import('../../../README.md?raw').then((m) => m.default),
  },
] as const

/** The published site: links to it in package Markdown stay inside the site. */
const siteOrigin = 'https://toned.style'

export function referenceHref(href: string, from: string): string {
  if (href === siteOrigin) return '/'
  if (href.startsWith(`${siteOrigin}/`)) return href.slice(siteOrigin.length)
  if (/^(?:https?:|mailto:|#|\/)/.test(href)) return href
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return '#'
  const url = new URL(href, `https://source.invalid/${from}`)
  const path = decodeURIComponent(url.pathname.slice(1))
  const page = references.find((item) => item.path === path)
  return page
    ? `/learn/${page.slug}${url.hash}`
    : `${sourceBase}${path}${url.hash}`
}
