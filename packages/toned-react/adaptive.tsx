'use client'

import type { AdaptiveStore } from '@toned/core/adaptive'
import { useSyncExternalStore } from 'react'

/** Feed the resulting axis bag into useStyles(sheet, variants) or a
 * createElements provider. Only a selected-layout change rerenders consumers. */
export function useAdaptiveVariants<
  Axis extends string,
  Name extends string,
  Area extends string,
>(store: AdaptiveStore<Axis, Name, Area>): Readonly<Record<Axis, Name>> {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )
}
