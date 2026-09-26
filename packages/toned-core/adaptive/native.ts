import type { AdaptiveStore } from './index.ts'

/** Attach to an independently sized available-space parent. This deliberately
 * does not import React Native or derive intrinsic content from selected output. */
export function nativeAdaptiveLayout<
  Axis extends string,
  Name extends string,
  Area extends string,
>(
  store: AdaptiveStore<Axis, Name, Area>,
  source: 'container' | 'viewport' = 'container',
): (event: {
  nativeEvent: { layout: { width: number; height: number } }
}) => void {
  if (source !== 'container' && source !== 'viewport')
    throw new Error('Toned adaptive: invalid native measurement source')
  return (event) => {
    const value = event?.nativeEvent?.layout
    if (!value)
      throw new Error('Toned adaptive: expected a native onLayout event')
    store.update({ [source]: { width: value.width, height: value.height } })
  }
}
