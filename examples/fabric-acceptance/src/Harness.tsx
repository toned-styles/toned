import type { Variants as VariantSchema } from '@toned/core'
import { defineSystem, defineToken } from '@toned/core'
import { ConfigProvider, createElements, useStyles } from '@toned/react'
import * as React from 'react'
import {
  findNodeHandle,
  NativeModules,
  Pressable,
  Text,
  TextInput,
  View,
  type ViewProps,
} from 'react-native'
import { AdaptiveScenario } from './AdaptiveScenario.tsx'
import { config } from './host.ts'
import { MotionScenario } from './MotionScenario.tsx'

type Measurement = { x: number; y: number; width: number; height: number }
// Every caller supplies one of these actual RN primitive refs.
type Measurable = View | Text | TextInput
export type AcceptanceAssertion = {
  name: string
  source:
    | 'native.measure'
    | 'native.focus'
    | 'native.snapshot'
    | 'host.identity'
    | 'render.lifecycle'
  expected: unknown
  actual: unknown
}
export type AcceptanceResult = {
  kind: 'scenario' | 'complete' | 'device-probe'
  name: string
  status: 'pass' | 'fail'
  assertions: AcceptanceAssertion[]
  error?: string
  limitations?: string[]
}
type NativeSnapshot = {
  width: number
  height: number
  alpha: number
  textColor?: number
  hintTextColor?: number
  focused?: boolean
}

async function nativeSnapshot(host: Measurable): Promise<NativeSnapshot> {
  const tag = findNodeHandle(host)
  const reporter = NativeModules['TonedAcceptance'] as
    | { snapshot(tag: number): Promise<NativeSnapshot> }
    | undefined
  if (tag === null || !reporter?.snapshot)
    throw new Error('TonedAcceptance native reporter/host tag is unavailable')
  // Fabric shadow-tree measurements can precede the Android mount transaction.
  // Retry that one explicit native status only; unsupported reads, rejected
  // patches and all other reporter failures remain failures.
  const deadline = Date.now() + 5000
  for (;;) {
    try {
      return await new Promise<NativeSnapshot>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Native snapshot timed out after 5 seconds')),
          Math.max(0, deadline - Date.now()),
        )
        reporter.snapshot(tag).then(
          (value) => {
            clearTimeout(timer)
            resolve(value)
          },
          (error: unknown) => {
            clearTimeout(timer)
            reject(error)
          },
        )
      })
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'NOT_MOUNTED' ||
        Date.now() >= deadline
      )
        throw error
      await delay(Math.min(32, Math.max(0, deadline - Date.now())))
    }
  }
}

function matchesSnapshot(
  actual: NativeSnapshot,
  expected: Partial<NativeSnapshot>,
) {
  return Object.entries(expected).every(([key, value]) => {
    const observed = actual[key as keyof NativeSnapshot]
    if (
      key.endsWith('Color') &&
      typeof value === 'number' &&
      typeof observed === 'number'
    )
      return value >>> 0 === observed >>> 0
    if (typeof value === 'number' && typeof observed === 'number')
      return Math.abs(observed - value) <= (key === 'alpha' ? 0.01 : 1)
    return Object.is(observed, value)
  })
}

export type Context = {
  assertions: AcceptanceAssertion[]
  check(
    name: string,
    actual: unknown,
    expected: unknown,
    source: AcceptanceAssertion['source'],
  ): void
  appearance(
    name: string,
    read: () => Measurable | null,
    expected: Partial<NativeSnapshot>,
  ): Promise<void>
  geometry(
    name: string,
    read: () => Measurable | null,
    expected: Partial<Measurement>,
  ): Promise<void>
}
export type ScenarioProps = { finish(result: AcceptanceResult): void }

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

export function required<T>(value: T | null, label: string): T {
  if (value === null) throw new Error(`${label} is not mounted`)
  return value
}

export async function until(
  label: string,
  ready: () => boolean,
): Promise<void> {
  const deadline = Date.now() + 5000
  while (!ready()) {
    if (Date.now() >= deadline)
      throw new Error(`Timed out waiting for ${label}`)
    await delay(32)
  }
}

/** Public RN host readback, not a shadow copy of Toned's requested patches. */
function measure(host: Measurable): Promise<Measurement> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Native measure callback timed out')),
      1500,
    )
    host.measure((_x, _y, width, height, x, y) => {
      clearTimeout(timer)
      resolve({ x, y, width, height })
    })
  })
}

export function useScenario(
  name: string,
  finish: ScenarioProps['finish'],
  run: (context: Context) => Promise<void>,
) {
  const initial = React.useRef({ name, finish, run })
  React.useEffect(() => {
    const { name, finish, run } = initial.current
    let alive = true
    const assertions: AcceptanceAssertion[] = []
    const context: Context = {
      assertions,
      check(label, actual, expected, source) {
        assertions.push({ name: label, actual, expected, source })
        if (!Object.is(actual, expected))
          throw new Error(
            `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
          )
      },
      async appearance(label, read, expected) {
        let actual: NativeSnapshot | undefined
        const deadline = Date.now() + 5000
        while (alive && Date.now() < deadline) {
          const host = read()
          if (host) {
            actual = await nativeSnapshot(host)
            if (matchesSnapshot(actual, expected)) {
              assertions.push({
                name: label,
                actual,
                expected,
                source: 'native.snapshot',
              })
              return
            }
          }
          await delay(32)
        }
        throw new Error(
          `${label}: native snapshot expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        )
      },
      async geometry(label, read, expected) {
        const deadline = Date.now() + 5000
        let actual: Measurement | null = null
        while (alive && Date.now() < deadline) {
          const host = read()
          if (host) {
            const measured = await measure(host)
            actual = measured
            if (
              Object.entries(expected).every(
                ([key, value]) =>
                  Math.abs(measured[key as keyof Measurement] - value) <= 1,
              )
            ) {
              assertions.push({
                name: label,
                actual,
                expected,
                source: 'native.measure',
              })
              return
            }
          }
          await delay(32)
        }
        throw new Error(
          `${label}: native geometry expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        )
      },
    }
    // Each keyed scenario mounts once. Run after the first native commit; every
    // subsequent assertion waits for observed native state rather than assuming
    // a React commit means an Android layout transaction has completed.
    void run(context).then(
      () =>
        alive && finish({ kind: 'scenario', name, status: 'pass', assertions }),
      (error: unknown) =>
        alive &&
        finish({
          kind: 'scenario',
          name,
          status: 'fail',
          assertions,
          error:
            error instanceof Error
              ? (error.stack ?? error.message)
              : String(error),
        }),
    )
    return () => {
      alive = false
    }
    // Deliberately one runner for this scenario's mount; state changes must not
    // restart the sequence. Mutable observations are read from refs below.
  }, [])
}

const system = defineSystem({
  id: 'android-fabric-acceptance',
  tokens: {
    hint: defineToken({
      values: ['active'] as const,
      resolve: () => ({ '--toned-b-placeholder-color': '#dd4400' }),
    }),
  },
})
const Primitives = createElements(
  system.stylesheet({
    Box: { $kind: 'view', $style: { width: 96, height: 32 } },
    Label: { $kind: 'text', $style: { width: 88, height: 28, fontSize: 16 } },
    Input: { $kind: 'view', $style: { width: 120, height: 40 } },
    Action: {
      $kind: 'pressable',
      $style: { width: 96, height: 40 },
      ':active': { $style: { width: 144 } },
    },
  }),
)

function PrimitiveScenario({ finish }: ScenarioProps) {
  const box = React.useRef<View>(null)
  const label = React.useRef<Text>(null)
  const input = React.useRef<TextInput>(null)
  const action = React.useRef<View>(null)
  const pressHandlers = React.useRef<{ in?: () => void; out?: () => void }>({})
  const ProbePressable = React.useMemo(
    () =>
      React.forwardRef<View, React.ComponentProps<typeof Pressable>>(
        function Probe(props, ref) {
          const { onPressIn, onPressOut } = props
          React.useLayoutEffect(() => {
            pressHandlers.current = {
              // Capture only handlers whose target has committed. This case
              // invokes the callback; device automation covers native dispatch.
              in: () =>
                onPressIn?.({} as Parameters<NonNullable<typeof onPressIn>>[0]),
              out: () =>
                onPressOut?.(
                  {} as Parameters<NonNullable<typeof onPressOut>>[0],
                ),
            }
            return () => {
              pressHandlers.current = {}
            }
          }, [onPressIn, onPressOut])
          return <Pressable {...props} ref={ref} />
        },
      ),
    [],
  )
  useScenario(
    'real primitives and Pressable callback patches',
    finish,
    async (c) => {
      await c.geometry('View dimensions', () => box.current, {
        width: 96,
        height: 32,
      })
      await c.geometry('Text dimensions', () => label.current, {
        width: 88,
        height: 28,
      })
      await c.geometry('TextInput dimensions', () => input.current, {
        width: 120,
        height: 40,
      })
      await c.geometry('Pressable resting width', () => action.current, {
        width: 96,
      })
      pressHandlers.current.in?.()
      await c.geometry('Pressable active native patch', () => action.current, {
        width: 144,
      })
      pressHandlers.current.out?.()
      await c.geometry(
        'Pressable released native patch',
        () => action.current,
        { width: 96 },
      )
    },
  )
  return (
    <Primitives>
      <Primitives.Box
        as={View}
        ref={box}
        collapsable={false}
        testID="acceptance-view"
      />
      <Primitives.Label as={Text} ref={label} testID="acceptance-text">
        Native text
      </Primitives.Label>
      <Primitives.Input
        as={TextInput}
        ref={input}
        testID="acceptance-input"
        defaultValue="Fabric"
        showSoftInputOnFocus={false}
      />
      <Primitives.Action
        as={ProbePressable}
        ref={action}
        testID="acceptance-pressable"
      >
        <Text>Pressable</Text>
      </Primitives.Action>
    </Primitives>
  )
}

const Focus = createElements(
  system.stylesheet({
    Input: {
      $kind: 'view',
      $style: { width: 100 },
      ':focus': { $style: { width: 148, minHeight: 64 } },
    },
  }),
)

function FocusScenario({ finish }: ScenarioProps) {
  const first = React.useRef<TextInput>(null)
  const second = React.useRef<TextInput>(null)
  const [baseline, setBaseline] = React.useState(40)
  const committedBaseline = React.useRef(baseline)
  React.useLayoutEffect(() => {
    committedBaseline.current = baseline
  }, [baseline])
  const commits = React.useRef(0)
  const focusEvents = React.useRef(0)
  const ProbeInput = React.useMemo(
    () =>
      React.forwardRef<TextInput, React.ComponentProps<typeof TextInput>>(
        function Probe(props, ref) {
          React.useLayoutEffect(() => {
            commits.current++
          })
          return <TextInput {...props} ref={ref} />
        },
      ),
    [],
  )
  useScenario(
    'native focus, removal reset and caller baseline',
    finish,
    async (c) => {
      await c.geometry('caller resting height', () => first.current, {
        width: 100,
        height: 40,
      })
      const before = commits.current
      required(first.current, 'first TextInput').focus()
      await c.geometry('real native focus applies state', () => first.current, {
        width: 148,
        height: 64,
      })
      c.check(
        'TextInput confirms focus',
        required(first.current, 'first TextInput').isFocused(),
        true,
        'native.focus',
      )
      c.check(
        'native focus event reached the component',
        focusEvents.current > 0,
        true,
        'native.focus',
      )
      c.check(
        'direct focus required no React primitive commit',
        commits.current,
        before,
        'render.lifecycle',
      )
      await c.geometry(
        'repeated sibling remains resting',
        () => second.current,
        { width: 100, height: 40 },
      )
      setBaseline(56)
      await until(
        'caller baseline commit',
        () => committedBaseline.current === 56,
      )
      await c.geometry(
        'state survives caller baseline commit',
        () => first.current,
        { width: 148, height: 64 },
      )
      required(first.current, 'first TextInput').blur()
      await c.geometry(
        'removing minHeight restores new caller height',
        () => first.current,
        { width: 100, height: 56 },
      )
      c.check(
        'TextInput confirms blur',
        required(first.current, 'first TextInput').isFocused(),
        false,
        'native.focus',
      )
    },
  )
  return (
    <Focus>
      <Focus.Input
        as={ProbeInput}
        ref={first}
        style={{ height: baseline }}
        testID="acceptance-focus-first"
        showSoftInputOnFocus={false}
        onFocus={() => {
          focusEvents.current++
        }}
      />
      <Focus.Input
        as={ProbeInput}
        ref={second}
        style={{ height: 40 }}
        testID="acceptance-focus-second"
        showSoftInputOnFocus={false}
      />
    </Focus>
  )
}

const Variants = createElements(
  system
    .stylesheet({
      Root: { $kind: 'view', $style: { width: 80, height: 32 } },
    })
    .variants(($: VariantSchema<{ expanded: boolean }>) => ({
      [$.expanded(true)]: { Root: { $style: { width: 176 } } },
    })),
)

function RefScenario({ finish }: ScenarioProps) {
  const host = React.useRef<View | null>(null)
  const [expanded, setExpanded] = React.useState(false)
  const [refVersion, setRefVersion] = React.useState(0)
  const [visible, setVisible] = React.useState(true)
  const counts = React.useRef({ attached: 0, detached: 0, version: 0 })
  const ref = React.useMemo(
    () => (node: View | null) => {
      host.current = node
      if (!node) return
      counts.current.attached++
      counts.current.version = refVersion
      return () => {
        counts.current.detached++
        if (host.current === node) host.current = null
      }
    },
    [refVersion],
  )
  useScenario(
    'variant host identity, ref replacement and release',
    finish,
    async (c) => {
      await c.geometry('initial variant', () => host.current, { width: 80 })
      const original = host.current
      setExpanded(true)
      await c.geometry('committed variant on actual host', () => host.current, {
        width: 176,
      })
      c.check(
        'variant retains actual host object',
        host.current === original,
        true,
        'host.identity',
      )
      const beforeRefChange = counts.current.attached
      setRefVersion(1)
      await until(
        'replacement callback ref',
        () =>
          counts.current.attached > beforeRefChange &&
          counts.current.version === 1,
      )
      await c.geometry(
        'ref handoff retains native layout',
        () => host.current,
        { width: 176 },
      )
      c.check(
        'ref replacement retains actual host object',
        host.current === original,
        true,
        'host.identity',
      )
      c.check(
        'previous callback released once',
        counts.current.detached,
        counts.current.attached - 1,
        'render.lifecycle',
      )
      setVisible(false)
      await until('native host unmount', () => host.current === null)
      c.check('unmount clears host ref', host.current, null, 'host.identity')
      c.check(
        'all caller ref lifetimes released',
        counts.current.detached,
        counts.current.attached,
        'render.lifecycle',
      )
    },
  )
  return (
    <Variants expanded={expanded}>
      {visible && (
        <Variants.Root
          as={View}
          ref={ref}
          collapsable={false}
          testID="acceptance-ref"
        />
      )}
    </Variants>
  )
}

function SuspenseScenario({ finish }: ScenarioProps) {
  const host = React.useRef<View>(null)
  const [expanded, setExpanded] = React.useState(false)
  const gate = React.useMemo(() => {
    let release!: () => void
    const promise = new Promise<void>((resolve) => {
      release = resolve
    })
    return { open: false, suspended: false, promise, release }
  }, [])
  const Wait = React.useMemo(
    () =>
      function Wait({ blocked }: { blocked: boolean }) {
        const current = gate
        if (blocked && !current.open) {
          // Test-only attempted-render witness: a suspended render never runs
          // an effect, so commit-time instrumentation cannot prove this attempt
          // happened. This flag is read only by the acceptance runner; it never
          // publishes stylesheet state, host writes or application UI state.
          // The resource witness is intentional test instrumentation, not state
          // published to the rendered application.
          current.suspended = true
          throw current.promise
        }
        return null
      },
    [gate],
  )
  useScenario(
    'suspended variants cannot mutate the committed native host',
    finish,
    async (c) => {
      await c.geometry('committed small variant', () => host.current, {
        width: 80,
      })
      const original = host.current
      React.startTransition(() => setExpanded(true))
      await until('attempted suspended render', () => gate.suspended)
      await c.geometry(
        'pending render leaves native width unchanged',
        () => host.current,
        { width: 80 },
      )
      c.check(
        'pending render retains mounted host',
        host.current === original,
        true,
        'host.identity',
      )
      const current = gate
      current.open = true
      current.release()
      await c.geometry(
        'resolved transition commits large width',
        () => host.current,
        { width: 176 },
      )
      c.check(
        'resolved transition retains mounted host',
        host.current === original,
        true,
        'host.identity',
      )
    },
  )
  return (
    <React.Suspense fallback={<Text>Waiting for acceptance gate</Text>}>
      <Variants expanded={expanded}>
        <Variants.Root
          as={View}
          ref={host}
          collapsable={false}
          testID="acceptance-suspense"
        />
        <Wait blocked={expanded} />
      </Variants>
    </React.Suspense>
  )
}

const ownerWidth = system.stylesheet({
  Root: { $style: { width: 80 }, ':hover': { $style: { width: 128 } } },
})
const ownerHeight = system.stylesheet({
  Root: { $style: { height: 40 }, ':hover': { $style: { height: 72 } } },
})

function OwnershipScenario({ finish }: ScenarioProps) {
  // Part access creates a ref/handler bag. Keep the exact bags attached below;
  // reading `.Root` again would create fresh handlers with no committed host.
  const a = useStyles(ownerWidth).Root
  const b = useStyles(ownerHeight).Root
  const bindings = React.useRef({ a, b })
  React.useLayoutEffect(() => {
    bindings.current = { a, b }
  }, [a, b])
  const host = React.useRef<View>(null)
  const [both, setBoth] = React.useState(true)
  const props = both ? a.withProps(b) : b
  useScenario(
    'two controllers share a real native host and detach independently',
    finish,
    async (c) => {
      await c.geometry('both controllers resting', () => host.current, {
        width: 80,
        height: 40,
      })
      const original = host.current
      bindings.current.a.onHoverIn?.({})
      bindings.current.b.onHoverIn?.({})
      await c.geometry(
        'both controller patches reach native layout',
        () => host.current,
        { width: 128, height: 72 },
      )
      setBoth(false)
      await c.geometry(
        'remaining controller retains active height',
        () => host.current,
        { width: 280, height: 72 },
      )
      c.check(
        'detaching one owner retains native host',
        host.current === original,
        true,
        'host.identity',
      )
      bindings.current.b.onHoverOut?.({})
      await c.geometry(
        'remaining controller still updates',
        () => host.current,
        { width: 280, height: 40 },
      )
    },
  )
  return (
    <View style={{ width: 280 }}>
      <View
        {...(props.withProps({ ref: host }) as ViewProps)}
        collapsable={false}
        testID="acceptance-owners"
      />
    </View>
  )
}

const Appearance = createElements(
  system
    .stylesheet({
      Label: {
        $kind: 'text',
        $style: { width: 180, height: 32, color: '#113355', opacity: 1 },
      },
      Input: {
        $style: { width: 180, height: 40 },
        ':focus': { hint: 'active' },
      },
    })
    .variants(($: VariantSchema<{ loud: boolean }>) => ({
      [$.loud(true)]: { Label: { $style: { color: '#dd6600', opacity: 0.4 } } },
    })),
)

function AppearanceScenario({ finish }: ScenarioProps) {
  const label = React.useRef<Text>(null)
  const input = React.useRef<TextInput>(null)
  const caller = React.useRef<TextInput>(null)
  const [loud, setLoud] = React.useState(false)
  const [callerColor, setCallerColor] = React.useState('#225588')
  useScenario(
    'native text appearance and placeholder bridge reset',
    finish,
    async (c) => {
      await c.geometry('appearance target mounted', () => label.current, {
        width: 180,
      })
      await c.appearance(
        'native resting text color and alpha',
        () => label.current,
        { textColor: 0xff113355, alpha: 1 },
      )
      setLoud(true)
      await c.appearance(
        'native changed text color and alpha',
        () => label.current,
        { textColor: 0xffdd6600, alpha: 0.4 },
      )
      setLoud(false)
      await c.appearance(
        'native restored text color and alpha',
        () => label.current,
        { textColor: 0xff113355, alpha: 1 },
      )
      const original = await nativeSnapshot(
        required(input.current, 'placeholder input'),
      )
      c.check(
        'native reporter supplies actual hint color',
        typeof original.hintTextColor,
        'number',
        'native.snapshot',
      )
      const originalHint = original.hintTextColor
      if (typeof originalHint !== 'number')
        throw new Error('Native hint color was not reported')
      required(input.current, 'placeholder input').focus()
      await c.appearance(
        'native focus applies placeholder bridge',
        () => input.current,
        { focused: true, hintTextColor: 0xffdd4400 },
      )
      required(input.current, 'placeholder input').blur()
      await c.appearance(
        'removed bridge resets platform hint color',
        () => input.current,
        { focused: false, hintTextColor: originalHint },
      )
      required(caller.current, 'caller placeholder input').focus()
      await c.appearance(
        'caller-owned bridge prop wins while state is active',
        () => caller.current,
        { focused: true, hintTextColor: 0xff225588 },
      )
      setCallerColor('#338844')
      await c.appearance(
        'changed caller bridge prop wins without clearing native focus',
        () => caller.current,
        { focused: true, hintTextColor: 0xff338844 },
      )
      required(caller.current, 'caller placeholder input').blur()
      await c.appearance(
        'caller bridge baseline survives state removal',
        () => caller.current,
        { focused: false, hintTextColor: 0xff338844 },
      )
    },
  )
  return (
    <Appearance loud={loud}>
      <Appearance.Label as={Text} ref={label}>
        Native color and alpha
      </Appearance.Label>
      <Appearance.Input
        as={TextInput}
        ref={input}
        placeholder="Native placeholder reset"
        showSoftInputOnFocus={false}
      />
      <Appearance.Input
        as={TextInput}
        ref={caller}
        placeholder="Caller placeholder baseline"
        placeholderTextColor={callerColor}
        showSoftInputOnFocus={false}
      />
    </Appearance>
  )
}

const Touch = createElements(
  system.stylesheet({
    Root: {
      $kind: 'pressable',
      $style: {
        width: 120,
        height: 56,
        backgroundColor: '#224466',
        opacity: 1,
      },
      ':active': { $style: { width: 200, opacity: 0.4 } },
    },
  }),
)

function DeviceProbe({ report }: { report(result: AcceptanceResult): void }) {
  const host = React.useRef<View>(null)
  const capture = React.useCallback(
    async (phase: 'ready' | 'press-in' | 'press-out') => {
      const assertions: AcceptanceAssertion[] = []
      const expected = {
        width: phase === 'press-in' ? 200 : 120,
        alpha: phase === 'press-in' ? 0.4 : 1,
      }
      try {
        let actual: NativeSnapshot | undefined
        const deadline = Date.now() + 5000
        do {
          actual = await nativeSnapshot(required(host.current, 'touch probe'))
          if (matchesSnapshot(actual, expected)) break
          await delay(16)
        } while (Date.now() < deadline)
        assertions.push({
          name: `native ${phase} state`,
          expected,
          actual,
          source: 'native.snapshot',
        })
        if (!actual || !matchesSnapshot(actual, expected))
          throw new Error(
            `Touch ${phase} did not reach ${JSON.stringify(expected)}`,
          )
        const position = await measure(required(host.current, 'touch probe'))
        assertions.push({
          name: 'device touch target position',
          actual: position,
          expected: { width: expected.width, height: 56 },
          source: 'native.measure',
        })
        report({
          kind: 'device-probe',
          name: `native touch ${phase}`,
          status: 'pass',
          assertions,
        })
      } catch (error) {
        report({
          kind: 'device-probe',
          name: `native touch ${phase}`,
          status: 'fail',
          assertions,
          error: String(error),
        })
      }
    },
    [report],
  )
  React.useEffect(() => {
    void capture('ready')
  }, [capture])
  return (
    <View style={{ marginTop: 24 }}>
      <Text>Device probe: hold for at least 300ms, then release.</Text>
      <Touch.Root
        as={Pressable}
        ref={host}
        accessibilityLabel="fabric-touch-probe"
        testID="fabric-touch-probe"
        collapsable={false}
        onPressIn={() => {
          void capture('press-in')
        }}
        onPressOut={() => {
          void capture('press-out')
        }}
      >
        <Text style={{ color: 'white' }}>Hold to test native press</Text>
      </Touch.Root>
    </View>
  )
}

class ScenarioBoundary extends React.Component<
  { name: string; finish: ScenarioProps['finish']; children: React.ReactNode },
  { failed: boolean }
> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override componentDidCatch(error: Error) {
    this.props.finish({
      kind: 'scenario',
      name: this.props.name,
      status: 'fail',
      assertions: [],
      error: error.stack ?? error.message,
    })
  }
  override render() {
    return this.state.failed ? null : this.props.children
  }
}

const scenarios = [
  PrimitiveScenario,
  FocusScenario,
  AppearanceScenario,
  RefScenario,
  SuspenseScenario,
  OwnershipScenario,
  MotionScenario,
  AdaptiveScenario,
]

/** Mount once in a release-like Fabric app. Every scenario produces JSON data;
 * no socket, mocked host, test renderer or external service is used here. */
export function Harness({
  report,
}: {
  report(result: AcceptanceResult): void
}) {
  const [index, setIndex] = React.useState(0)
  const results = React.useRef<AcceptanceResult[]>([])
  const completed = React.useRef(false)
  const accepted = React.useRef(new Set<number>())
  const finish = React.useCallback(
    (result: AcceptanceResult) => {
      if (accepted.current.has(index)) return
      accepted.current.add(index)
      results.current.push(result)
      report(result)
      setIndex((value) => value + 1)
    },
    [index, report],
  )
  React.useEffect(() => {
    if (index < scenarios.length || completed.current) return
    completed.current = true
    report({
      kind: 'complete',
      name: 'android-fabric',
      status: results.current.every((result) => result.status === 'pass')
        ? 'pass'
        : 'fail',
      assertions: [],
      limitations: [
        'Pressable callback composition is exercised programmatically; touch dispatch requires device automation.',
        'Native text color, alpha and placeholder bridge props use Android reporter readback; background paint still needs screenshots.',
        'These scenarios do not certify native relationship topology, recycling lists, or native grid.',
      ],
    })
  }, [index, report])
  const Scenario = scenarios[index]
  return (
    <ConfigProvider config={config}>
      <View
        style={{
          flex: 1,
          padding: 16,
          backgroundColor: 'white',
          alignItems: 'flex-start',
        }}
      >
        <Text testID="acceptance-status">
          Toned Fabric:{' '}
          {index < scenarios.length
            ? `${index + 1}/${scenarios.length}`
            : 'complete'}
        </Text>
        {Scenario ? (
          <ScenarioBoundary key={index} name={Scenario.name} finish={finish}>
            <Scenario finish={finish} />
          </ScenarioBoundary>
        ) : (
          <View>
            <Text testID="acceptance-complete">
              {results.current.every((result) => result.status === 'pass')
                ? 'PASS'
                : 'FAIL'}
            </Text>
            <DeviceProbe report={report} />
          </View>
        )}
      </View>
    </ConfigProvider>
  )
}
