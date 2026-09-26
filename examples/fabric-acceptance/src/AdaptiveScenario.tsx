import { defineSystem, type Variants } from '@toned/core'
import {
  type AdaptiveLayoutName,
  createAdaptiveStore,
  defineAdaptiveLayout,
} from '@toned/core/adaptive'
import { nativeAdaptiveLayout } from '@toned/core/adaptive/native'
import { useStyles } from '@toned/react'
import { useAdaptiveVariants } from '@toned/react/adaptive'
import * as React from 'react'
import { View, type ViewProps } from 'react-native'
import { type ScenarioProps, until, useScenario } from './Harness.tsx'

const adaptive = defineAdaptiveLayout({
  axis: 'layout',
  root: 'Root',
  areas: ['First', 'Second'],
  fallback: 'stack',
  hysteresis: { size: 8 },
  layouts: {
    stack: { flow: 'stack', gap: 8 },
    row: { flow: 'row', gap: 8, when: { minWidth: 160, maxTextScale: 1.5 } },
  },
})
const sheet = defineSystem({})
  .stylesheet({
    Root: { $style: { width: '100%' } },
    First: { $style: { width: 60, height: 20 } },
    Second: { $style: { width: 60, height: 20 } },
  })
  .variants(
    ($: Variants<{ layout: AdaptiveLayoutName<typeof adaptive> }>) =>
      adaptive.rules($),
    { defaults: { layout: adaptive.fallback } },
  )

/** The externally constrained parent is the sensor. The selected Root is not. */
export function AdaptiveScenario({ finish }: ScenarioProps) {
  const [width, setWidth] = React.useState(240)
  const [store] = React.useState(() =>
    createAdaptiveStore(adaptive, { textScale: 1 }),
  )
  const measuredWidth = (expected: number) =>
    Math.abs(
      (store.getMeasurements().container?.width ?? Infinity) - expected,
    ) <= 1
  const onLayout = React.useMemo(() => nativeAdaptiveLayout(store), [store])
  const styles = useStyles(sheet, useAdaptiveVariants(store))
  const first = React.useRef<View | null>(null)
  const second = React.useRef<View | null>(null)
  const root = React.useRef<View | null>(null)
  useScenario(
    'adaptive finite layouts use actual Fabric available-space measurements',
    finish,
    async (c) => {
      await until('available parent measurement', () => measuredWidth(240))
      await c.geometry(
        'wide available space selects horizontal layout',
        () => root.current,
        { width: 240, height: 20 },
      )
      await c.appearance(
        'first native area retains authored width',
        () => first.current,
        { width: 60, height: 20 },
      )
      const originalFirst = first.current
      const originalSecond = second.current
      setWidth(120)
      await until('narrow parent measurement', () => measuredWidth(120))
      await c.geometry(
        'narrow available space selects vertical layout',
        () => root.current,
        { width: 120, height: 48 },
      )
      setWidth(160)
      await until('boundary parent measurement', () => measuredWidth(160))
      await c.geometry(
        'hysteresis retains vertical layout at nominal boundary',
        () => root.current,
        { width: 160, height: 48 },
      )
      setWidth(180)
      await until('expanded parent measurement', () => measuredWidth(180))
      await c.geometry(
        'expanded space crosses hysteresis entry threshold',
        () => root.current,
        { width: 180, height: 20 },
      )
      store.update({ textScale: 2 })
      await c.geometry(
        'explicit accessibility text scale selects vertical layout',
        () => root.current,
        { width: 180, height: 48 },
      )
      c.check(
        'adaptive First retains native host identity',
        first.current === originalFirst,
        true,
        'host.identity',
      )
      c.check(
        'adaptive Second retains native host identity',
        second.current === originalSecond,
        true,
        'host.identity',
      )
      c.check(
        'last measured available parent width is within native rounding tolerance',
        measuredWidth(180),
        true,
        'render.lifecycle',
      )
    },
  )
  return (
    <View
      style={{ width, height: 100 }}
      onLayout={onLayout}
      collapsable={false}
    >
      <View
        {...(styles.Root.withProps({ ref: root }) as ViewProps)}
        collapsable={false}
        testID="adaptive-root"
      >
        <View
          {...(styles.First.withProps({ ref: first }) as ViewProps)}
          collapsable={false}
          testID="adaptive-first"
        />
        <View
          {...(styles.Second.withProps({ ref: second }) as ViewProps)}
          collapsable={false}
          testID="adaptive-second"
        />
      </View>
    </View>
  )
}
