/**
 * The Toned packages the playground can import. They publish TypeScript
 * source, so the type checker reads the same files a real project would.
 * Tests, tooling entry points and native-only modules are left out.
 */
const sources = import.meta.glob<string>(
  [
    '../../../../../../packages/toned-{core,react,systems}/**/*.{ts,tsx}',
    '../../../../../../packages/toned-{core,react,systems}/package.json',
    '!**/node_modules/**',
    '!**/*.test.*',
    '!**/*.test-d.*',
    '!**/toned-core/{vite,testing,compat,motion,adaptive}/**',
  ],
  { query: '?raw', import: 'default', eager: true },
)

/** Virtual path (`/node_modules/@toned/core/index.ts`) to source text. */
export const files: Record<string, string> = Object.fromEntries(
  Object.entries(sources).map(([path, text]) => [
    path.replace(/^.*\/packages\/toned-(\w+)\//, '/node_modules/@toned/$1/'),
    text,
  ]),
)
