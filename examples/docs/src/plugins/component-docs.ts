import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

const VIRTUAL_PREFIX = 'virtual:component-docs/'
const RESOLVED_PREFIX = '\0virtual:component-docs/'

interface ComponentDocsOptions {
  componentsDir: string
  tsconfigPath: string
}

function getComponentNames(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.doc.tsx'))
    .map((f) => f.replace('.tsx', ''))
    .sort()
}

export function componentDocs(options: ComponentDocsOptions): Plugin {
  const cache = new Map<string, { mtimeMs: number; data: string }>()
  let server: ViteDevServer | undefined

  let parserPromise: ReturnType<typeof createParser> | null = null

  async function createParser() {
    const docgen = await import('react-docgen-typescript')
    return docgen.withCompilerOptions(
      {
        noEmit: true,
        jsx: 4 /* JsxEmit.ReactJSX */,
        strict: true,
        moduleResolution: 100 /* ModuleResolutionKind.Bundler */,
        target: 9 /* ScriptTarget.ES2022 */,
        module: 99 /* ModuleKind.ESNext */,
        skipLibCheck: true,
        allowImportingTsExtensions: true,
        baseUrl: path.dirname(options.tsconfigPath),
        paths: { '@/*': ['./src/*'] },
      },
      {
        propFilter: (prop: { parent?: { fileName: string } }) => {
          if (prop.parent?.fileName.includes('node_modules')) return false
          return true
        },
        shouldExtractLiteralValuesFromEnum: true,
        savePropValueAsString: true,
      },
    )
  }

  function getParser() {
    if (!parserPromise) {
      parserPromise = createParser()
    }
    return parserPromise
  }

  return {
    name: 'component-docs',
    configureServer(s) {
      server = s
    },
    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return '\0' + id
      }
    },
    async load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return

      const name = id.slice(RESOLVED_PREFIX.length)

      // Index module — list of all component names + lazy loaders
      if (name === 'index') {
        const names = getComponentNames(options.componentsDir)
        const loaderEntries = names
          .map(
            (n) =>
              `  ${JSON.stringify(n)}: () => import('virtual:component-docs/${n}')`,
          )
          .join(',\n')
        return [
          `export const names = ${JSON.stringify(names)};`,
          `export const loaders = {\n${loaderEntries}\n};`,
        ].join('\n')
      }

      // Per-component metadata
      const filePath = path.join(options.componentsDir, `${name}.tsx`)
      if (!fs.existsSync(filePath)) {
        return `export default [];`
      }

      // Check cache
      const stat = fs.statSync(filePath)
      const cached = cache.get(name)
      if (cached && cached.mtimeMs === stat.mtimeMs) {
        return cached.data
      }

      const parser = await getParser()
      const docs = parser.parse(filePath)

      // Process docs to extract @preview tags
      const processed = docs.map(
        (doc: {
          displayName: string
          description: string
          filePath: string
          props: Record<
            string,
            {
              name: string
              type: { name: string; value?: { value: string }[] }
              required: boolean
              defaultValue: { value: string } | null
              description: string
            }
          >
        }) => ({
          displayName: doc.displayName,
          description: doc.description,
          filePath: doc.filePath,
          props: Object.fromEntries(
            Object.entries(doc.props).map(([key, prop]) => {
              const { preview, cleanDescription } = extractPreview(
                prop.description,
              )
              // Strip surrounding quotes from type values and defaultValue
              // (react-docgen-typescript with savePropValueAsString wraps string literals)
              const cleanType = {
                ...prop.type,
                value: prop.type.value?.map((v) => ({
                  value: stripQuotes(v.value),
                })),
              }
              const cleanDefault = prop.defaultValue
                ? { value: stripQuotes(prop.defaultValue.value) }
                : null

              return [
                key,
                {
                  name: prop.name,
                  type: cleanType,
                  required: prop.required,
                  defaultValue: cleanDefault,
                  description: cleanDescription,
                  preview,
                },
              ]
            }),
          ),
        }),
      )

      const data = `export default ${JSON.stringify(processed)};`
      cache.set(name, { mtimeMs: stat.mtimeMs, data })
      return data
    },
    handleHotUpdate({ file }) {
      if (!file.startsWith(options.componentsDir) || !file.endsWith('.tsx'))
        return

      const name = path.basename(file, '.tsx')
      cache.delete(name)

      // Invalidate just the specific virtual module, not the whole page
      const virtualId = RESOLVED_PREFIX + name
      const mod = server?.moduleGraph.getModuleById(virtualId)
      if (mod) {
        server!.moduleGraph.invalidateModule(mod)
        // Return empty array to prevent Vite's default full-reload behavior
        return []
      }
      return []
    },
  }
}

function stripQuotes(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1)
  }
  return s
}

function extractPreview(description: string): {
  preview?: string
  cleanDescription: string
} {
  const match = description.match(/@preview\s+(.+?)(?:\n|$)/)
  return {
    preview: match?.[1]?.trim(),
    cleanDescription: description.replace(/@preview\s+.+?(?:\n|$)/, '').trim(),
  }
}
