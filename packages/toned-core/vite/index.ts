import type { TokenStyleDeclaration } from '../types/index.ts'
import { generate } from '../dom/generate.ts'
import type { Plugin } from 'vite'
import { resolve } from 'node:path'

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
  id?: string
  scope?: string
  /** Explicit declaration modules/assets watched by the build. */
  inputs?: readonly string[]
  /** Recollect after a watched declaration changes; include lazy sheets. */
  conditions?: readonly string[] | (() => readonly string[] | Promise<readonly string[]>)
}

export default function toned(options: TonedPluginOptions): Plugin {
  let inputs = new Set<string>()
  const render = async () => {
    const conditions = typeof options.conditions === 'function' ? await options.conditions() : options.conditions
    const generated = generate(options.system, { id: options.id, scope: options.scope, conditions })
    return options.layer ? `@layer ${options.layer} {\n${generated}\n}` : generated
  }

  return {
    name: 'toned',
    configResolved(config) {
      inputs = new Set((options.inputs ?? []).map(file => resolve(config.root, file)))
    },
    buildStart() {
      for (const file of inputs) this.addWatchFile(file)
    },
    resolveId(id: string) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    async load(id: string) {
      if (id === RESOLVED_ID) {
        return render()
      }
    },
    handleHotUpdate(ctx) {
      if (!inputs.has(ctx.file)) return
      const module = ctx.server.moduleGraph.getModuleById(RESOLVED_ID)
      if (!module) return
      ctx.server.moduleGraph.invalidateModule(module)
      return [module]
    },
  }
}
