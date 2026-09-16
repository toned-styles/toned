/** Pure resolution: no React imports, global config installation or host writes. */

import type { OutputBackend, ResolvedProps } from '../backends/index.ts'
import { cssVariablesBackend, nativeBackend } from '../backends/index.ts'
import type { BuildManifest } from '../build/index.ts'
import {
  assertManifestConditions,
  systemDefinition,
} from '../build/manifest.ts'
import { getStylesheetPlan } from '../stylesheet/plans.ts'
import { StyleMatcher } from '../stylesheet/StyleMatcher.ts'
import type {
  TokenStyleDeclaration,
  TokenSystem,
  Tokens,
} from '../types/index.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'

type SheetMeta<T> = T extends { readonly __toned__?: infer M } ? M : never
type SheetVariants<T> = SheetMeta<T> extends { mods: infer M } ? M : never
type SheetOutput<T> = SheetMeta<T> extends { elements: infer E }
  ? Readonly<{ [K in keyof E]: ResolvedProps }>
  : Readonly<Record<string, ResolvedProps>>

export function createRenderer<S extends TokenStyleDeclaration>(
  system: TokenSystem<S>,
  options: { backend: OutputBackend; manifest?: BuildManifest; tokens: Tokens },
) {
  const backend = Object.freeze({ ...options.backend })
  if (options.manifest && options.manifest.systemId !== (system.id ?? 'legacy'))
    throw new Error(
      'Toned renderer: build manifest belongs to a different system namespace',
    )
  if (
    options.manifest &&
    options.manifest.definition !== systemDefinition(system.system)
  )
    throw new Error(
      'Toned renderer: build manifest has a different system definition; regenerate CSS',
    )
  const tokens = immutableSnapshot(options.tokens)
  const matchers = new WeakMap<object, StyleMatcher>()
  return Object.freeze({
    backend,
    resolve<T extends object>(
      sheet: T,
      ...args: SheetVariants<T> extends never
        ? [
            input?: {
              facts?: Readonly<Record<string, string | number | boolean>>
              tokens?: Tokens
            },
          ]
        : [
            input: {
              variants: SheetVariants<T>
              facts?: Readonly<Record<string, string | number | boolean>>
              tokens?: Tokens
            },
          ]
    ): SheetOutput<T> {
      const input = (args[0] ?? {}) as {
        variants?: SheetVariants<T>
        facts?: Readonly<Record<string, string | number | boolean>>
        tokens?: Tokens
      }
      const plan = getStylesheetPlan(sheet)
      if (plan.ref !== (system as unknown))
        throw new Error(
          'Toned renderer: stylesheet belongs to a different system',
        )
      let matcher = matchers.get(sheet)
      if (!matcher) {
        const rules = resolvePlatformKeys(plan.rules, backend.platform)
        if (backend.browserConditions) {
          if (!options.manifest)
            throw new Error(
              'Toned web renderer: a pre-generated CSS manifest is required',
            )
          assertManifestConditions(options.manifest, rules)
        }
        matcher = new StyleMatcher(rules, {
          sourceOrder: !!system.id,
          platform: backend.platform,
          cssMediaMode: backend.browserConditions,
          cssPseudoMode: backend.browserConditions,
          stateAliases: Object.keys(
            (system.system as Record<string, unknown>)['states'] ?? {},
          ),
        })
        matchers.set(sheet, matcher)
      }
      const selected = matcher.match({
        ...(input.variants as object | undefined),
        ...input.facts,
      } as Parameters<StyleMatcher['match']>[0])
      const result: Record<string, ResolvedProps> = {}
      for (const part of matcher.elementSet) {
        const output = system.exec(
          {
            tokens: input.tokens ?? tokens,
            useClassName: backend.id === 'css-vars',
            platform: backend.platform,
          },
          selected[part] ?? {},
        )
        // Legacy exec always includes its browser scope marker. It is not an
        // emitted utility or native property and belongs only to that backend.
        const className =
          backend.id === 'css-vars'
            ? output.className
            : output.className
                ?.split(/\s+/)
                .filter((name) => name !== '_' && name !== '_s')
                .join(' ')
        result[part] = immutableSnapshot(
          backend.resolve({
            style: output.style as Record<string, unknown>,
            ...(className ? { className } : {}),
          }),
        )
      }
      return Object.freeze(result) as SheetOutput<T>
    },
  })
}

export function createWebRenderer<S extends TokenStyleDeclaration>(
  system: TokenSystem<S>,
  options: { manifest: BuildManifest; tokens: Tokens },
) {
  return createRenderer(system, { ...options, backend: cssVariablesBackend })
}

export function createNativeRenderer<S extends TokenStyleDeclaration>(
  system: TokenSystem<S>,
  options: { tokens: Tokens },
) {
  return createRenderer(system, { ...options, backend: nativeBackend })
}
