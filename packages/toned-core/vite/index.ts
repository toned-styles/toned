import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { buildStyles } from '../build/index.ts'
import { generateArtifact } from '../build/artifact.ts'
import type { BuildArtifact } from '../build/manifest.ts'
import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'

const VIRTUAL_ID = 'virtual:toned.css'
const RESOLVED_ID = '\0virtual:toned.css'
const MANIFEST_ID = 'virtual:toned.manifest'
const RESOLVED_MANIFEST_ID = '\0virtual:toned.manifest'

export interface TonedPluginOptions<
  S extends TokenStyleDeclaration = TokenStyleDeclaration,
> {
  /** Prefer the complete system ref, which carries its runtime namespace. */
  system: S | TokenSystem<S>
  /** Explicit sheets, including lazy declarations; recollect on watched changes. */
  sheets?:
    | readonly object[]
    | (() => readonly object[] | Promise<readonly object[]>)
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
  conditions?:
    | readonly string[]
    | (() => readonly string[] | Promise<readonly string[]>)
}

export default function toned<S extends TokenStyleDeclaration>(
  options: TonedPluginOptions<S>,
): Plugin {
  let inputs = new Set<string>()
  let artifact: Promise<BuildArtifact> | undefined
  const render = async (): Promise<BuildArtifact> => {
    const conditions =
      typeof options.conditions === 'function'
        ? await options.conditions()
        : options.conditions
    const sheets =
      typeof options.sheets === 'function'
        ? await options.sheets()
        : (options.sheets ?? [])
    const shared = {
      conditions,
      scope: options.scope,
      layer: options.layer,
      systemId: options.id,
    }
    if (typeof options.system.exec === 'function')
      return buildStyles(options.system as TokenSystem<S>, {
        ...shared,
        sheets,
      })
    if (sheets.length)
      throw new Error(
        'Toned Vite: sheet collection requires the complete system ref',
      )
    // Legacy raw declarations do not carry their namespace; id remains explicit.
    return generateArtifact(options.system as S, shared)
  }
  const collect = () => (artifact ??= render())

  return {
    name: 'toned',
    configResolved(config) {
      inputs = new Set(
        (options.inputs ?? []).map((file) => resolve(config.root, file)),
      )
    },
    buildStart() {
      artifact = undefined
      for (const file of inputs) this.addWatchFile(file)
    },
    resolveId(id: string) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      if (id === MANIFEST_ID) return RESOLVED_MANIFEST_ID
    },
    async load(id: string) {
      if (id === RESOLVED_ID) {
        return (await collect()).css
      }
      if (id === RESOLVED_MANIFEST_ID)
        return `export default ${JSON.stringify((await collect()).manifest)}`
    },
    handleHotUpdate(ctx) {
      if (!inputs.has(ctx.file)) return
      artifact = undefined
      const modules = [RESOLVED_ID, RESOLVED_MANIFEST_ID].flatMap((id) => {
        const module = ctx.server.moduleGraph.getModuleById(id)
        if (!module) return []
        ctx.server.moduleGraph.invalidateModule(module)
        return [module]
      })
      return modules
    },
  }
}
