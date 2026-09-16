import type { TokenStyleDeclaration } from '../types/index.ts'
import {
  adHocAtoms,
  parseConditionKey,
  serializeAtom,
} from '../utils/conditions.ts'
import { collectWebRules } from '../web/collect.ts'

export type BuildManifest = Readonly<{
  version: 1
  systemId: string
  /** null is anonymous legacy output; the explicit id 'legacy' is distinct. */
  namespace: string | null
  /** Exact static schema, including named thresholds and token vocabulary. */
  definition: string
  /** Ad-hoc condition atoms. Named conditions belong to definition. */
  conditions: readonly string[]
  fingerprint: string
  extensions?: readonly string[]
}>

export type BuildArtifact = Readonly<{ css: string; manifest: BuildManifest }>

/** Stable content identifier, not a security hash or an equality shortcut. */
export function fingerprint(text: string): string {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(36)
}

export function assertManifestConditions(
  manifest: BuildManifest,
  rules: unknown,
): void {
  for (const name of collectWebRules(rules, manifest.systemId).keys()) {
    if (!manifest.extensions?.includes(name))
      throw new Error(
        `Toned manifest ${manifest.systemId}: webRules absent from build inventory; add the stylesheet to buildStyles({ sheets })`,
      )
  }
  const needed = new Set<string>()
  collectManifestConditions(rules, needed)
  const emitted = new Set(manifest.conditions)
  for (const atom of needed) {
    if (!emitted.has(atom))
      throw new Error(
        `Toned manifest ${manifest.systemId}: undeclared condition ${atom}; add the stylesheet to buildStyles({ sheets }) and regenerate CSS`,
      )
  }
}

/** Check an emitted asset against its manifest before publishing the pair.
 * This detects accidental drift; the fingerprint is not a security digest. */
export function assertBuildArtifact({ css, manifest }: BuildArtifact): void {
  if (fingerprint(css) !== manifest.fingerprint)
    throw new Error(
      'Toned build: CSS asset does not match its manifest fingerprint',
    )
}

/** Structural identity is compared exactly, never through the CSS content hash.
 * Function implementations still require the normal build/asset version pipeline. */
export function systemDefinition(system: TokenStyleDeclaration): string {
  const tokenShapes = Object.entries(system).flatMap(([name, token]) => {
    if (
      !token ||
      typeof token !== 'object' ||
      !('resolve' in token) ||
      !('values' in token)
    )
      return []
    return [
      [
        name,
        {
          values: token.values,
          properties: 'properties' in token ? token.properties : undefined,
          dynamic: 'dynamic' in token ? token.dynamic : undefined,
          $types: '$types' in token ? token.$types : undefined,
          inherit: 'inherit' in token ? token.inherit : undefined,
          alphaChannel:
            'alphaChannel' in token ? token.alphaChannel : undefined,
          alphaSteps: 'alphaSteps' in token ? token.alphaSteps : undefined,
          pseudoRules:
            'pseudoRules' in token && typeof token.pseudoRules === 'function',
        },
      ],
    ]
  })
  return JSON.stringify({
    layout: system.layoutContext,
    breakpoints: system.breakpoints,
    containers: system.containers,
    states: system.states,
    base: system.base,
    animations: system.animations,
    bridges: system.bridges,
    responsiveTokens: system.responsiveTokens,
    tokens: tokenShapes,
  })
}

/** Walk the complete immutable plan, including symbol-carried layers/ASTs.
 * No depth limit: nested conditions are a supported authoring feature. */
export function collectManifestConditions(
  input: unknown,
  out: Set<string>,
): void {
  const visited = new WeakSet<object>()
  const key = (name: string) => {
    if (!name.startsWith('@') || name.startsWith('@platform.')) return
    const expression = parseConditionKey(name.slice(1))
    if (expression)
      for (const atom of adHocAtoms(expression)) out.add(serializeAtom(atom))
  }
  const walk = (value: unknown): void => {
    if (!value || typeof value !== 'object' || visited.has(value)) return
    visited.add(value)
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    const record = value as Record<string | symbol, unknown>
    if (record['op'] === 'atom' && typeof record['key'] === 'string')
      key(record['key'])
    for (const name of Reflect.ownKeys(value)) {
      if (typeof name === 'string') {
        key(name)
        if (
          name === 'style' ||
          name === '$style' ||
          name === '$grid' ||
          name === '$area'
        )
          continue
      }
      walk(record[name])
    }
  }
  walk(input)
}
