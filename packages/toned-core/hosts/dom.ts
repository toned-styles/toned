import { attachGridElement, validateGridElement } from '../grid/host.ts'
import type { GridArea, GridDefinition } from '../grid/index.ts'
import { initMedia } from '../stylesheet/media.ts'
import { subscribeWebRelations } from '../stylesheet/relations-web.ts'
import type { TokenSystem } from '../types/index.ts'
import { fixedQueryWidth, parseConditionKey } from '../utils/conditions.ts'
import type { HostIntegration } from './types.ts'

// Query objects are shared per system; listeners exist only while committed
// controllers subscribe. Weak keys do not retain unmounted systems.
const media = new WeakMap<object, Map<string, ReturnType<typeof initMedia>>>()

export function createDomIntegration(
  system: TokenSystem<any>,
): HostIntegration {
  const stateAttributes = Object.values(system.system.states ?? {}).flatMap(
    (selector) =>
      [...String(selector).matchAll(/\[\s*([\w:-]+)/g)].map(
        (match) => match[1]!,
      ),
  )
  // Simple compound aliases depend only on a host and its ancestry/descendants.
  // Arbitrary relational CSS selectors deliberately retain document-wide updates.
  const localAliases = Object.values(system.system.states ?? {}).every(
    (selector) => /^(?:[.#][\w-]+|\[[^\]]+\])+$/.test(String(selector)),
  )
  return {
    connected: (target) => (target as Node).isConnected !== false,
    validateRelations: () => {},
    parentOf: (target) => (target as Element).parentElement ?? undefined,
    readState: (target, state) =>
      (target as Element).matches(system.system.states?.[state] ?? `:${state}`),
    subscribeRelations(targets, notify, currentTargets) {
      const initialTargets = [...targets]
      const documents = new Set<Document>()
      for (const target of initialTargets) {
        const document = (target as Node).ownerDocument
        if (document) documents.add(document)
      }
      const stops: (() => void)[] = []
      try {
        for (const document of documents)
          stops.push(
            subscribeWebRelations(
              document,
              notify,
              stateAttributes,
              localAliases
                ? () =>
                    [...(currentTargets?.() ?? initialTargets)].filter(
                      (target) => (target as Node).ownerDocument === document,
                    ) as Node[]
                : undefined,
            ),
          )
      } catch (error) {
        for (const stop of stops) stop()
        throw error
      }
      return () => {
        for (const stop of stops) stop()
      }
    },
    connectMedia(keys, notify) {
      const thresholds = new Map<string, number>()
      for (const key of keys) {
        if (!key.startsWith('@')) continue
        for (const clause of parseConditionKey(key.slice(1)) ?? [])
          for (const atom of clause)
            if (atom.container === null && atom.step === null) {
              const name = `>=${atom.min}`
              thresholds.set(name, fixedQueryWidth(name)!)
            }
      }
      const entries = [...thresholds].sort(([a], [b]) => a.localeCompare(b))
      const key = JSON.stringify(entries)
      let emitters = media.get(system)
      if (!emitters) {
        emitters = new Map()
        media.set(system, emitters)
      }
      let emitter = emitters.get(key)
      if (!emitter) {
        emitter = initMedia(system, Object.fromEntries(entries))
        // Eviction drops only cached query objects. Live subscribers retain
        // their emitter and release its listeners through their own cleanup.
        if (emitters.size >= 32) emitters.delete(emitters.keys().next().value!)
        emitters.set(key, emitter)
      }
      const current = emitter
      const stop = current.sub(() => notify(current.data))
      return { state: current.data, stop }
    },
    attach(target, declaration, invalidate) {
      if (!declaration['$grid'] && !declaration['$area']) return
      return attachGridElement(
        target as Element,
        {
          grid: declaration['$grid'] as GridDefinition | undefined,
          area: declaration['$area'] as GridArea | undefined,
        },
        invalidate,
      )
    },
    validate: (target) => validateGridElement(target as Element),
  }
}
