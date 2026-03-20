// Component names derived from file glob — no virtual module needed.
// IMPORTANT: This file must NOT reference any virtual modules (virtual:component-docs/*)
// because it's in the Sidebar → __root.tsx import chain. Any virtual module reference
// here triggers TanStack Router's routeTree regeneration loop.
const globModules = import.meta.glob<Record<string, unknown>>(
  '../../../ui/src/components/ui/*.tsx',
)

export const componentNames: string[] = Object.keys(globModules)
  .map((p) => p.split('/').pop()!.replace('.tsx', ''))
  .filter((name) => !name.endsWith('.doc'))
  .sort()

export const componentModules: Record<
  string,
  () => Promise<Record<string, unknown>>
> = {}

for (const [filePath, loader] of Object.entries(globModules)) {
  const name = filePath.split('/').pop()!.replace('.tsx', '')
  if (name.endsWith('.doc')) continue
  componentModules[name] = loader
}

