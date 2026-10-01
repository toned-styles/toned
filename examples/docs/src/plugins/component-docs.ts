import fs from 'node:fs'
import path from 'node:path'

import { withCompilerOptions } from 'react-docgen-typescript'
import ts from 'typescript'
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

  let parser: ReturnType<typeof createParser> | undefined
  let program: ts.Program | undefined
  const compilerOptions: ts.CompilerOptions = {
    noEmit: true,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    skipLibCheck: true,
    allowImportingTsExtensions: true,
    baseUrl: path.dirname(options.tsconfigPath),
    paths: { '@/*': ['./src/*'] },
  }

  function getProgram() {
    program ??= ts.createProgram(
      getComponentNames(options.componentsDir).map((name) =>
        path.join(options.componentsDir, `${name}.tsx`),
      ),
      compilerOptions,
    )
    return program
  }

  function createParser() {
    return withCompilerOptions(compilerOptions, {
      propFilter: (prop: { parent?: { fileName: string } }) => {
        if (prop.parent?.fileName.includes('node_modules')) return false
        return true
      },
      shouldExtractLiteralValuesFromEnum: true,
      savePropValueAsString: true,
    })
  }

  function getParser() {
    parser ??= createParser()
    return parser
  }

  return {
    name: 'component-docs',
    configureServer(s) {
      server = s
    },
    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return `\0${id}`
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
      if (!getComponentNames(options.componentsDir).includes(name)) {
        return 'export default [];'
      }

      // Check cache
      const stat = fs.statSync(filePath)
      const cached = cache.get(name)
      if (cached && cached.mtimeMs === stat.mtimeMs) {
        return cached.data
      }

      const parser = getParser()
      // All component modules share one compiler graph instead of rebuilding
      // React, Toned and third-party declarations for every virtual module.
      const docs = parser.parseWithProgramProvider(filePath, getProgram)

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

      const source = fs.readFileSync(filePath, 'utf8')
      const sheets = stylesheetSources(source, filePath)
      const data = `export default ${JSON.stringify(processed)};\nexport const source = ${JSON.stringify(source)};\nexport const sheets = ${JSON.stringify(sheets)};`
      cache.set(name, { mtimeMs: stat.mtimeMs, data })
      return data
    },
    handleHotUpdate({ file, modules }) {
      const sourceRoot = path.join(path.dirname(options.tsconfigPath), 'src')
      if (!file.startsWith(`${sourceRoot}${path.sep}`) || !/\.tsx?$/.test(file))
        return
      // A shared type/helper can change several components' public props.
      program = undefined
      cache.clear()
      const graph = server?.moduleGraph
      if (!graph) return
      const metadataModules = [...graph.idToModuleMap.values()].filter((mod) =>
        mod.id?.startsWith(RESOLVED_PREFIX),
      )
      for (const mod of metadataModules) graph.invalidateModule(mod)
      return [...modules, ...metadataModules]
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

/** Read declarations at build time; never execute editor text or ship TypeScript's parser. */
function stylesheetSources(source: string, filePath: string) {
  const file = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const sheets: { name: string; source: string; parts: string[] }[] = []
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer)
        continue
      let expression = declaration.initializer
      while (
        ts.isCallExpression(expression) &&
        ts.isPropertyAccessExpression(expression.expression)
      ) {
        expression = expression.expression.expression
      }
      if (
        !ts.isCallExpression(expression) ||
        expression.expression.getText(file) !== 'stylesheet'
      )
        continue
      const rules = expression.arguments[0]
      if (!rules || !ts.isObjectLiteralExpression(rules)) continue
      const parts = rules.properties.flatMap((property) => {
        if (!ts.isPropertyAssignment(property)) return []
        const name = property.name
        const key =
          ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : ''
        return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(key) ? [key] : []
      })
      sheets.push({
        name: declaration.name.text,
        source: `const ${declaration.getText(file)}`,
        parts,
      })
    }
  }
  return sheets
}
