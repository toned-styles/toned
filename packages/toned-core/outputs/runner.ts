import { resolve } from 'node:path'

import { type InlineConfig, type Plugin, runnerImport } from 'vite'

import {
  type TonedOutputs,
  collectOutputs,
  outputFor,
  outputModuleSource,
  parseOutputSpecifier,
} from './index.ts'

const VIRTUAL = '\0'

/** Serves `toned:<name>/<key>` from outputs already collected. */
export function outputsModulePlugin(
  outputs: () => Readonly<TonedOutputs>,
): Plugin {
  return {
    name: 'toned:outputs-modules',
    resolveId(id) {
      if (parseOutputSpecifier(id)?.key) return VIRTUAL + id
    },
    load(id) {
      if (!id.startsWith(VIRTUAL)) return
      const specifier = parseOutputSpecifier(id.slice(VIRTUAL.length))
      if (!specifier?.key) return
      return outputModuleSource(
        outputFor(outputs(), specifier.name),
        specifier.key,
      )
    },
  }
}

export interface LoadOutputsOptions {
  /** Outputs modules, relative to `root`, in order. */
  modules: readonly string[]
  root: string
  /** Extra Vite config for the module runner (for example how to compile JSX). */
  runner?: InlineConfig
}

/**
 * Collect outputs with Vite's module runner: every call evaluates the modules and
 * what they import afresh, so a changed declaration is always seen. A module must
 * finish its work while it is imported (top-level `await`), because the runner
 * closes when the import settles.
 */
export function loadOutputs({
  modules,
  root,
  runner,
}: LoadOutputsOptions): Promise<TonedOutputs> {
  return collectOutputs(modules, async (module, earlier) => {
    const { module: exported } = await runnerImport<unknown>(
      resolve(root, module),
      {
        configFile: false,
        logLevel: 'error',
        ...runner,
        root,
        plugins: [
          outputsModulePlugin(() => earlier),
          ...(runner?.plugins ?? []),
        ],
      },
    )
    return exported
  })
}
