import type { TokenStyleDeclaration } from '../types/index.ts'
import { generate } from '../dom/generate.ts'

const VIRTUAL_ID = 'virtual:toned.css'
const RESOLVED_ID = '\0virtual:toned.css'

export interface TonedPluginOptions {
  system: TokenStyleDeclaration
  /**
   * Wrap the generated stylesheet in a CSS cascade layer.
   *
   * A host that also runs a utility framework needs toned's atomic classes to
   * sit at a chosen point in the cascade — e.g. `layer: 'components'` under
   * Tailwind's `theme, base, components, utilities` order lets a caller's
   * utility className still override a component's toned styling, exactly as
   * it could override the component's own classes before toned. Unlayered
   * (the default), the generated rules beat every layered rule on the page.
   */
  layer?: string
}

export default function toned(options: TonedPluginOptions) {
  const generated = generate(options.system)
  const css = options.layer
    ? `@layer ${options.layer} {\n${generated}\n}`
    : generated

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
    transformIndexHtml(
      _html: string,
      ctx: {
        server?: { moduleGraph: { urlToModuleMap: Map<string, unknown> } }
      },
    ) {
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
