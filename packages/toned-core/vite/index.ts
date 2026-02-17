import type { TokenStyleDeclaration } from '../types/index.ts'
import { generate } from '../dom/generate.ts'

const VIRTUAL_ID = 'virtual:toned.css'
const RESOLVED_ID = '\0virtual:toned.css'

export interface TonedPluginOptions {
  system: TokenStyleDeclaration
}

export default function toned(options: TonedPluginOptions) {
  const css = generate(options.system)

  return {
    name: 'toned',
    resolveId(id: string) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id: string) {
      if (id === RESOLVED_ID) {
        return css
      }
    },
    transformIndexHtml(_html: string, ctx: { server?: { moduleGraph: { urlToModuleMap: Map<string, unknown> } } }) {
      if (!ctx.server) return

      const cssLinks = Array.from(ctx.server.moduleGraph.urlToModuleMap.keys())
        .filter((url) => url.endsWith('.css') && !url.includes('?'))
        .map((url) => ({
          tag: 'link' as const,
          attrs: { rel: 'stylesheet', href: url },
          injectTo: 'head' as const,
        }))

      return [
        {
          tag: 'style',
          children: css,
          injectTo: 'head' as const,
        },
        ...cssLinks,
      ]
    },
  }
}
